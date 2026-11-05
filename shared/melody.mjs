import {melodyDraftSchema,melodyRequestSchema} from './contracts/melody.mjs';
export const lyricChars=text=>Array.from(text).filter(c=>/[\p{L}\p{N}]/u.test(c));
const offsets={C:0,D:2,E:4,F:5,G:7,A:9,B:11};
export function scaleClasses(plan){return (plan.key.mode==='minor'?[0,2,3,5,7,8,10]:[0,2,4,5,7,9,11]).map(n=>(n+offsets[plan.key.tonic])%12)}
export function chordClasses(plan,beat){const scale=scaleClasses(plan),root=plan.chordProgression[Math.floor(beat/4)%4]-1;return [0,2,4].map(n=>scale[(root+n)%7])}
export function validateMelody(input,raw){
 const request=melodyRequestSchema.parse(input),draft=melodyDraftSchema.parse(raw);
 if(draft.phrases.length!==request.phrases.length)throw Error('乐句数量不匹配');
 const ids=new Set(),scale=scaleClasses(request.songPlan);
 for(let i=0;i<request.phrases.length;i++){
  const before=request.phrases[i],p=draft.phrases[i];
  if(p.id!==before.id||p.start!==before.start||p.end!==before.end||before.text&&p.text!==before.text)throw Error('乐句身份、时间轴或手写歌词被改写');
  const target=!request.targetIds||request.targetIds.includes(p.id);
  if(before.locked||!target){if(JSON.stringify(p.notes)!==JSON.stringify(before.notes)||p.text!==before.text)throw Error('非目标或锁定乐句被改写')}
  for(const n of before.notes.filter(n=>n.locked))if(JSON.stringify(p.notes.find(x=>x.id===n.id))!==JSON.stringify(n))throw Error('锁定音符被改写');
  const chars=lyricChars(p.text);let index=0,cursor=p.start,previous;
  for(const n of p.notes){
   if(ids.has(n.id)||n.beat<cursor-.001||n.beat+n.duration>p.end+.001)throw Error('音符 ID、边界或重叠无效');ids.add(n.id);
   if(n.syllable==='+'){if(!previous||Math.abs(n.beat-cursor)>.001)throw Error('延音必须紧接前音符')}else if(n.syllable!==chars[index++])throw Error('歌词音符对齐无效');
   const preserved=before.notes.some(old=>old.locked&&old.id===n.id);
   if(!preserved&&!scale.includes(n.midi%12))throw Error('音符不属于当前调式');
   if(!preserved&&Math.abs(n.beat/2-Math.round(n.beat/2))<.001&&!chordClasses(request.songPlan,n.beat).includes(n.midi%12))throw Error('强拍音符不兼容当前和弦');
   cursor=n.beat+n.duration;previous=n;
  }
  if(index!==chars.length)throw Error('歌词未完整覆盖');
  if(target&&!before.locked&&p.notes.length>=4&&!p.notes.every(n=>n.locked)){
   const durations=new Set(p.notes.map(n=>n.duration.toFixed(4)));
   const rest=p.notes.some((n,i)=>i&&n.beat>p.notes[i-1].beat+p.notes[i-1].duration+.01);
   const repeats=p.notes.some((n,i)=>i&&n.midi===p.notes[i-1].midi);
   const intervals=new Set(p.notes.slice(1).map((n,i)=>n.midi-p.notes[i].midi));
   if(durations.size<2||!rest&&!repeats&&intervals.size<3)throw Error('旋律缺少非均匀节奏或乐句变化');
  }
  if(p.variationOf&&!draft.phrases.some(x=>x.id===p.variationOf&&x.id!==p.id))throw Error('动机引用不存在');
 }
 return draft;
}
// Explicit fallback: rhythm/motif grammar, never random pitch jitter or LLM provenance.
export function localMelody(input){
 const r=melodyRequestSchema.parse(input),scale=scaleClasses(r.songPlan);
 const phrases=r.phrases.map((p,phraseIndex)=>{
  if(p.locked||r.targetIds&&!r.targetIds.includes(p.id))return {...p,motif:'preserved'};
  if(p.notes.some(n=>n.locked))throw Error('本地规则不补全部分锁定音符，请使用结构化 LLM 续写');
  const chars=lyricChars(p.text);if(!chars.length)throw Error('本地旋律需要用户歌词');
  const weights=chars.map((_,i)=>[1,1,2,.5,1.5,1][i%6]);const available=p.end-p.start-.5;
  const unit=available/(weights.reduce((a,b)=>a+b,0)+Math.floor(chars.length/4)*.5);let at=p.start;
  const notes=chars.map((c,i)=>{if(i&&i%4===0)at+=unit*.5;const tones=chordClasses(r.songPlan,at);const cls=Math.abs(at/2-Math.round(at/2))<.001?tones[[0,0,1,2][i%4]]:scale[[0,0,2,4,3,2][(i+phraseIndex)%6]];const midi=60+cls;const duration=unit*weights[i];const n={id:`${p.id}-local-${i}`,beat:at,duration,midi,velocity:[.5,.45,.65,.5][i%4],syllable:c};at+=duration;return n});
  return {...p,notes,motif:`rhythm-112-half-${phraseIndex%2}`};
 });
 return validateMelody(r,{version:1,source:'local-rules',phrases});
}
