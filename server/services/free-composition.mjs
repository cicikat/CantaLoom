import {randomUUID} from 'node:crypto';
import {z} from 'zod';
import {freeInputSchema,freePlanSchema,freeResultSchema} from '../../shared/contracts/free-composition.mjs';
import {freeTimeline} from '../../shared/free-timeline.mjs';
import {createMelodyComposer} from './melody.mjs';
export function createFreeComposer({env=process.env,request=fetch,melody=createMelodyComposer({env,request})}={}){
 return {async compose(raw,onStage=()=>{}){
  const input=freeInputSchema.parse(raw);if(!env.LLM_API_KEY)throw Error('正式创作需要真实 LLM 配置');
  onStage('planning');const model=env.LLM_MODEL||'gpt-4.1-mini';
  const response=await request(`${(env.LLM_BASE_URL||'https://api.openai.com/v1').replace(/\/$/,'')}/chat/completions`,{method:'POST',redirect:'error',signal:AbortSignal.timeout(90000),headers:{'Content-Type':'application/json',Authorization:`Bearer ${env.LLM_API_KEY}`},body:JSON.stringify({model,response_format:{type:'json_object'},messages:[{role:'system',content:`根据本次自由描述创作原创中文短歌，不使用预设曲风或歌词模板。只输出 Schema：${JSON.stringify(z.toJSONSchema(freePlanSchema))}。保留用户所有歌词字词和行数。用户给 bpm 时必须使用它，否则结合意图选择60到160。未给歌词时原创1到8句，每句5到12字。phraseWeights 对应每句相对时长，按字数、停顿和句尾长音分配。SongPlan 负责和声与情绪，主副歌能量须体现意图，后续真实旋律将依据它生成。`},{role:'user',content:JSON.stringify(input)}]})});
  if(!response.ok)throw Error('规划服务失败');const body=await response.json(),plan=freePlanSchema.parse(JSON.parse(body.choices?.[0]?.message?.content||''));
  if(input.bpm&&plan.bpm!==input.bpm)throw Error('规划器修改了用户速度');
  const timeline=freeTimeline(input,plan,randomUUID);onStage('melody');
  const result=await melody.compose({intent:input.intent,bpm:timeline.bpm,songPlan:plan.songPlan,phrases:timeline.phrases,source:'llm'});
  if(result.draft.source!=='llm')throw Error('正式模式拒绝本地替代结果');onStage('validated');
  return freeResultSchema.parse({requestId:randomUUID(),source:'llm',model,input,plan,sections:timeline.sections,draft:result.draft});
 }};
}
