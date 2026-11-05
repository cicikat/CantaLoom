import {melodyRequestSchema,performanceSchema,type MelodyDraft,type MelodyRequest,type Performance} from '../shared/contracts/melody.mjs';
import {validateMelody} from '../shared/melody.mjs';
import {type SongProject,record,validateProject,uid} from './model';
import {effectivePlan} from './song-plan';
import {createProject,syncVocal} from './composer';
// A short-song shell with variable phrase count; no fixed lyric templates.
export function createFreeProject({intent,lyrics,bpm=96,phraseCount=4}:{intent:string;lyrics?:string;bpm?:number;phraseCount?:number}){
 if(!intent.trim()||bpm<60||bpm>160||!Number.isInteger(phraseCount)||phraseCount<1||phraseCount>8)throw Error('请提供创作意图、60–160 BPM 和 1–8 个乐句');
 const lines=lyrics===undefined?Array.from({length:phraseCount},()=>'' ):lyrics.split(/\r?\n/).filter(line=>line.trim());
 if(!lines.length||lines.length>8||lines.some(line=>line.length>100))throw Error('短歌支持 1–8 个乐句，每句最多 100 字');
 const p=createProject(bpm,'海盐汽水',intent),firstCount=Math.ceil(lines.length/2),counts=[firstCount,lines.length-firstCount];
 p.lyrics=lines.map((text,i)=>{const group=i<firstCount?0:1,section=p.sections[group+1],index=group?i-firstCount:i,beats=section.beats/counts[group];return {id:uid(),sectionId:section.id,text,start:section.start+index*beats,end:section.start+(index+1)*beats,notes:[],version:1,locked:false,source:lyrics===undefined?'local-template' as const:'manual' as const}});
 p.sections.forEach(s=>syncVocal(p,s.id));return validateProject(p);
}
export function melodyRequest(p:SongProject,intent:string,targetIds?:string[]):MelodyRequest{return melodyRequestSchema.parse({intent,bpm:p.bpm,songPlan:effectivePlan(p),phrases:p.lyrics.map(l=>({id:l.id,text:l.text,start:l.start,end:l.end,notes:l.notes.map(n=>({...n,syllable:n.syllable||''})),locked:l.locked||p.tracks.some(t=>t.kind==='vocal'&&t.sectionId===l.sectionId&&t.locked),...(l.performance?{performance:l.performance}:{})})),...(targetIds?{targetIds}:{})})}
export function applyMelodyDraft(p:SongProject,request:MelodyRequest,draft:MelodyDraft){
 // Revalidate against latest notes/locks, not only the request snapshot.
 const current=melodyRequest(p,request.intent,request.targetIds);if(current.bpm!==request.bpm||JSON.stringify(current.songPlan)!==JSON.stringify(request.songPlan))throw Error('生成期间和声或速度已改变');
 for(const line of current.phrases){const old=request.phrases.find(l=>l.id===line.id);if(!old||JSON.stringify(old)!==JSON.stringify(line))throw Error('生成期间歌词、音符或锁定已改变')}
 const verified=validateMelody(current,draft),next=structuredClone(p),sections=new Set<string>();
 for(const phrase of verified.phrases){const line=next.lyrics.find(l=>l.id===phrase.id)!;if(line.locked||current.phrases.find(l=>l.id===line.id)!.locked||request.targetIds&&!request.targetIds.includes(line.id))continue;line.text=phrase.text;line.notes=structuredClone(phrase.notes);line.version++;if(line.source!=='manual')line.source=draft.source==='llm'?'llm':'local-template';if(phrase.performance)line.performance=phrase.performance;sections.add(line.sectionId)}
 next.melodyDraft=verified;sections.forEach(id=>syncVocal(next,id));return validateProject(record(next,'应用结构化乐句旋律'));
}
export function setPhrasePerformance(p:SongProject,id:string,input:Performance){const performance=performanceSchema.parse(input),line=p.lyrics.find(l=>l.id===id);if(!line||line.locked||p.tracks.some(t=>t.kind==='vocal'&&t.sectionId===line.sectionId&&t.locked))throw Error('乐句已锁定');const next=structuredClone(p);next.lyrics.find(l=>l.id===id)!.performance=performance;return record(next,'只调整单句演唱表现')}
