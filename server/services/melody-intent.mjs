import {randomUUID} from 'node:crypto';
import {z} from 'zod';
import {lyricChars,validateMelody} from '../../shared/melody.mjs';
import {TaskError} from './llm-router.mjs';

export const melodyIntentV1=z.object({
 version:z.literal(1),
 phrases:z.array(z.object({
  phraseId:z.string().min(1).max(150),
  motif:z.string().min(1).max(150),
  variationOf:z.string().max(150).optional(),
  notes:z.array(z.object({
   offset:z.number().min(0).max(256),duration:z.number().min(.125).max(16),
   midi:z.number().int().min(48).max(84),lyricIndex:z.number().int().min(-1).max(99),
  }).strict()).min(1).max(100),
 }).strict()).min(1).max(16),
}).strict();

export const melodyIntentInstructions='只返回每句 phraseId、motif、可选 variationOf 及音符意图。offset 是从该句起点起算的拍数，duration 是拍数，lyricIndex 从 0 起按 lyricChars 顺序填；连音写 -1，必须紧接上一音。每字出现一次。使用重复音、非均匀时值、休止与长音，避免连续音阶。绝对偶数 beat 的起音必须匹配小节和弦，其余音在调内。例：{"version":1,"phrases":[{"phraseId":"p1","motif":"短长","notes":[{"offset":0,"duration":0.5,"midi":60,"lyricIndex":0},{"offset":0.5,"duration":1.25,"midi":64,"lyricIndex":1}]}]}';

export function assembleMelody(input,draft){
 const byId=new Map(draft.phrases.map(phrase=>[phrase.phraseId,phrase]));
 if(byId.size!==input.phrases.length||draft.phrases.length!==input.phrases.length){
  throw new TaskError('SEMANTIC_VALIDATION_FAILED','phrases 必须覆盖所有输入乐句，phraseId 不得重复');
 }
 const phrases=input.phrases.map((phrase,index)=>{
  const path='phrases['+index+']';
  const entry=byId.get(phrase.id);
  if(!entry)throw new TaskError('SEMANTIC_VALIDATION_FAILED',path+' 缺少该 phraseId');
  const chars=lyricChars(phrase.text);
  const notes=entry.notes.map((note,n)=>{
   const syllable=note.lyricIndex===-1?'+':chars[note.lyricIndex];
   if(!syllable)throw new TaskError('SEMANTIC_VALIDATION_FAILED',path+'.notes['+n+'].lyricIndex 越界');
   return {id:randomUUID(),beat:phrase.start+note.offset,duration:note.duration,midi:note.midi,velocity:.7,syllable};
  });
  return {...phrase,motif:entry.motif,variationOf:entry.variationOf,notes};
 });
 // Keep the full-song validation, including unique IDs and cross-phrase references.
 try{return validateMelody(input,{version:1,source:'llm',phrases})}
 catch(error){throw new TaskError('SEMANTIC_VALIDATION_FAILED',error.message.slice(0,200))}
}
