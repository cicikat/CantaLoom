import {projectInstrumentInput} from '../shared/groove.mjs';
import {api} from './api/client';
import type {AvailableQixuan} from '../shared/contracts/index.mjs';
import type {SongProject,Lyric,VocalAsset} from './model';
import {singingDependency,type SingingVoice} from './singing';
export async function instrumentAudio(p:SongProject,t:SongProject['tracks'][number]){
 return api.instruments(projectInstrumentInput(p,t));
}
// Preserve the established dependency serialization order across Schema parsing.
export function assetVoice(a:VocalAsset):SingingVoice{return {id:a.voiceId,version:a.voiceVersion,providerId:a.providerId as SingingVoice['providerId'],label:a.voiceId,engineVersion:a.engineVersion,renderParameters:a.renderParameters?{runner:a.renderParameters.runner,steps:a.renderParameters.steps,depth:a.renderParameters.depth}:undefined}}
export function currentVocalAsset(p:SongProject,l:Lyric){const a=p.vocalAssets?.[l.id];if(!a||a.mock&&!api.mock||a.dependency!==singingDependency(p,l,assetVoice(a))||a.providerId==='openutau-diffsinger'&&a.renderParameters?.runner!==(p.singingRunner||'CPU'))throw Error('此句真实人声缺失或已过期，请重新生成／导入 WAV');return a;}
export type {QixuanStatus} from '../shared/contracts/index.mjs';
export async function generateQixuan(p:SongProject,l:Lyric,voice:AvailableQixuan,take=0):Promise<VocalAsset>{const runner=p.singingRunner||'CPU';const result=await api.sing({lyricId:l.id,lyrics:l.text,start:l.start,end:l.end,bpm:p.bpm,notes:l.notes.map(n=>({beat:n.beat,duration:n.duration,midi:n.midi,velocity:n.velocity,syllable:n.syllable})),runner,take,engineVersion:voice.engineVersion,...(l.performance?{performance:l.performance}:{})});return {...result,dependency:singingDependency(p,l,{id:voice.id,version:voice.version,providerId:voice.providerId,label:voice.label,engineVersion:voice.engineVersion,renderParameters:{runner,...voice.parameters}}),projectVersion:p.metadata.updatedAt};}
export async function importSinging(p:SongProject,l:Lyric,file:File,voice:SingingVoice):Promise<VocalAsset>{
 const bytes=new Uint8Array(await file.arrayBuffer());if(bytes.length>8e6)throw Error('单句 WAV 不能超过 8 MB');
 const context=new AudioContext({sampleRate:24000});let seconds:number;try{const audio=await context.decodeAudioData(bytes.buffer.slice(0));seconds=audio.duration;if(Math.abs(seconds-(l.end-l.start)*60/p.bpm)>.15)throw Error('单句 WAV 长度不匹配：请导出从本句起点开始、包含休止的完整单句音频')}finally{await context.close()}
 if(voice.providerId==='openutau-diffsinger')throw Error('官方绮萱请使用生成接口');
 const result=await api.importSinging({wav:await new Promise<string>((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve((r.result as string).split(',')[1]);r.onerror=reject;r.readAsDataURL(file)}),voice:{...voice,providerId:voice.providerId}});
 return {...result,dependency:singingDependency(p,l,voice),providerId:voice.providerId,voiceId:voice.id,voiceVersion:voice.version,startSeconds:l.start*60/p.bpm,durationSeconds:seconds,isDemo:!!result.mock,...(result.mock?{mock:true as const}:{}),projectVersion:p.metadata.updatedAt};
}
