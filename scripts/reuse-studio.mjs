import {spawn} from 'node:child_process';
import {readFile,access} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const asset=html=>html.match(/src="([^"\s]+\.js)"/)?.[1];
const hash=data=>createHash('sha256').update(data).digest('hex');
export async function reuseStudio({directory=root,port,check=false,noOpen=false,request=fetch,open=url=>{if(process.platform==='win32'){const child=spawn('rundll32.exe',['url.dll,FileProtocolHandler',url],{stdio:'ignore',windowsHide:true});child.on('error',()=>console.log(`Open the studio: ${url}`));child.unref()}}}){
 const url=`http://127.0.0.1:${port}/`;
 try{
  const local=await readFile(path.join(directory,'dist/index.html'),'utf8'),localAsset=asset(local);
  if(!localAsset||!/^\/assets\/[a-zA-Z0-9_-]+\.js$/.test(localAsset))return false;
  const [page,health]=await Promise.all([request(url,{signal:AbortSignal.timeout(1500)}),request(url+'api/health',{signal:AbortSignal.timeout(1500)})]);
  if(!page.ok||!health.ok)return false;
  const html=await page.text(),status=await health.json();
  if(!html.includes('id="root"')||!html.includes('声屿 SONGYU')||asset(html)!==localAsset||typeof status.llm!=='boolean'||typeof status.ffmpeg!=='boolean')return false;
  const js=await request(new URL(localAsset,url),{signal:AbortSignal.timeout(3000)});
  if(!js.ok||hash(Buffer.from(await js.arrayBuffer()))!==hash(await readFile(path.join(directory,'dist',localAsset.slice(1)))))return false;
  if(!check&&!noOpen)open(url);
  return true;
 }catch{return false}
}
const entry=process.argv[1]&&path.resolve(process.argv[1]);
if(entry&&(process.platform==='win32'?entry.toLowerCase()===fileURLToPath(import.meta.url).toLowerCase():entry===fileURLToPath(import.meta.url))){
 try{
  try{await access(path.join(root,'.env'));process.loadEnvFile(path.join(root,'.env'))}catch{/* The original starter handles absent or invalid configuration. */}
  const port=Number(process.env.PORT||3001);
  const reused=Number.isInteger(port)&&port>0&&port<=65535&&await reuseStudio({port,check:process.argv.includes('--check'),noOpen:process.argv.includes('--no-open')});
  if(reused)console.log(`SONGYU is ready: http://127.0.0.1:${port}/ (reused current app; no process stopped)`);
  process.exitCode=reused?0:10;
 }catch{process.exitCode=10}
}
