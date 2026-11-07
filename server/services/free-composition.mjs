import {createTaskRouter} from './llm-router.mjs';
import {randomUUID} from 'node:crypto';
import {freeInputSchema,freePlanSchema,freeResultSchema} from '../../shared/contracts/free-composition.mjs';
import {freeTimeline} from '../../shared/free-timeline.mjs';
import {createMelodyComposer} from './melody.mjs';
export function createFreeComposer({env=process.env,request=fetch,melody=createMelodyComposer({env,request})}={}){
 return {async compose(raw,onStage=()=>{}){
  const input=freeInputSchema.parse(raw);onStage('planning');
  const planning=await createTaskRouter({env,request}).run('lyrics_planning',{
   schema:freePlanSchema,input,system:`根据本次自由描述创作原创中文短歌，不使用预设曲风或歌词模板。只输出 Schema：（由任务路由附带的 Schema）。保留用户所有歌词字词和行数。用户给 bpm 时必须使用它，否则结合意图选择60到160。用户 intent 是音乐/情绪/节奏指令，不是歌词，不得直接用作标题或首句，也不要逐字复述指令。未给歌词时自由创作1到8个乐句，长短不齐，可像散文歌，允许跨句、语气转折和自然标点；无工整要求不要强求对仗、押韵或等字数。短歌总字数宜18到38字，允许单字短句与较长句。若意图要求时而悠扬时而激烈，请通过段落能量、旋律轮廓和节奏变化体现，不要把这些形容词写进歌词。phraseWeights 对应每句相对时长，按字数、停顿和句尾长音分配。SongPlan 负责和声与情绪，主副歌能量须体现意图，后续真实旋律将依据它生成。`,promptVersion:'2',validate:raw=>{
    const plan=freePlanSchema.parse(raw);
    if(input.bpm&&plan.bpm!==input.bpm)throw Error('规划器修改了用户速度');
    freeTimeline(input,plan,randomUUID);return plan;
   },
  });
  const plan=planning.value,model=planning.model;
  const timeline=freeTimeline(input,plan,randomUUID);onStage('melody');
  const result=await melody.compose({intent:input.intent,bpm:timeline.bpm,songPlan:plan.songPlan,phrases:timeline.phrases,source:'llm'});
  if(result.draft.source!=='llm')throw Error('正式模式拒绝本地替代结果');onStage('validated');
  return freeResultSchema.parse({requestId:randomUUID(),source:'llm',model,input,plan,sections:timeline.sections,draft:result.draft});
 }};
}
