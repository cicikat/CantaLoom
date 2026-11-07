import {melodyNoteSchema,performanceSchema,type MelodyRequest,type MelodyDraft,type Performance} from '../../shared/contracts/melody.mjs';
import {lyricChars} from '../../shared/melody.mjs';
import {automaticPhrase} from '../../shared/performance.mjs';
import {applyMelodyDraft} from '../melody';
import {record,validateProject,type SongProject,type Note} from '../model';

function lineFor(p:SongProject,id:string){
 const line=p.lyrics.find(l=>l.id===id);
 if(p.mode!=='free'||!line||!p.melodyDraft)throw Error('请先打开完整的自由作品。');
 if(p.melodyDraft.phrases.length!==p.lyrics.length||p.lyrics.some(l=>{const d=p.melodyDraft!.phrases.find(d=>d.id===l.id);return !d||d.text!==l.text||d.start!==l.start||d.end!==l.end||JSON.stringify(d.notes)!==JSON.stringify(l.notes)}))throw Error('工程里的乐句与旋律草稿不一致，原工程已保留。');
 return line;
}
export function phraseLocked(p:SongProject,id:string){const l=p.lyrics.find(l=>l.id===id);return !l||l.locked||p.tracks.some(t=>t.sectionId===l.sectionId&&t.kind==='vocal'&&t.locked)}
function reindex(performance:Performance|undefined,before:Note[],after:Note[],regenerated=false){
 if(!performance?.overrides?.length)return structuredClone(performance);
 const overrides=performance.overrides.flatMap(o=>{
  const id=before[o.index]?.id,index=after.findIndex(n=>n.id===id);
  if(!id||index<0){if(regenerated&&performance.mode==='auto'&&!performance.locked&&o.origin==='auto'&&!o.locked)return [];throw Error('已有逐音符设置无法对应到新音符，原工程已保留。')}
  return [{...o,index}];
 });
 return performanceSchema.parse({...performance,overrides});
}
function generatedPerformance(text:string,performance:Performance|undefined,before:Note[],after:Note[]){
 const mapped=reindex(performance,before,after,true);
 return mapped?.mode==='auto'?automaticPhrase(text,after.map(n=>({...n,syllable:n.syllable||''})),mapped.energy??.6,mapped):mapped;
}
function align(text:string,notes:Note[]){
 const chars=lyricChars(text);let i=0,end=-Infinity;
 const result=notes.map((n,index)=>{
  if(n.beat<end-.000001)throw Error('音符不能重叠，请调整位置或长度。');
  if(n.syllable==='+'&&(!index||Math.abs(n.beat-end)>.000001))throw Error('延音必须紧接前一个音符。');
  end=n.beat+n.duration;
  return {...n,syllable:n.syllable==='+'?'+':chars[i++]};
 });
 if(i!==chars.length||result.some(n=>!n.syllable))throw Error('歌词与音符数量不一致，原工程已保留。');
 return result;
}
// Update only the vocal display notes; all existing IDs and sibling track data survive.
function syncPhraseTrack(before:SongProject,next:SongProject,lineId:string){
 const old=before.lyrics.find(l=>l.id===lineId)!,line=next.lyrics.find(l=>l.id===lineId)!;
 const track=next.tracks.find(t=>t.sectionId===line.sectionId&&t.kind==='vocal');
 if(!track||track.locked)throw Error('人声音轨已锁定或缺失。');
 const source=before.tracks.find(t=>t.id===track.id)!;
 const beforeNotes=before.lyrics.filter(l=>l.sectionId===line.sectionId).flatMap(l=>l.notes);
 if(source.notes.length!==beforeNotes.length||beforeNotes.some((n,i)=>{const t=source.notes[i];return n.beat!==t.beat||n.duration!==t.duration||n.midi!==t.midi||n.syllable!==t.syllable}))throw Error('人声音轨与乐句不一致，原工程已保留。');
 const ids=new Map(beforeNotes.map((n,i)=>[n.id,source.notes[i].id]));
 const index=beforeNotes.findIndex(n=>n.id===old.notes[0]?.id);
 const prefix=source.notes.slice(0,index),suffix=source.notes.slice(index+old.notes.length);
 // applyMelodyDraft has already supplied fresh display IDs for newly generated notes.
 const generated=new Map(track.notes.map(n=>[`${n.beat}:${n.syllable}`,n.id]));
 track.notes=[...prefix,...line.notes.map(n=>({...n,id:ids.get(n.id)||generated.get(`${n.beat}:${n.syllable}`)||n.id+'-vocal'})),...suffix];
 track.version=source.version+1;
}
export function editPhraseNote(p:SongProject,lineId:string,noteId:string,patch:Partial<Pick<Note,'midi'|'beat'|'duration'|'locked'>>){
 const old=lineFor(p,lineId);if(phraseLocked(p,lineId))throw Error('这句已锁定，请先解锁。');
 const note=old.notes.find(n=>n.id===noteId);if(!note)throw Error('选中的音符已不存在。');
 if(note.locked&&Object.keys(patch).some(k=>k!=='locked'))throw Error('音符已锁定，请先解锁。');
 const next=structuredClone(p),line=next.lyrics.find(l=>l.id===lineId)!;
 const parsed=melodyNoteSchema.parse({...note,...patch});
 if(parsed.beat<line.start||parsed.beat+parsed.duration>line.end+.000001)throw Error('音符不能超出这一句的时间范围。');
 const notes=align(line.text,line.notes.map(n=>n.id===noteId?parsed:n).sort((a,b)=>a.beat-b.beat));
 for(const locked of old.notes.filter(n=>n.locked&&n.id!==noteId))if(JSON.stringify(notes.find(n=>n.id===locked.id))!==JSON.stringify(locked))throw Error('移动会改动锁定音符的歌词，请先解锁或换一个位置。');
 line.notes=notes;line.version++;
 line.performance=reindex(line.performance,old.notes,notes);
 if(next.performanceHistory?.[lineId])next.performanceHistory[lineId]=next.performanceHistory[lineId].map(v=>reindex(v,old.notes,notes)!);
 const phrase=next.melodyDraft!.phrases.find(l=>l.id===lineId)!;phrase.notes=structuredClone(notes);phrase.performance=structuredClone(line.performance);
 syncPhraseTrack(p,next,lineId);
 return validateProject(record(next,'手动编辑单句音符或音符锁'));
}
export function togglePhraseLock(p:SongProject,id:string){
 const old=lineFor(p,id);if(p.tracks.some(t=>t.sectionId===old.sectionId&&t.kind==='vocal'&&t.locked))throw Error('请先解锁这一段的人声音轨。');
 const next=structuredClone(p),line=next.lyrics.find(l=>l.id===id)!;line.locked=!line.locked;
 next.melodyDraft!.phrases.find(l=>l.id===id)!.locked=line.locked;
 return validateProject(record(next,'切换乐句锁定'));
}
export function applyPhraseResult(p:SongProject,request:MelodyRequest,draft:MelodyDraft){
 const next=applyMelodyDraft(p,request,draft);
 for(const id of request.targetIds||[]){
  if(phraseLocked(p,id))continue;
  const old=lineFor(p,id),line=next.lyrics.find(l=>l.id===id)!;
  // Existing expression controls follow stable note IDs, never a new unrelated index.
  line.performance=generatedPerformance(line.text,old.performance,old.notes,line.notes);
  if(next.performanceHistory?.[id])next.performanceHistory[id]=next.performanceHistory[id].map(v=>generatedPerformance(line.text,v,old.notes,line.notes)!);
  next.melodyDraft!.phrases.find(l=>l.id===id)!.performance=structuredClone(line.performance);
  syncPhraseTrack(p,next,id);
 }
 next.melodyDraft!.phrases=next.melodyDraft!.phrases.map(l=>request.targetIds?.includes(l.id)?l:structuredClone(p.melodyDraft!.phrases.find(old=>old.id===l.id)!));
 return validateProject(next);
}
