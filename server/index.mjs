import express from 'express';
import {spawn} from 'node:child_process';
import {mkdtemp,writeFile,rm,access} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {z} from 'zod';
import {createPlanner} from './planner.mjs';
import {mountInstruments} from './instruments.mjs';
import {mountSinging} from './singing.mjs';
import {externalRoot,InstrumentRenderer,runProcess} from './instruments.mjs';
import {createConfigStore} from './admin-config.mjs';
import {mountAdmin,createJobs} from './admin.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const settings=await createConfigStore({directory:path.join(externalRoot,'runtime/config')});
const app=express();app.disable('x-powered-by');app.use(express.json({limit:'24mb'}));
const jobs=createJobs();app.use(jobs.middleware);
mountInstruments(app);
mountSinging(app);
let ffmpeg=process.env.FFMPEG_PATH||'ffmpeg';
function run(command,args,cwd,timeout=120000){return new Promise((resolve,reject)=>{const child=spawn(command,args,{cwd,windowsHide:true,stdio:['ignore','ignore','pipe']});let stderr='';const timer=setTimeout(()=>{child.kill();reject(Error('编码超时，请稍后重试'))},timeout);child.stderr.on('data',x=>{stderr=(stderr+x.toString()).slice(-4000)});child.on('error',e=>{clearTimeout(timer);reject(e)});child.on('close',code=>{clearTimeout(timer);if(code===0)resolve();else reject(Error(`编码进程失败 (${code})：${stderr.slice(-700)}`))})})}
let ffmpegReady=false;try{await run(ffmpeg,['-version'],root,5000);ffmpegReady=true}catch{/* optional service */}
let planner=createPlanner();
mountAdmin(app,{store:settings,jobs,root:externalRoot,publicDirectory:path.join(root,'server/public'),onConfig:async()=>{planner=createPlanner();ffmpeg=process.env.FFMPEG_PATH||'ffmpeg';try{await run(ffmpeg,['-version'],root,5000);ffmpegReady=true}catch{ffmpegReady=false}},diagnostics:async()=>{
 const instruments=await new InstrumentRenderer().status();
 const probe=async(command,args)=>{try{return {available:true,version:(await runProcess(command,args,externalRoot,10000)).split(/\r?\n/)[0]}}catch{return {available:false,message:'未安装、路径错误或运行失败'}}};
 const python=process.env.DIFFSINGER_PYTHON||path.join(externalRoot,'DiffSinger/.venv/Scripts/python.exe');
 const openutau=process.env.OPENUTAU_PATH||path.join(externalRoot,'OpenUtau/OpenUtau.exe');let openUtauInstalled=false;try{await access(openutau);openUtauInstalled=true}catch{}
 return {instruments,ffmpeg:await probe(ffmpeg,['-version']),python:await probe(python,['--version']),diffSingerDependencies:await probe(python,['-c','import torch,librosa,pyworld; print("PyTorch " + torch.__version__ + "; CUDA " + str(torch.cuda.is_available()))']),openUtau:{installed:openUtauInstalled,mode:'GUI 工程交换；未提供无界面 API'},gpu:await probe('nvidia-smi',['--query-gpu=name,memory.total,memory.used,driver_version','--format=csv,noheader'])};
}});
app.get('/api/health',(_req,res)=>res.json({ffmpeg:ffmpegReady,llm:!!process.env.LLM_API_KEY,llmStatus:planner.status(),vocal:'demo-vowel',images:'procedural'}));
app.post('/api/plan',(req,res)=>planner.handle(req,res));
const b64=z.string().regex(/^[A-Za-z0-9+/]+={0,2}$/);
const exportInput=z.object({wav:b64.max(16000000),scenes:z.array(z.object({png:b64.max(2500000),duration:z.number().min(.5).max(30)})).length(4),duration:z.number().min(15).max(35),lyrics:z.array(z.object({text:z.string().max(100),start:z.number().min(0).max(35),end:z.number().min(0).max(35)})).max(32),style:z.enum(['cinema','poster','minimal']),title:z.string().max(200)});
function assTime(t){const cent=Math.round(t*100);return `${Math.floor(cent/360000)}:${String(Math.floor(cent/6000)%60).padStart(2,'0')}:${String(Math.floor(cent/100)%60).padStart(2,'0')}.${String(cent%100).padStart(2,'0')}`}
// ASS control characters are replaced, never interpreted as formatting or filter syntax.
function assText(s){return s.replace(/[{}\\\r\n]/g,' ').trim()}
export function subtitles(data){const alignment=data.style==='poster'?5:2,margin=data.style==='minimal'?74:data.style==='poster'?0:138,size=data.style==='poster'?50:data.style==='minimal'?33:42;
 let text=`[Script Info]\nScriptType: v4.00+\nPlayResX: 1280\nPlayResY: 720\nWrapStyle: 0\nScaledBorderAndShadow: yes\n\n[V4+ Styles]\nFormat: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding\nStyle: Main,Microsoft YaHei,${size},&H00F2FDFF,&H00FFFFFF,&H604B351C,&H60183144,-1,0,0,0,100,100,1,0,1,1,1,${alignment},70,70,${margin},1\nStyle: Brand,Microsoft YaHei,15,&H00F2FDFF,&H00FFFFFF,&H604B351C,&H00000000,0,0,0,0,100,100,1,0,1,0,0,7,58,58,50,1\nStyle: Notice,Microsoft YaHei,14,&H00F2FDFF,&H00FFFFFF,&H604B351C,&H00000000,0,0,0,0,100,100,1,0,1,1,0,2,58,58,38,1\n\n[Events]\nFormat: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text\n`;
 const event=(start,end,style,words)=>{text+=`Dialogue: 0,${assTime(start)},${assTime(end)},${style},,0,0,0,,${assText(words)}\n`};
 const sorted=[...data.lyrics].sort((a,b)=>a.start-b.start);let cursor=0;for(const l of sorted){if(l.start>cursor)event(cursor,l.start,'Main',cursor===0?data.title:'让这段旋律，留在你的小岛。');event(l.start,l.end,'Main',l.text);cursor=l.end}if(cursor<data.duration)event(cursor,data.duration,'Main','让这段旋律，留在你的小岛。');event(0,data.duration,'Brand','SONGYU / ORIGINAL SESSION');event(0,data.duration,'Notice','声屿 · 元音人声演示 / 程序化画面');return text;}
