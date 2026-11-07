import {automaticPhrase} from '../shared/performance.mjs';
import {buildFreeScore} from '../shared/free-score.mjs';
import {freeResultSchema,type FreeResult} from '../shared/contracts/free-composition.mjs';
import {kinds} from './model';
import {melodyNoteSchema,melodyRequestSchema,performanceSchema,type MelodyDraft,type MelodyRequest,type Performance} from '../shared/contracts/melody.mjs';
import {lyricChars,validateMelody} from '../shared/melody.mjs';
import {type Note,type SongProject,record,validateProject,uid} from './model';
import {effectivePlan} from './song-plan';
import {localComposer,syncVocal} from './composer';
// A short-song shell with variable phrase count; no fixed lyric templates.
export function createFreeProject({intent,lyrics,bpm=96,phraseCount=4}:{intent:string;lyrics?:string;bpm?:number;phraseCount?:number}){
 if(!intent.trim()||bpm<60||bpm>160||!Number.isInteger(phraseCount)||phraseCount<1||phraseCount>8)throw Error('请提供创作意图、60–160 BPM 和 1–8 个乐句');
 const lines=lyrics===undefined?Array.from({length:phraseCount},()=>'' ):lyrics.split(/\r?\n/).filter(line=>line.trim());
 if(!lines.length||lines.length>8||lines.some(line=>line.length>100))throw Error('短歌支持 1–8 个乐句，每句最多 100 字');
 const total=Math.round(25*bpm/240)*4,verse=Math.max(4,Math.floor((total-8)/8)*4);let cursor=0;
 const sections=[4,verse,total-8-verse,4].map((beats,i)=>{const section={id:uid(),name:['Intro','Verse','Chorus','Outro'][i],start:cursor,beats};cursor+=beats;return section});
 const p=emptyFreeProject(intent,bpm,sections),firstCount=Math.ceil(lines.length/2),counts=[firstCount,lines.length-firstCount];
 p.lyrics=lines.map((text,i)=>{const group=i<firstCount?0:1,section=p.sections[group+1],index=group?i-firstCount:i,beats=section.beats/counts[group];return {id:uid(),sectionId:section.id,text,start:section.start+index*beats,end:section.start+(index+1)*beats,notes:[],version:1,locked:false,source:lyrics===undefined?'local-template' as const:'manual' as const}});
 return validateProject(p);
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
export function setPhrasePerformance(p:SongProject,id:string,input:Performance){const performance=performanceSchema.parse(input),line=p.lyrics.find(l=>l.id===id);if(!line||line.locked||line.performance?.locked||p.tracks.some(t=>t.kind==='vocal'&&t.sectionId===line.sectionId&&t.locked))throw Error('乐句已锁定');const next=structuredClone(p);if(line.performance)next.performanceHistory={...next.performanceHistory,[id]:[line.performance,...(next.performanceHistory?.[id]||[])].slice(0,3)};next.lyrics.find(l=>l.id===id)!.performance=performance;return record(next,'只调整单句演唱表现')}

const phraseEditable=(p:SongProject,id:string)=>{const line=p.lyrics.find(l=>l.id===id);if(!line)throw Error('乐句不存在');if(line.locked||p.tracks.some(t=>t.kind==='vocal'&&t.sectionId===line.sectionId&&t.locked))throw Error('乐句已锁定');return line};
// Edit one line's text. keepMelody reassigns the new characters onto the existing notes (same sung-note count required); otherwise notes are cleared so the caller can request a fresh melody with targetIds=[id]. Locked notes are never modified or cleared: keepMelody rejects when a locked note's character would change, and recomposition rejects whenever the line holds any locked note.
export function setLyricText(p:SongProject,id:string,text:string,options:{keepMelody:boolean}){
 const line=phraseEditable(p,id);if(typeof text!=='string'||text.length>100)throw Error('单句歌词最多 100 字');
 const chars=lyricChars(text),next=structuredClone(p),l=next.lyrics.find(l=>l.id===id)!;
 if(options.keepMelody){
  const sung=[...line.notes].sort((a,b)=>a.beat-b.beat).filter(n=>n.syllable!=='+');
  if(sung.length!==chars.length)throw Error(`新歌词为 ${chars.length} 个唱字，现有旋律为 ${sung.length} 个唱词音符；保留旋律要求字数一致，否则请选择重新作曲`);
  let i=0;const remapped=[...line.notes].sort((a,b)=>a.beat-b.beat).map(n=>n.syllable==='+'?n:{...n,syllable:chars[i++]});
  for(const old of line.notes)if(old.locked&&remapped.find(n=>n.id===old.id)!.syllable!==(old.syllable??'+'))throw Error('乐句含锁定音符，新歌词会改写其唱字；请先解锁或选择不改该字');
  l.notes=remapped;
 }else{
  if(line.notes.some(n=>n.locked))throw Error('乐句含锁定音符，重新作曲会清除锁定音符；请先解锁');
  l.notes=[];if(l.performance?.overrides)l.performance={...l.performance,overrides:[]}
 }
 l.text=text;l.source='manual';l.version++;syncVocal(next,l.sectionId);
 return validateProject(record(next,options.keepMelody?'修改单句歌词，保留原旋律':'修改单句歌词，旋律待重新作曲'));
}
// Apply pitch/start/length edits to one line. Note count, IDs, time order, syllables and locked notes are fixed, so lyric alignment and protected data are preserved by construction; only the edited line's singing dependency changes.
export function editPhraseNotes(p:SongProject,id:string,notes:Note[]){
 const line=phraseEditable(p,id);
 if(!Array.isArray(notes)||notes.length!==line.notes.length)throw Error('音符数量被改变；请使用重新作曲改变音符数量');
 const oldById=new Map(line.notes.map(n=>[n.id,n])),edited=notes.map(raw=>{const n=melodyNoteSchema.parse(raw),old=oldById.get(n.id);if(!old)throw Error('音符 ID 不存在或被替换');if(n.syllable!==(old.syllable??'+'))throw Error('音符音节被改写；请使用歌词编辑修改唱词');if(old.locked&&(n.beat!==old.beat||n.duration!==old.duration||n.midi!==old.midi||n.velocity!==old.velocity||n.locked!==true))throw Error('锁定音符被改写');return n});
 const sorted=[...edited].sort((a,b)=>a.beat-b.beat),oldOrder=[...line.notes].sort((a,b)=>a.beat-b.beat);
 let cursor=line.start;sorted.forEach((n,i)=>{if(n.id!==oldOrder[i].id)throw Error('音符时间顺序被改变；请保持原有顺序，只调整音高、起点和长度');if(n.beat<cursor-.001||n.beat+n.duration>line.end+.001)throw Error('音符越界或与相邻音符重叠');cursor=n.beat+n.duration});
 const next=structuredClone(p),l=next.lyrics.find(l=>l.id===id)!,byId=new Map(edited.map(n=>[n.id,n]));
 l.notes=l.notes.map(old=>byId.get(old.id)!);l.version++;syncVocal(next,l.sectionId);
 return validateProject(record(next,'编辑单句音符的音高、起点或长度'));
}

function emptyFreeProject(intent:string,bpm:number,sections:SongProject['sections']):SongProject{
 const now=new Date().toISOString();return {schemaVersion:1,mode:'free',id:uid(),metadata:{title:'自由创作',idea:intent,createdAt:now,updatedAt:now},bpm,timeSignature:[4,4],style:'自由创作',mood:'待真实规划',sections,tracks:[],lyrics:[],vocalPreset:'澄音',visualScenes:sections.map(s=>({id:uid(),sectionId:s.id,theme:0,source:'procedural'})),assetReferences:[],versions:[],subtitleStyle:'cinema',tapTimes:[]};
}
export function projectFromComposition(raw:FreeResult):SongProject{
 const result=freeResultSchema.parse(raw);validateMelody({intent:result.input.intent,bpm:result.plan.bpm,songPlan:result.plan.songPlan,phrases:result.draft.phrases.map(l=>({id:l.id,text:l.text,start:l.start,end:l.end,notes:[]}))},result.draft);return validateProject(buildFreeScore(result,uid));
}

export function autoTuneProject(p:SongProject,id?:string){const next=structuredClone(p);for(const l of next.lyrics){if(id&&id!==l.id||l.performance?.locked||l.locked||next.tracks.some(t=>t.kind==='vocal'&&t.sectionId===l.sectionId&&t.locked))continue;const old=l.performance;if(old)next.performanceHistory={...next.performanceHistory,[l.id]:[old,...(next.performanceHistory?.[l.id]||[])].slice(0,3)};const section=next.sections.findIndex(s=>s.id===l.sectionId);const energy=next.songPlan?.sectionEnergy[(['intro','verse','chorus','outro'] as const)[section]]??.6;l.performance=automaticPhrase(l.text,l.notes.map(n=>({...n,syllable:n.syllable||''})),energy,old||{preset:'natural'})}return record(next,'自动规划演唱表现')}
export function restorePerformance(p:SongProject,id:string){const next=structuredClone(p),line=next.lyrics.find(l=>l.id===id),history=next.performanceHistory?.[id];if(!line||line.locked||line.performance?.locked||next.tracks.some(t=>t.kind==='vocal'&&t.sectionId===line.sectionId&&t.locked)||!history?.length)throw Error('无可恢复调教或已锁定');line.performance=history.shift()!;return record(next,'恢复上一版调教')}
