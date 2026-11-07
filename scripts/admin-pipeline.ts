// Browser-only diagnostics. Reuse the production composer, mixer and PV renderer.
import {api} from '../src/api/client';
import {renderAudio,wavBlob} from '../src/audio';
import {generateQixuan,instrumentAudio} from '../src/external-audio';
import {buildFreeScore} from '../shared/free-score.mjs';
import {drawPV,blobBase64} from '../src/visual';
import {beatsToSeconds,duration} from '../src/model';

export async function runPipeline(ui){
 const labels=['灵感输入','LLM 歌词 / SongPlan','本地音符','器乐 / 人声 WAV','统一混音','歌词 PV'];
 labels.forEach((label,i)=>ui.onStep(i,label,'pending','等待'));
 async function step(i,fn){const start=performance.now();ui.onStep(i,labels[i],'running','处理中…');try{const result=await fn();ui.onStep(i,labels[i],'succeeded',((performance.now()-start)/1000).toFixed(1)+' 秒');return result}catch(error){ui.onStep(i,labels[i],'failed',error.message);throw Error(labels[i]+'：'+error.message)}}
 const input=await step(0,async()=>({intent:'温暖轻快的短歌，以清楚咬字唱出用户给定歌词，保留原文。',lyrics:['这是歌词'],bpm:ui.random?80+Math.floor(Math.random()*41):96,targetSeconds:20}));
 ui.onInput('歌词：这是歌词 · '+input.bpm+' BPM · 20 秒 · '+(ui.random?'随机参数':'固定参数'));
 const composition=await step(1,async()=>{const result=await api.compose(input);if(result.source!=='llm'||result.plan.lyrics.join('')!=='这是歌词'||result.draft.phrases.map(p=>p.text).join('')!=='这是歌词')throw Error('歌词与输入不一致');return result});
 ui.onPlan(composition.plan);
 const project=await step(2,async()=>{const p=buildFreeScore(composition,()=>crypto.randomUUID());if(!p.tracks.some(t=>t.kind!=='vocal'&&t.notes.length)||!p.lyrics.some(l=>l.notes.length))throw Error('音符为空');p.instrumentMode='fluidsynth';p.singingRunner='CPU';return p});
 ui.onProject(project);
 await step(3,async()=>{const voice=await api.qixuan();if(!voice.available)throw Error(voice.message||'绮萱未就绪');let cached=0,total=0;for(const track of project.tracks.filter(t=>t.kind!=='vocal'&&t.notes.length)){const asset=await instrumentAudio(project,track);ui.onAsset(track.kind,asset);cached+=Number(asset.cached);total++;ui.onStep(3,labels[3],'running','器乐 '+total+' 轨 · 缓存 '+cached)}project.vocalAssets={};for(const line of project.lyrics){project.vocalAssets[line.id]=await generateQixuan(project,line,voice);ui.onAsset('绮萱人声',project.vocalAssets[line.id]);ui.onStep(3,labels[3],'running','人声 '+Object.keys(project.vocalAssets).length+' / '+project.lyrics.length+' 句')}project.vocalMode='external';ui.onProject(project)});
 const wav=await step(4,async()=>{const {buffer}=await renderAudio(project);let peak=0,sum=0;for(let c=0;c<buffer.numberOfChannels;c++)for(const sample of buffer.getChannelData(c)){if(!Number.isFinite(sample))throw Error('混音样本无效');peak=Math.max(peak,Math.abs(sample));sum+=sample*sample}if(peak<.00001)throw Error('混音为静音');const blob=wavBlob(buffer);await ui.onMedia('mix',blob);ui.onInput('歌词：这是歌词 · '+input.bpm+' BPM · '+buffer.duration.toFixed(2)+' 秒 · 峰值 '+peak.toFixed(3)+' · RMS '+Math.sqrt(sum/(buffer.length*buffer.numberOfChannels)).toFixed(4));return blob});
 await step(5,async()=>{const canvas=document.createElement('canvas');canvas.width=1280;canvas.height=720;const scenes=project.sections.map(section=>{drawPV(canvas,project,beatsToSeconds(project,section.start),true,0);return {png:canvas.toDataURL('image/png').split(',')[1],duration:beatsToSeconds(project,section.beats)}});const blob=await api.exportVideo({wav:await blobBase64(wav),scenes,duration:duration(project),lyrics:project.lyrics.map(l=>({text:l.text,start:beatsToSeconds(project,l.start),end:beatsToSeconds(project,l.end)})),style:project.subtitleStyle,title:'这是歌词 · 链路测试',singingCredit:'qixuan'});if(blob.size<1000)throw Error('视频产物为空');await ui.onMedia('pv',blob)});
 ui.onComplete();
}
