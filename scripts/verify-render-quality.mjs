// Real backend + browser mix smoke test. Does not drive or modify the frontend UI.
import {spawn} from 'node:child_process';
import {chromium} from '@playwright/test';
import {mkdir,writeFile} from 'node:fs/promises';
const api=3199,front=5199,children=[];
const freeMode=process.argv.includes('--free');
const output=freeMode?'temp/task20':'temp/task19';
let browser;
const start=(file,args,env)=>{const child=spawn(process.execPath,[file,...args],{env:{...process.env,...env},windowsHide:true,stdio:'ignore'});children.push(child)};
async function ready(url){for(let i=0;i<100;i++){try{if((await fetch(url)).ok)return}catch{}await new Promise(r=>setTimeout(r,200))}throw Error(`Service unavailable: ${url}`)}
try{
 start('server/index.mjs',[],{PORT:String(api)});
 start('node_modules/vite/bin/vite.js',['--host','127.0.0.1','--port',String(front),'--strictPort'],{VITE_API_MODE:'real',VITE_API_PROXY_TARGET:`http://127.0.0.1:${api}`});
 await Promise.all([ready(`http://127.0.0.1:${api}/api/health`),ready(`http://127.0.0.1:${front}`)]);
 browser=await chromium.launch({headless:true});const page=await browser.newPage();await page.goto(`http://127.0.0.1:${front}`);
 const result=await page.evaluate(async(freeMode)=>{
  const {createProject}=await import('/src/composer.ts');const {renderAudio,wavBlob}=await import('/src/audio.ts');
  const p=createProject();
  if(freeMode){const {localSongPlan}=await import('/src/song-plan.ts');const {freeArrangement}=await import('/shared/free-score.mjs');p.mode='free';p.songPlan=localSongPlan('向前奔跑','橘子摇滚');for(const track of p.tracks.filter(t=>t.kind!=='vocal'))track.notes=freeArrangement(p,track,()=>crypto.randomUUID())}
  p.instrumentMode='fluidsynth';const mix=await renderAudio(p),blob=wavBlob(mix.buffer);
  let energy=0;for(const v of mix.buffer.getChannelData(0))energy+=v*v;
  if(energy<1)throw Error('Silent browser mix');
  const b64=async blob=>{const bytes=new Uint8Array(await blob.arrayBuffer());let s='';for(let i=0;i<bytes.length;i+=8192)s+=String.fromCharCode(...bytes.subarray(i,i+8192));return btoa(s)};
  const canvas=document.createElement('canvas');canvas.width=1280;canvas.height=720;canvas.getContext('2d').fillRect(0,0,1280,720);
  const response=await fetch('/api/export',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({wav:await b64(blob),scenes:Array.from({length:4},()=>({png:canvas.toDataURL().split(',')[1],duration:mix.buffer.duration/4})),duration:mix.buffer.duration,lyrics:[],style:'minimal',title:'48kHz real browser mix',singingCredit:'demo'})});
  if(!response.ok)throw Error('MP4 export failed: '+response.status);
  return {mixSampleRate:mix.buffer.sampleRate,rms:Math.sqrt(energy/mix.buffer.length),wav:await b64(blob),mp4:await b64(await response.blob()),loudness:JSON.parse(response.headers.get('X-Songyu-Loudness'))};
 },freeMode);
 await mkdir(output,{recursive:true});
 for(const type of ['wav','mp4']){await writeFile(`${output}/browser-mix.${type}`,Buffer.from(result[type],'base64'));delete result[type]}
 await writeFile(`${output}/browser-report.json`,JSON.stringify(result,null,2));console.log(JSON.stringify(result));
}finally{await browser?.close();for(const child of children)child.kill()}