let exporting=false;
app.post('/api/export',async(req,res)=>{if(!ffmpegReady)return res.status(503).json({error:'未检测到 FFmpeg，请配置 FFMPEG_PATH 后重启服务'});if(exporting)return res.status(429).json({error:'当前已有一个视频在编码，请稍后重试'});const parsed=exportInput.safeParse(req.body);if(!parsed.success)return res.status(400).json({error:'视频参数无效'});const data=parsed.data;
 if(Math.abs(data.scenes.reduce((v,s)=>v+s.duration,0)-data.duration)>.02||data.lyrics.some(l=>l.end<=l.start||l.end>data.duration)||data.lyrics.some((l,i)=>i>0&&l.start<data.lyrics[i-1].end))return res.status(400).json({error:'歌词或画面时间轴不匹配'});
 const wav=Buffer.from(data.wav,'base64');if(wav.subarray(0,4).toString()!=='RIFF'||wav.subarray(8,12).toString()!=='WAVE')return res.status(400).json({error:'需要 PCM WAV 音频'});
 let directory;exporting=true;try{directory=await mkdtemp(path.join(tmpdir(),'songyu-'));await writeFile(path.join(directory,'mix.wav'),wav);await writeFile(path.join(directory,'subtitles.ass'),subtitles(data),'utf8');
 const args=['-hide_banner','-loglevel','error','-y'];for(let i=0;i<data.scenes.length;i++){const scene=data.scenes[i],png=Buffer.from(scene.png,'base64');if(png.subarray(0,8).toString('hex')!=='89504e470d0a1a0a')throw Error('画面不是有效 PNG');await writeFile(path.join(directory,`scene${i}.png`),png);args.push('-loop','1','-framerate','24','-t',String(scene.duration),'-i',`scene${i}.png`)}args.push('-i','mix.wav');
 const filters=data.scenes.map((_,i)=>`[${i}:v]scale=1280:720,zoompan=z='min(1+on*0.00016,1.07)':x='iw/2-iw/zoom/2':y='ih/2-ih/zoom/2':d=1:s=1280x720:fps=24,setsar=1,setpts=PTS-STARTPTS[v${i}]`);filters.push('[v0][v1][v2][v3]concat=n=4:v=1:a=0,ass=subtitles.ass,format=yuv420p[out]');args.push('-filter_complex',filters.join(';'),'-map','[out]','-map','4:a','-t',String(data.duration),'-c:v','libx264','-preset','veryfast','-crf','22','-c:a','aac','-b:a','160k','-movflags','+faststart','output.mp4');await run(ffmpeg,args,directory);
 res.download(path.join(directory,'output.mp4'),'songyu-pv.mp4',async error=>{await rm(directory,{recursive:true,force:true});exporting=false;if(error&&!res.headersSent)res.status(500).end()});
 }catch(e){console.error('PV export failed:',e.message);if(directory)await rm(directory,{recursive:true,force:true});exporting=false;if(!res.headersSent)res.status(500).json({error:'FFmpeg 编码失败，请检查服务日志、字体与磁盘空间。'})}});
try{await access(path.join(root,'dist','index.html'));app.use(express.static(path.join(root,'dist')));app.get('/{*path}',(_req,res)=>res.sendFile(path.join(root,'dist','index.html')))}catch{/* Vite serves source during development */}
app.use((err,_req,res,_next)=>{if(!res.headersSent)res.status(err.status||500).json({error:err.status===413?'请求过大，最大 24 MB':'请求无效或服务异常'})});
const port=Number(process.env.PORT||3001);app.listen(port,'127.0.0.1',()=>console.log(`SONGYU API http://127.0.0.1:${port} · FFmpeg ${ffmpegReady?'ready':'unavailable'} · LLM ${process.env.LLM_API_KEY?'configured':'local-only'}`));
