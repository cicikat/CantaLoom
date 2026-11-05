import {chromium} from '@playwright/test';
import {readFile,writeFile} from 'node:fs/promises';
const out='D:/ai/hacson/external/runtime/exports/v03-dynamic';
const browser=await chromium.launch({headless:true});
try{const page=await browser.newPage({acceptDownloads:true}),reports=[];await page.goto(process.env.V03_FRONTEND_URL||'http://127.0.0.1:5186');
 for(const label of ['A','B','C']){
  const p=JSON.parse(await readFile(`${out}/${label}-project.json`,'utf8'));
  await page.evaluate(p=>localStorage.setItem('songyu-project-v1',JSON.stringify(p)),p);await page.reload();
  const result=await page.evaluate(async()=>{const {renderAudio,wavBlob}=await import('/src/audio.ts');const p=JSON.parse(localStorage.getItem('songyu-project-v1'));const {buffer}=await renderAudio(p);const bytes=new Uint8Array(await wavBlob(buffer).arrayBuffer());let s='';for(let i=0;i<bytes.length;i+=8192)s+=String.fromCharCode(...bytes.subarray(i,i+8192));return {seconds:buffer.duration,rms:Math.sqrt(buffer.getChannelData(0).reduce((s,x)=>s+x*x,0)/buffer.length),wav:btoa(s)}});
  if(result.rms<.001)throw Error('Silent mix');await writeFile(`${out}/${label}-mix.wav`,Buffer.from(result.wav,'base64'));
  await page.getByRole('navigation').getByRole('button',{name:/歌词 PV/}).click();const event=page.waitForEvent('download',{timeout:180000});await page.getByRole('button',{name:'导出 MP4',exact:true}).click();await (await event).saveAs(`${out}/${label}-pv.mp4`);
  reports.push({label,seconds:result.seconds,rms:result.rms});console.log(reports.at(-1));
 }
 await writeFile(`${out}/exports.json`,JSON.stringify(reports,null,2));
}finally{await browser.close()}
