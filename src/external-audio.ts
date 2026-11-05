import type {SongProject,Lyric,VocalAsset} from './model';
import {singingDependency,type SingingVoice} from './singing';
export async function instrumentAudio(p:SongProject,t:SongProject['tracks'][number]){
 const response=await fetch('/api/instruments/render',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({bpm:p.bpm,kind:t.kind,notes:t.notes,program:p.instrumentPrograms?.[t.kind],soundfont:p.soundfont,endBeat:p.sections.find(s=>s.id===t.sectionId)!.start+p.sections.find(s=>s.id===t.sectionId)!.beats})});
 const result=await response.json();if(!response.ok)throw Error(result.error||'乐器渲染失败');return result as {audioUrl:string;key:string};
}
export function currentVocalAsset(p:SongProject,l:Lyric){const a=p.vocalAssets?.[l.id];if(!a||a.dependency!==singingDependency(p,l,{id:a.voiceId,version:a.voiceVersion,providerId:a.providerId as SingingVoice['providerId'],label:a.voiceId}))throw Error('此句真实人声缺失或已过期，请重新生成／导入 WAV');return a;}
export async function importSinging(p:SongProject,l:Lyric,file:File,voice:SingingVoice):Promise<VocalAsset>{
 const bytes=new Uint8Array(await file.arrayBuffer());if(bytes.length>8e6)throw Error('单句 WAV 不能超过 8 MB');
 const context=new AudioContext({sampleRate:24000});let seconds:number;try{const audio=await context.decodeAudioData(bytes.buffer.slice(0));seconds=audio.duration;if(Math.abs(seconds-(l.end-l.start)*60/p.bpm)>.15)throw Error('单句 WAV 长度不匹配：请导出从本句起点开始、包含休止的完整单句音频')}finally{await context.close()}
 const response=await fetch('/api/singing/import',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({wav:await new Promise<string>((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve((r.result as string).split(',')[1]);r.onerror=reject;r.readAsDataURL(file)}),voice})});const result=await response.json();if(!response.ok)throw Error(result.error);
 return {...result,dependency:singingDependency(p,l,voice),providerId:voice.providerId,voiceId:voice.id,voiceVersion:voice.version,startSeconds:l.start*60/p.bpm,durationSeconds:seconds,isDemo:false,projectVersion:p.metadata.updatedAt};
}
