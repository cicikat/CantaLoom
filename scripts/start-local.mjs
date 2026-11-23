import {spawn} from 'node:child_process';
import {restartExistingStudio} from './restart-studio.mjs';
import {openWhenReady} from './open-studio.mjs';
import {superviseStudio,stopSupervisedStudio} from './supervise-studio.mjs';
import {frontendFingerprint,outputFingerprint} from './launcher-build-cache.mjs';
import {existsSync,readFileSync,writeFileSync,mkdirSync} from 'node:fs';
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
  probe.once('error',reject);
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
 try{await ensurePortFree(port)}catch(error){
  if(error.code!=='EADDRINUSE')throw error;
  if(!process.argv.includes('--restart'))throw Error(`Port ${port} is occupied. No process was stopped.`);
  const externalRoot=path.resolve(process.env.SONGYU_EXTERNAL_ROOT||'D:/ai/hacson/external');
  if(await stopSupervisedStudio(root,port)||await restartExistingStudio({port,directory:root,externalRoot}))console.log(`Stopped the verified old CantaLoom service on port ${port}.`);
  await ensurePortFree(port);
 }
 const manifest=JSON.parse(readFileSync('package.json','utf8'));
 const missing=Object.keys({...manifest.dependencies,...manifest.devDependencies}).some(name=>!existsSync(path.join(root,'node_modules',name,'package.json')));
 if(missing){console.log('[1/3] Installing dependencies from package-lock.json...');await runNpm(['ci','--include=dev']);}
 else console.log('[1/3] Dependencies found.');
 const stamp='node_modules/.cache/cantaloom-launch-build.json';
 const input=frontendFingerprint();
 let previous;
 try{previous=JSON.parse(readFileSync(stamp,'utf8'))}catch{/* First run or incomplete stamp. */}
 if(missing||previous?.input!==input||previous.output!==outputFingerprint()){
  console.log('[2/3] Building the latest source...');
  await runNpm(['run','build']);
  mkdirSync(path.dirname(stamp),{recursive:true});
  writeFileSync(stamp,JSON.stringify({input,output:outputFingerprint()}));
 }else console.log('[2/3] Built assets are current.');
 console.log('[3/3] Starting the studio...');
 const child=spawn(process.execPath,['--env-file-if-exists=.env',path.join(root,'server/index.mjs')],{
  cwd:root,stdio:'inherit',windowsHide:true,
  env:{...process.env,NODE_COMPILE_CACHE:process.env.NODE_COMPILE_CACHE||path.join(root,'node_modules/.cache/node-compile')},
 });
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
 let finishNavigation;
 try{
  if(!noOpen&&process.platform==='win32'){
   finishNavigation=await openWhenReady(process.argv.includes('--admin')?url+'admin':url);
  }
  let health;const deadline=Date.now()+20000;
  while(Date.now()<deadline&&!exited){
   try{const response=await fetch(`${url}api/health`,{signal:AbortSignal.timeout(800)});if(response.ok){health=await response.json();break}}catch{/* Wait for this owned child to become ready. */}
   await delay(40);
  }
  if(!health||exited)throw Error(spawnError?'Node server could not start.':'The server did not become ready. Check the log and port above.');
  const page=await fetch(url,{signal:AbortSignal.timeout(3000)}),html=await page.text();
  if(!page.ok||!html.includes('id="root"'))throw Error('The built page could not be loaded.');
  const asset=html.match(/src="([^"]+\.js)"/)?.[1];
  if(!asset||!(await fetch(new URL(asset,url),{signal:AbortSignal.timeout(3000)})).ok)throw Error('The built JavaScript asset could not be loaded.');
  if(process.argv.includes('--admin')){
   const admin=await fetch(url+'admin',{signal:AbortSignal.timeout(3000)});
   if(!admin.ok||!(await admin.text()).includes('/admin-assets/admin.js'))throw Error('The admin page could not be loaded.');
  }
  if(!check)await superviseStudio(root,port,child,ended,onSignal);
  console.log(`\nCantaLoom is ready: ${url}`);
  console.log(`FFmpeg: ${health.ffmpeg?'ready':'unavailable (WAV and local creation still work)'}. LLM: ${health.llmStatus||'unverified'}.`);
  if(check){console.log('Startup check passed: built page, JavaScript asset and API respond successfully.');return;}
  finishNavigation?.(true);
  finishNavigation=undefined;
  console.log('Keep this window open. Press Ctrl+C to stop the studio.');
  const code=await ended;
  if(code!==0&&!stopping)throw Error(`The server stopped (${code}).`);
 }finally{
  finishNavigation?.(false);
  stop();await ended;
  process.removeListener('SIGINT',onSignal);process.removeListener('SIGTERM',onSignal);
 }
}

main().catch(error=>{console.error(`\n[ERROR] ${error.message}`);process.exitCode=1;});
