import {measureLoudness,normalizationFilter,loudnessTarget} from './loudness.mjs';
import {spawn} from 'node:child_process';
import {mkdtemp,writeFile,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
function run(command,args,cwd,timeout=120000){return new Promise((resolve,reject)=>{const child=spawn(command,args,{cwd,windowsHide:true,stdio:['ignore','ignore','pipe']});let stderr='';const timer=setTimeout(()=>{child.kill();reject(Error('编码超时，请稍后重试'))},timeout);child.stderr.on('data',x=>{stderr=(stderr+x.toString()).slice(-4000)});child.on('error',e=>{clearTimeout(timer);reject(e)});child.on('close',code=>{clearTimeout(timer);if(code===0)resolve();else reject(Error(`编码进程失败 (${code})：${stderr.slice(-700)}`))})})}
function assTime(t){const cent=Math.round(t*100);return `${Math.floor(cent/360000)}:${String(Math.floor(cent/6000)%60).padStart(2,'0')}:${String(Math.floor(cent/100)%60).padStart(2,'0')}.${String(cent%100).padStart(2,'0')}`}
// ASS control characters are replaced, never interpreted as formatting or filter syntax.
function assText(s){return s.replace(/[{}\\\r\n]/g,' ').trim()}
export function subtitles(data){const alignment=data.style==='poster'?5:2,margin=data.style==='minimal'?74:data.style==='poster'?0:138,size=data.style==='poster'?50:data.style==='minimal'?33:42;
 let text=`[Script Info]\nScriptType: v4.00+\nPlayResX: 1280\nPlayResY: 720\nWrapStyle: 0\nScaledBorderAndShadow: yes\n\n[V4+ Styles]\nFormat: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding\nStyle: Main,Microsoft YaHei,${size},&H00F2FDFF,&H00FFFFFF,&H604B351C,&H60183144,-1,0,0,0,100,100,1,0,1,1,1,${alignment},70,70,${margin},1\nStyle: Brand,Microsoft YaHei,15,&H00F2FDFF,&H00FFFFFF,&H604B351C,&H00000000,0,0,0,0,100,100,1,0,1,0,0,7,58,58,50,1\nStyle: Notice,Microsoft YaHei,14,&H00F2FDFF,&H00FFFFFF,&H604B351C,&H00000000,0,0,0,0,100,100,1,0,1,1,0,2,58,58,38,1\n\n[Events]\nFormat: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text\n`;
 const event=(start,end,style,words)=>{text+=`Dialogue: 0,${assTime(start)},${assTime(end)},${style},,0,0,0,,${assText(words)}\n`};
 const sorted=[...data.lyrics].sort((a,b)=>a.start-b.start);let cursor=0;for(const l of sorted){if(l.start>cursor)event(cursor,l.start,'Main',cursor===0?data.title:'让这段旋律，留在你的小岛。');event(l.start,l.end,'Main',l.text);cursor=l.end}if(cursor<data.duration)event(cursor,data.duration,'Main','让这段旋律，留在你的小岛。');event(0,data.duration,'Brand','CantaLoom / ORIGINAL SESSION');event(0,data.duration,'Notice',data.singingCredit==='qixuan'?'AI 合成内容 · 歌声合成：绮萱 · 合成技术：DiffSinger':data.singingCredit==='external'?'外部歌声 / 程序化画面':'织声机 · 元音人声演示 / 程序化画面');return text;}
export async function createVideoService(root){
 let ffmpeg,ready=false;
 async function refresh(){ffmpeg=process.env.FFMPEG_PATH||'ffmpeg';try{await run(ffmpeg,['-version'],root,5000);ready=true}catch{ready=false}}
 await refresh();
 return {get ready(){return ready},get binary(){return ffmpeg},refresh,async preview(mp4){
  if(!ready||mp4.length>12000000||mp4.subarray(4,8).toString()!=='ftyp')throw Error('预览输入无效');
  const directory=await mkdtemp(path.join(tmpdir(),'songyu-preview-'));
  try{await writeFile(path.join(directory,'input.mp4'),mp4);await run(ffmpeg,['-hide_banner','-loglevel','error','-y','-protocol_whitelist','file,pipe','-i','input.mp4','-t','35','-map','0:v:0','-map','0:a:0?','-vf','scale=960:-2','-c:v','libvpx-vp9','-deadline','realtime','-cpu-used','6','-crf','34','-b:v','0','-pix_fmt','yuv420p','-c:a','libopus','-b:a','96k','preview.webm'],directory);return await readFile(path.join(directory,'preview.webm'))}finally{await rm(directory,{recursive:true,force:true})}
 },async render(data){
  const directory=await mkdtemp(path.join(tmpdir(),'songyu-'));
  try{await writeFile(path.join(directory,'mix.wav'),Buffer.from(data.wav,'base64'));await writeFile(path.join(directory,'subtitles.ass'),subtitles(data),'utf8');
 const args=['-hide_banner','-loglevel','error','-y'];for(let i=0;i<data.scenes.length;i++){const scene=data.scenes[i],png=Buffer.from(scene.png,'base64');if(png.subarray(0,8).toString('hex')!=='89504e470d0a1a0a')throw Error('画面不是有效 PNG');await writeFile(path.join(directory,`scene${i}.png`),png);args.push('-loop','1','-framerate','24','-t',String(scene.duration),'-i',`scene${i}.png`)}args.push('-i','mix.wav');
 const inputLoudness=await measureLoudness(ffmpeg,'mix.wav',directory);
 const filters=data.scenes.map((_,i)=>`[${i}:v]scale=1280:720,zoompan=z='min(1+on*0.00016,1.07)':x='iw/2-iw/zoom/2':y='ih/2-ih/zoom/2':d=1:s=1280x720:fps=24,setsar=1,setpts=PTS-STARTPTS[v${i}]`);filters.push('[v0][v1][v2][v3]concat=n=4:v=1:a=0,ass=subtitles.ass,format=yuv420p[out]');args.push('-filter_complex',filters.join(';'),'-map','[out]','-map','4:a','-t',String(data.duration),'-c:v','libx264','-preset','veryfast','-crf','22','-af',normalizationFilter,'-ar','48000','-c:a','aac','-b:a','192k','-movflags','+faststart','output.mp4');await run(ffmpeg,args,directory);
 const outputLoudness=await measureLoudness(ffmpeg,'output.mp4',directory);
 return {directory,file:path.join(directory,'output.mp4'),loudness:{input:inputLoudness,output:outputLoudness,target:loudnessTarget}};
  }catch(e){await rm(directory,{recursive:true,force:true});throw e}
 }};
}
