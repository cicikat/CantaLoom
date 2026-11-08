import {pvFingerprint} from '../../shared/contracts/pv.mjs';
import {pvRenderStatus} from '../services/pv-render.mjs';
import {rm} from 'node:fs/promises';
import path from 'node:path';
import {tmpdir} from 'node:os';
import {exportInput} from '../../shared/contracts/index.mjs';
export function mountExport(app,video){
 let exporting=false;
 app.post('/api/export',async(req,res)=>{
  if(!video.ready)return res.status(503).json({error:'未检测到 FFmpeg，请配置 FFMPEG_PATH 后重启服务'});
  if(exporting)return res.status(429).json({error:'当前已有一个视频在编码，请稍后重试'});
  const parsed=exportInput.safeParse(req.body);if(!parsed.success)return res.status(400).json({error:'视频参数无效'});const data=parsed.data;
  if((data.visualMode!=='html'&&Math.abs(data.scenes.reduce((v,s)=>v+s.duration,0)-data.duration)>.02)||data.lyrics.some(l=>l.end<=l.start||l.end>data.duration)||data.lyrics.some((l,i)=>i>0&&l.start<data.lyrics[i-1].end))return res.status(400).json({error:'歌词或画面时间轴不匹配'});
  const wav=Buffer.from(data.wav,'base64');if(wav.subarray(0,4).toString()!=='RIFF'||wav.subarray(8,12).toString()!=='WAVE')return res.status(400).json({error:'需要 PCM WAV 音频'});
  // Reserve before asynchronous fingerprint/resource checks, including simultaneous HTML requests.
  exporting=true;let directory;
  try{
   if(data.visualMode==='html'){
    if(data.inputFingerprint!==await pvFingerprint(data.pvProject))return res.status(400).json({code:'PV_STALE_DESIGN',error:'PV 设计快照已失效'});
    if(!(await pvRenderStatus()).available)return res.status(503).json({code:'PV_CHROMIUM_UNAVAILABLE',error:'HTML PV 需要可用 Chromium；原 Canvas 导出仍可使用'});
   }
   const result=await video.render(data);directory=result.directory;if(result.loudness)res.set('X-Songyu-Loudness',JSON.stringify(result.loudness));
   await new Promise(resolve=>res.download(result.file,'cantaloom-pv.mp4',error=>{if(error&&!res.headersSent)res.status(500).end();resolve()}));
  }catch(error){console.error('PV export failed');if(!res.headersSent){const unavailable=error.code==='PV_CHROMIUM_UNAVAILABLE';res.status(unavailable?503:500).json({...(unavailable?{code:'PV_CHROMIUM_UNAVAILABLE'}:{}),error:unavailable?'HTML PV 的 Chromium 无法启动；原 Canvas 导出仍可使用':'PV 编码失败，请检查资源、字体与磁盘空间。'})}}
  finally{try{if(directory){const target=path.resolve(directory);if(path.dirname(target)!==path.resolve(tmpdir())||!path.basename(target).startsWith('songyu-'))throw Error('Unexpected export cleanup path');await rm(target,{recursive:true,force:true})}}finally{exporting=false}}
 });
}
