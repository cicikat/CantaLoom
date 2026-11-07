import {rm} from 'node:fs/promises';
import {exportInput} from '../../shared/contracts/index.mjs';
export function mountExport(app,video){
 let exporting=false;
 app.post('/api/export',async(req,res)=>{
  if(!video.ready)return res.status(503).json({error:'未检测到 FFmpeg，请配置 FFMPEG_PATH 后重启服务'});
  if(exporting)return res.status(429).json({error:'当前已有一个视频在编码，请稍后重试'});
  const parsed=exportInput.safeParse(req.body);if(!parsed.success)return res.status(400).json({error:'视频参数无效'});const data=parsed.data;
  if(Math.abs(data.scenes.reduce((v,s)=>v+s.duration,0)-data.duration)>.02||data.lyrics.some(l=>l.end<=l.start||l.end>data.duration)||data.lyrics.some((l,i)=>i>0&&l.start<data.lyrics[i-1].end))return res.status(400).json({error:'歌词或画面时间轴不匹配'});
  const wav=Buffer.from(data.wav,'base64');if(wav.subarray(0,4).toString()!=='RIFF'||wav.subarray(8,12).toString()!=='WAVE')return res.status(400).json({error:'需要 PCM WAV 音频'});
  exporting=true;let directory;
  try{const result=await video.render(data);directory=result.directory;if(result.loudness)res.set('X-Songyu-Loudness',JSON.stringify(result.loudness));res.download(result.file,'songyu-pv.mp4',async error=>{await rm(directory,{recursive:true,force:true});exporting=false;if(error&&!res.headersSent)res.status(500).end()})}
  catch(e){console.error('PV export failed:',e.message);if(directory)await rm(directory,{recursive:true,force:true});exporting=false;if(!res.headersSent)res.status(500).json({error:'FFmpeg 编码失败，请检查服务日志、字体与磁盘空间。'})}
 });
}
