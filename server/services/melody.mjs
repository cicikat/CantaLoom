import {assembleMelody,melodyIntentV1,melodyIntentInstructions} from './melody-intent.mjs';
import {lyricChars} from '../../shared/melody.mjs';
import {createTaskRouter} from './llm-router.mjs';
import {melodyRequestSchema,melodyDraftSchema,melodyResponseSchema} from '../../shared/contracts/melody.mjs';
import {validateMelody,localMelody,scaleClasses,chordClasses} from '../../shared/melody.mjs';
export function createMelodyComposer({env=process.env,request=fetch}={}){
 return {async compose(raw,{compact=false}={}){
  const input=melodyRequestSchema.parse(raw);if(input.source==='local-rules')return {draft:localMelody(input)};

  const system=`你是中文原创歌曲旋律作曲者。只输出符合 JSON Schema 的对象：（由任务路由附带的 Schema）。source 必须 llm。输入已有宏观 songPlan，不要改和弦调性。所有乐句使用绝对 beat，保持 ID/start/end/顺序。用户提供 text 时逐字保留；空 text 时原创中文歌词，不能模板替换。输出真实可唱音符：重复音、跳进、非均匀时值、句内休止、长音、同字多音用 + 且紧接前音符。syllable 必须按中文字符逐个对应（忽略标点）。不要等分整句，不要连续音阶。强拍（beat 为偶数）落在当前小节和弦三和弦音，其余音在调内；和弦按全曲 beat 每4拍轮换，逐小节和弦参照在补充消息给出。MIDI48到84。用 motif 说明动机，variationOf 引用另一句 ID 表示变化。非目标句和 locked 整句的 notes/text 原样返回；所有 locked 音符逐字段保留，其余音符绕开它们补全，不得重叠。保持 performance、锁定标记。短句适度留白。intent 是音乐意图，不是歌词原文。遵从散文式不等句长，不要为工整重写歌词。可用慢长音与切分、突停、重复动机形成情绪对照，克制跳进，高潮后允许回落。`;
  // Deterministic harmony reference for the requested range: the model no longer has to track long absolute timelines by itself.
  const first=Math.min(...input.phrases.map(p=>p.start)),lastEnd=Math.max(...input.phrases.map(p=>p.end)),bars=[];for(let b=Math.floor(first/4)*4;b<lastEnd;b+=4)bars.push(`${b}:${chordClasses(input.songPlan,b).join('/')}`);
  const harmony=`调式音级（MIDI mod 12）：${scaleClasses(input.songPlan).join('/')}。逐小节（每4拍）强拍三和弦音级：${bars.join('，')}。偶数 beat 音符必须落在对应小节这三个音级之一。`;
  const result=await createTaskRouter({env,request}).run('melody_composition',{
   schema:compact?melodyIntentV1:melodyDraftSchema.omit({mock:true}),input:compact?{...input,phrases:input.phrases.map(({id,text,start,end})=>({phraseId:id,start,end,lyricChars:lyricChars(text)}))}:input,system:(compact?melodyIntentInstructions:system)+'\n'+harmony,promptVersion:compact?'intent-v1':'2',attempts:3,timeout:180000,
   validate:raw=>{if(compact)return assembleMelody(input,raw);if(raw?.mock===true)throw Error('真实旋律不能包含 Mock 标记');const draft=validateMelody(input,raw);if(draft.source!=='llm')throw Error('来源标记错误');return draft},
  });
  const response=melodyResponseSchema.parse({draft:result.value,model:result.model,metrics:{milliseconds:result.trace.milliseconds,promptTokens:result.trace.promptTokens,completionTokens:result.trace.completionTokens}});
  return compact?{...response,trace:result.trace}:response;
 }};
}
