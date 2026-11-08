import {renderAudio,wavBlob} from '../../audio';
import {drawPV,download,blobBase64} from '../../visual';
import {beatsToSeconds,duration,type SongProject} from '../../model';
import {api} from '../../api/client';
import type {ExportReport} from '../../api/client';
import {instrumentAudio,currentVocalAsset} from '../../external-audio';
import {audioFileSchema,artifactFileSchema} from '../../../shared/contracts/index.mjs';
import {trackInfo} from '../../model';
import {currentPv,singingCredit} from '../pv/project';
export interface RenderArtifact {label:string;file:string;type:'wav'|'mid'|'ustx'}
function artifact(label:string,url:string,type:RenderArtifact['type']):RenderArtifact{
 if(!url.startsWith('/api/audio/'))throw Error('产物音频引用无效');
 const file=audioFileSchema.parse(url.slice('/api/audio/'.length)).replace(/\.wav$/,'.'+type);
 return {label,file:artifactFileSchema.parse(file),type};
}
export function vocalArtifacts(p:SongProject){
 return p.lyrics.flatMap((l,i)=>{try{const a=currentVocalAsset(p,l),label=`第 ${i+1} 句演唱`;return [artifact(label,a.audioUrl,'wav'),...(a.providerId==='openutau-diffsinger'?[artifact(label,a.audioUrl,'ustx')]:[])]}catch{return []}});
}
export async function prepareInstrumentArtifacts(p:SongProject):Promise<RenderArtifact[]>{
 if(p.instrumentMode!=='fluidsynth')throw Error('器乐缓存文件需要当前工程使用 FluidSynth；未切换音源。');
 const files:RenderArtifact[]=[];
 for(const t of p.tracks){if(t.kind==='vocal'||!t.notes.length)continue;const a=await instrumentAudio(p,t),label=`${p.sections.find(s=>s.id===t.sectionId)?.name} · ${trackInfo[t.kind].name}`;files.push(artifact(label,a.audioUrl,'wav'),artifact(label,a.audioUrl,'mid'))}
 return files;
}
export async function downloadArtifact(a:RenderArtifact){const blob=await api.artifact(a.file);download(blob,`${a.label}${api.mock?'.mock':''}.${a.type}`)}
export async function exportWavFile(p:SongProject){const {buffer}=await renderAudio(p);download(wavBlob(buffer),`${p.metadata.title}${api.mock?'.mock':''}.wav`)}
export async function exportPVFile(p:SongProject){
 const html=p.pvVisualMode==='html'?await currentPv(p,api.mock):undefined;
 const {buffer}=await renderAudio(p),canvas=document.createElement('canvas');canvas.width=1280;canvas.height=720;
 const scenes=html?[]:p.sections.map(s=>{drawPV(canvas,p,beatsToSeconds(p,s.start),true,p.visualScenes.find(v=>v.sectionId===s.id)?.theme??0);return {png:canvas.toDataURL('image/png').split(',')[1],duration:beatsToSeconds(p,s.beats)}});
 let report:ExportReport={status:api.mock?'mock':'missing'};
 const blob=await api.exportVideo({wav:await blobBase64(wavBlob(buffer)),...(html?{visualMode:'html' as const,pvProject:html.project,pvDesign:html.result.pvDesign,inputFingerprint:html.result.inputFingerprint}:{scenes}),lyrics:(html?html.project.lyrics:p.lyrics).map(l=>({text:l.text,start:beatsToSeconds(p,l.start),end:beatsToSeconds(p,l.end)})),style:p.subtitleStyle,title:p.metadata.title,duration:duration(p),singingCredit:singingCredit(p)},value=>{report=value});
 download(blob,`${p.metadata.title}${api.mock?'.mock-export.json':'.mp4'}`);
 return report;
}
