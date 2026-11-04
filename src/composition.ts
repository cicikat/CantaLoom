import {planOutputSchema,planResponseSchema,type PlanOutput,type Planning} from '../shared/song-plan.mjs';
import {type SongProject,type Style,record,validateProject} from './model';
import {localComposer,localLyrics,lyricNotes,syncVocal} from './composer';
import {localSongPlan,effectivePlan} from './song-plan';
import {protectedSections} from './guided-composer';

export function localComposition(idea:string,style:Style):PlanOutput {
 const songPlan=localSongPlan(idea,style);
 return {title:songPlan.emotion==='melancholic'?'把心事唱给夜色':songPlan.emotion==='driving'?'把心跳开到最大':'把夏天唱成一座岛',mood:{calm:'温柔 · 留白 · 沉静',melancholic:'内省 · 孤独 · 倾诉',bright:'明亮 · 轻盈 · 希望',driving:'强烈 · 自由 · 跃动'}[songPlan.emotion],lyrics:localLyrics.write(idea,style),songPlan};
}

// Transaction: validate everything before cloning, publish one completed project.
export function applySongPlan(project:SongProject,input:PlanOutput,style:Style,idea:string,origin:Pick<Planning,'source'|'model'>):SongProject {
 const output=planOutputSchema.parse(input),next=structuredClone(project),protectedIds=protectedSections(project),compatibility:string[]=[];
 next.songPlan=output.songPlan;
 if(protectedIds.size){
  const old=effectivePlan(project);next.songPlan.key=structuredClone(old.key);next.songPlan.chordProgression=[...old.chordProgression];
  next.songPlan.reasons=next.songPlan.reasons.filter(r=>r.decision!=='key'&&r.decision!=='harmony').slice(0,4);
  next.songPlan.reasons.unshift({decision:'key',reason:'已有锁定或手写音符，保留原调性与和弦，不强行改写和声。'});
  compatibility.push('为保护已有音高内容，维持原调性与和弦；相关段落仅更新允许改动的鼓点。');
  for(const s of project.sections)if(protectedIds.has(s.id))compatibility.push(`${s.name}：保留整段带音高轨道和歌词音符，避免新和声与旧旋律冲突。`);
 }
 if(project.tracks.some(t=>t.locked||t.manuallyEdited))compatibility.push('已锁定音轨与手工编辑音轨原样保留；以下意图只作用于可更新的部分。');
 if(project.tapTimes.length>=4)compatibility.push('保留你敲入的底鼓落点，密度建议只调整允许补全的军鼓与踩镲。');
 next.style=style;next.metadata.idea=idea;next.metadata.title=output.title;next.mood=output.mood;
 next.planning={...origin,appliedAt:new Date().toISOString(),compatibility};
 next.lyrics.forEach((l,i)=>{
  if(protectedIds.has(l.sectionId)||l.locked)return;
  if(l.source!=='manual'){l.text=output.lyrics[i];l.source=origin.source==='llm'?'llm':'local-template'}
  l.version++;l.notes=lyricNotes(l,next.vocalPreset,l.version,next);
 });
 next.tracks.forEach(t=>{
  if(t.locked||t.manuallyEdited||t.kind!=='drums'&&protectedIds.has(t.sectionId)||t.kind==='vocal')return;
  t.version++;t.notes=localComposer.generate(next,t);
 });
 next.sections.filter(s=>!protectedIds.has(s.id)).forEach(s=>syncVocal(next,s.id));
 return validateProject(record(next,origin.source==='llm'?'应用已校验 LLM 音乐方案':'应用本地规则音乐方案'));
}

export async function composeFromIdea(p:SongProject,idea:string,style:Style,useLLM:boolean,request:typeof fetch=fetch){
 if(!useLLM)return applySongPlan(p,localComposition(idea,style),style,idea,{source:'local-rules'});
 const response=await request('/api/plan',{method:'POST',signal:AbortSignal.timeout(35000),headers:{'Content-Type':'application/json'},body:JSON.stringify({idea,style})});
 if(!response.ok)throw Error('LLM 请求失败，工程已保留；可以选择本地规则继续创作。');
 const data=planResponseSchema.parse(await response.json());
 return applySongPlan(p,{title:data.title,mood:data.mood,lyrics:data.lyrics,songPlan:data.songPlan},style,idea,{source:data.source,model:data.model});
}
