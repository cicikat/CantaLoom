// Explicit resource acceptance. Does not change saved routes or the product UI.
import {mkdir,writeFile,readFile,copyFile,rm} from 'node:fs/promises';
import path from 'node:path';
import {createConfigStore} from '../server/admin-config.mjs';
import {externalRoot} from '../server/services/instruments.mjs';
import {resolveRoute} from '../server/services/llm-router.mjs';
import {createPvPlanner} from '../server/services/pv.mjs';
import {createProject,lyricNotes,syncVocal} from '../src/composer.ts';
const output=path.resolve('temp/task35');await mkdir(output,{recursive:true});
if(process.argv.includes('--plan')){
 if(process.env.SONGYU_PV_REAL!=='1')throw Error('Set SONGYU_PV_REAL=1 for explicit paid-provider acceptance');
 const env={...process.env};await createConfigStore({directory:path.join(externalRoot,'runtime/config'),env});
 const existing=JSON.parse(env.LLM_ROUTES||'{}'),route=existing.pv_design||resolveRoute(env,'lyrics_planning');env.LLM_ROUTES=JSON.stringify({...existing,pv_design:route});
 const variants=[{name:'paper-lantern',bpm:96,style:'海盐汽水',title:'黎明前的纸灯',idea:'安静的电子民谣，纸灯穿过薄雾，几何细线缓慢呼吸',words:['纸灯浮过寂静水湾','晨风停在旧桥栏杆','我把微光折进掌心','等第一朵云醒来']},{name:'magnet-storm',bpm:132,style:'橘子摇滚',title:'磁暴后的奔跑',idea:'高速摇滚，锐利三角和粗大字形，炽热撞色，节拍切开城市',words:['鞋底敲响钢铁街道','心跳撞开沉睡高塔','逆风把名字举过头顶','我们追着闪电出发']}];
 for(const v of variants){const score=createProject(v.bpm,v.style,v.idea);score.metadata.title=v.title;score.lyrics.forEach((l,i)=>{l.text=v.words[i];l.source='manual';l.notes=lyricNotes(l,score.vocalPreset,l.version,score)});for(const s of score.sections)syncVocal(score,s.id);
  const project={id:score.id,title:v.title,idea:v.idea,mood:v.style,bpm:score.bpm,sections:score.sections.map((s,i)=>({id:s.id,start:s.start,beats:s.beats,energy:v.name==='magnet-storm'?.9:[.3,.5,.7,.3][i]})),lyrics:score.lyrics.map(l=>({id:l.id,text:l.text,start:l.start,end:l.end})),pulses:score.tracks.filter(t=>t.kind==='drums').flatMap(t=>t.notes.filter(n=>n.sound==='kick').map(n=>({beat:n.beat,strength:n.velocity}))).slice(0,96)};
  console.log('Planning '+v.name+' with '+route.model);const result=await createPvPlanner({env}).design({project});await writeFile(path.join(output,v.name+'.json'),JSON.stringify({score,project,result},null,2));console.log(JSON.stringify({name:v.name,trace:result.trace}));
 }
}else if(process.argv.includes('--render')){
 const {chromium}=await import('@playwright/test'),{pvDocument}=await import('../shared/pv-render.mjs'),{createVideoService}=await import('../server/services/export.mjs'),{exportInput}=await import('../shared/contracts/index.mjs');
 const {createServer}=await import('vite'),{execFile}=await import('node:child_process'),{promisify}=await import('node:util'),{tmpdir}=await import('node:os');const exec=promisify(execFile);
 const saved=JSON.parse(await readFile(path.join(output,'paper-lantern.json'),'utf8')),html=pvDocument(saved.project,saved.result.pvDesign);
 await writeFile(path.join(output,'preview.html'),html);
 const vite=await createServer({configFile:false,server:{host:'127.0.0.1',port:0},appType:'custom',logLevel:'error'});vite.middlewares.use((req,res,next)=>{if(req.url==='/blank'){res.setHeader('Content-Type','text/html');res.end('<!doctype html><title>Audio acceptance</title>')}else next()});await vite.listen();let browser;
 try{browser=await chromium.launch({headless:true});const page=await browser.newPage();await page.goto(`http://127.0.0.1:${vite.httpServer.address().port}/blank`);
 const wav=await page.evaluate(async score=>{const {renderAudio,wavBlob}=await import('/src/audio.ts');const {buffer}=await renderAudio(score);const bytes=new Uint8Array(await wavBlob(buffer).arrayBuffer());let s='';for(let i=0;i<bytes.length;i+=8192)s+=String.fromCharCode(...bytes.subarray(i,i+8192));return btoa(s)},saved.score);
 const end=saved.project.sections.at(-1),duration=(end.start+end.beats)*60/saved.project.bpm;
 const data=exportInput.parse({visualMode:'html',pvProject:saved.project,pvDesign:saved.result.pvDesign,inputFingerprint:saved.result.inputFingerprint,wav,title:saved.project.title,duration,lyrics:saved.project.lyrics.map(l=>({text:l.text,start:l.start*60/saved.project.bpm,end:l.end*60/saved.project.bpm})),style:'cinema',singingCredit:'demo'});
 const video=await createVideoService(process.cwd());if(!video.ready)throw Error('FFmpeg unavailable');
 let sampleBusy=false,peakTree={workingSetBytes:0,privateBytes:0};const sample=async()=>{if(process.platform!=='win32'||sampleBusy)return;sampleBusy=true;try{const script='$all=Get-CimInstance Win32_Process; $ids=@('+process.pid+'); do {$prior=$ids.Count; $ids=@($ids+@($all | Where-Object {$ids -contains $_.ParentProcessId} | ForEach-Object {$_.ProcessId}) | Select-Object -Unique)} while ($ids.Count -gt $prior); $p=@($all | Where-Object {($ids -contains $_.ProcessId) -and $_.ProcessId -ne $PID}); @{workingSetBytes=($p | Measure-Object WorkingSetSize -Sum).Sum;privateBytes=($p | Measure-Object PrivatePageCount -Sum).Sum} | ConvertTo-Json -Compress';const r=JSON.parse((await exec('powershell.exe',['-NoProfile','-Command',script],{windowsHide:true})).stdout);for(const k of Object.keys(peakTree))peakTree[k]=Math.max(peakTree[k],r[k]||0)}catch{}finally{sampleBusy=false}};
 const timer=setInterval(sample,2000);const started=performance.now();let result;
 try{result=await video.render(data)}finally{clearInterval(timer)}
 try{await copyFile(result.file,path.join(output,'ai-html-pv.mp4'));await writeFile(path.join(output,'mix.wav'),Buffer.from(wav,'base64'));
 const ffprobe=path.join(path.dirname(video.binary),'ffprobe.exe'),probe=JSON.parse((await exec(ffprobe,['-v','error','-show_streams','-show_format','-of','json',result.file],{windowsHide:true})).stdout);
 const visual=probe.streams.find(s=>s.codec_type==='video'),audio=probe.streams.find(s=>s.codec_type==='audio');if(visual.width!==1280||visual.height!==720||visual.r_frame_rate!=='24/1'||!audio||Math.abs(Number(probe.format.duration)-duration)>.1)throw Error('FFprobe output mismatch');
 const targetFrame=300;await copyFile(path.join(result.directory,'frame000000.png'),path.join(output,'first.png'));await copyFile(path.join(result.directory,`frame${String(targetFrame).padStart(6,'0')}.png`),path.join(output,'preview-12500.png'));await copyFile(path.join(result.directory,`frame${String(result.metrics.frames-1).padStart(6,'0')}.png`),path.join(output,'last.png'));
 await exec(video.binary,['-y','-i',result.file,'-vf',`select=eq(n\\,${targetFrame})`,'-frames:v','1',path.join(output,'video-12500.png')],{windowsHide:true});
 const ssimOutput=await exec(video.binary,['-i',path.join(output,'preview-12500.png'),'-i',path.join(output,'video-12500.png'),'-lavfi','ssim','-f','null','-'],{windowsHide:true});const ssim=Number(ssimOutput.stderr.match(/All:([0-9.]+)/)?.[1]);if(!(ssim>.94))throw Error('Preview/video SSIM mismatch: '+ssim);
 const report={duration,wallMilliseconds:Math.round(performance.now()-started),...result.metrics,processTreeSampledPeak:peakTree,samplingIntervalMs:2000,chromium:browser.version(),ffmpeg:(await exec(video.binary,['-version'],{windowsHide:true})).stdout.split('\n')[0],ssimAt12500:ssim,loudness:result.loudness,probe};await writeFile(path.join(output,'render-report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({...report,probe:undefined}));
 }finally{const target=path.resolve(result.directory);if(path.dirname(target)!==path.resolve(tmpdir())||!path.basename(target).startsWith('songyu-'))throw Error('Unsafe cleanup path');await rm(target,{recursive:true,force:true})}
 }finally{await browser?.close();await vite.close()}
 }else if(process.argv.includes('--preview')){
 const {pvDocument}=await import('../shared/pv-render.mjs'),saved=JSON.parse(await readFile(path.join(output,'paper-lantern.json'),'utf8'));const doc=JSON.stringify(pvDocument(saved.project,saved.result.pvDesign)).replaceAll('<',String.fromCharCode(92)+'u003c');const end=saved.project.sections.at(-1),milliseconds=(end.start+end.beats)*60000/saved.project.bpm;
 await writeFile(path.join(output,'preview-harness.html'),`<!doctype html><meta charset="utf-8"><title>CantaLoom offline PV seek</title><style>body{margin:0;background:#17232c;color:white;font:16px sans-serif}iframe{border:0;width:1280px;height:720px;transform-origin:top left}#stage{overflow:hidden}input{width:80%;margin:16px}</style><div id="stage"><iframe sandbox="allow-scripts"></iframe></div><input type="range" min="0" max="${milliseconds}" value="0" step="1"><span>0.00s</span><script>const frame=document.querySelector('iframe'),slider=document.querySelector('input');frame.srcdoc=${doc};slider.addEventListener('input',()=>{document.querySelector('span').textContent=(slider.value/1000).toFixed(2)+'s';frame.contentWindow.postMessage({type:'cantaloom-pv-seek',timeMs:Number(slider.value)},'*')});function size(){const s=Math.min(1,innerWidth/1280);frame.style.transform='scale('+s+')';document.getElementById('stage').style.height=720*s+'px'}addEventListener('resize',size);size();</script>`);
 console.log('Offline sandboxed seek harness: temp/task35/preview-harness.html');
}else console.log('Use --plan / --render / --preview; --plan requires SONGYU_PV_REAL=1.');
