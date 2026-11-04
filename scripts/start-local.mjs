import {spawn} from 'node:child_process';
import {existsSync,readFileSync} from 'node:fs';
import {createServer} from 'node:net';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {setTimeout as delay} from 'node:timers/promises';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const check=process.argv.includes('--check');
const noOpen=check||process.argv.includes('--no-open');

function runNpm(args){
 return new Promise((resolve,reject)=>{
  // Only fixed npm commands are passed through the Windows .cmd interpreter.
  const child=spawn(process.platform==='win32'?'npm.cmd':'npm',args,{cwd:root,stdio:'inherit',windowsHide:true,shell:process.platform==='win32'});
  child.once('error',()=>reject(Error('npm is unavailable. Install Node.js with npm, then retry.')));
  child.once('exit',code=>code===0?resolve():reject(Error(`npm ${args.join(' ')} failed (${code}). See the output above.`)));
 });
}

async function ensurePortFree(port){
 const probe=createServer();
 await new Promise((resolve,reject)=>{
  probe.once('error',()=>reject(Error(`Port ${port} is occupied. Close the existing studio or choose another PORT in .env. No existing process was stopped.`)));
  probe.listen({host:'127.0.0.1',port,exclusive:true},()=>probe.close(resolve));
 });
}

async function main(){
 const [major,minor]=process.versions.node.split('.').map(Number);
 if(major<22||major===22&&minor<12)throw Error(`Node.js 22.12+ is required (found ${process.versions.node}).`);
 process.chdir(root);
 if(existsSync('.env'))process.loadEnvFile(path.join(root,'.env'));
 const port=Number(process.env.PORT||3001);
 if(!Number.isInteger(port)||port<1||port>65535)throw Error('PORT must be an integer from 1 to 65535. Check .env.');
 await ensurePortFree(port);
 const manifest=JSON.parse(readFileSync('package.json','utf8'));
 const missing=Object.keys({...manifest.dependencies,...manifest.devDependencies}).some(name=>!existsSync(path.join(root,'node_modules',name,'package.json')));
 if(missing){console.log('[1/3] Installing dependencies from package-lock.json...');await runNpm(['ci','--include=dev']);}
 else console.log('[1/3] Dependencies found.');
 console.log('[2/3] Building the latest source...');
 await runNpm(['run','build']);
 console.log('[3/3] Starting the studio...');
 const child=spawn(process.execPath,['--env-file-if-exists=.env','server/index.mjs'],{cwd:root,stdio:'inherit',windowsHide:true});
 let exited=false,spawnError;
 const ended=new Promise(resolve=>{
  child.once('error',e=>{spawnError=e;exited=true;resolve(1)});
  child.once('exit',code=>{exited=true;resolve(code??1)});
 });
 let stopping=false;
 const stop=()=>{if(!exited)child.kill()};
 const onSignal=()=>{stopping=true;stop()};
 process.once('SIGINT',onSignal);process.once('SIGTERM',onSignal);
 const url=`http://127.0.0.1:${port}/`;
 try{
  let health;const deadline=Date.now()+20000;
  while(Date.now()<deadline&&!exited){
   try{const response=await fetch(`${url}api/health`,{signal:AbortSignal.timeout(800)});if(response.ok){health=await response.json();break}}catch{/* Wait for this owned child to become ready. */}
   await delay(250);
  }
  if(!health||exited)throw Error(spawnError?'Node server could not start.':'The server did not become ready. Check the log and port above.');
  const page=await fetch(url,{signal:AbortSignal.timeout(3000)}),html=await page.text();
  if(!page.ok||!html.includes('id="root"'))throw Error('The built page could not be loaded.');
  const asset=html.match(/src="([^"]+\.js)"/)?.[1];
  if(!asset||!(await fetch(new URL(asset,url),{signal:AbortSignal.timeout(3000)})).ok)throw Error('The built JavaScript asset could not be loaded.');
  console.log(`\nSONGYU is ready: ${url}`);
  console.log(`FFmpeg: ${health.ffmpeg?'ready':'unavailable (WAV and local creation still work)'}. LLM: ${health.llmStatus||'unverified'}.`);
  if(check){console.log('Startup check passed: built page, JavaScript asset and API respond successfully.');return;}
  if(!noOpen&&process.platform==='win32'){
   const browser=spawn('rundll32.exe',['url.dll,FileProtocolHandler',url],{stdio:'ignore',windowsHide:true});
   browser.once('error',()=>console.log(`Open this address in your browser: ${url}`));
  }
  console.log('Keep this window open. Press Ctrl+C to stop the studio.');
  const code=await ended;
  if(code!==0&&!stopping)throw Error(`The server stopped (${code}).`);
 }finally{
  stop();await ended;
  process.removeListener('SIGINT',onSignal);process.removeListener('SIGTERM',onSignal);
 }
}

main().catch(error=>{console.error(`\n[ERROR] ${error.message}`);process.exitCode=1;});
