import {createTaskRouter,TaskError} from './llm-router.mjs';
import {randomUUID} from 'node:crypto';
import {z} from 'zod';
import {freeInputSchema,freePlanSchema,freeResultSchema} from '../../shared/contracts/free-composition.mjs';
import {freeTimeline} from '../../shared/free-timeline.mjs';
import {createMelodyComposer} from './melody.mjs';

const planningDraftV1=freePlanSchema.extend({version:z.literal(1)});
export function createFreeComposer({env=process.env,request=fetch,melody=createMelodyComposer({env,request})}={}){
 return {async compose(raw,onStage=()=>{},checkpoint={},save=()=>{}){
  const input=freeInputSchema.parse(raw);
  if(!checkpoint.plan){
   onStage('planning');
   const schema=planningDraftV1.pick({version:true,title:true,mood:true,songPlan:true,phraseWeights:true,bpm:!input.bpm,lyrics:!input.lyrics});
   const planning=await createTaskRouter({env,request}).run('lyrics_planning',{
    schema,input,attempts:3,promptVersion:'free-v1',
    system:'创作原创中文短歌。用户给出的歌词和 BPM 由服务端保留，禁止回显已给字段。未给歌词时创作 1–8 句长短不齐的歌词，总字数宜 18–38。phraseWeights 每句一个，按字数、停顿和长音分配。用调性、和声、段落能量体现意图。不要把意图复述成标题或歌词。',
    validate:raw=>{
     const {version,...draft}=raw;
     const plan=freePlanSchema.parse({...draft,bpm:input.bpm??draft.bpm,lyrics:input.lyrics??draft.lyrics});
     try{freeTimeline(input,plan,randomUUID)}
     catch(error){throw new TaskError('SEMANTIC_VALIDATION_FAILED',error.message)}
     return plan;
    },
   });
   const timeline=freeTimeline(input,planning.value,randomUUID);
   save(Object.assign(checkpoint,{plan:planning.value,timeline,planningTrace:planning.trace}));
  }
  if(!checkpoint.draft){
   onStage('melody');
   const result=await melody.compose({intent:input.intent,bpm:checkpoint.timeline.bpm,songPlan:checkpoint.plan.songPlan,phrases:checkpoint.timeline.phrases,source:'llm'},{compact:true});
   if(result.draft.source!=='llm')throw Error('正式模式拒绝本地替代结果');
   save(Object.assign(checkpoint,{draft:result.draft,melodyTrace:result.trace}));
  }
  onStage('validated');
  return freeResultSchema.parse({requestId:randomUUID(),source:'llm',model:checkpoint.planningTrace.model,input,plan:checkpoint.plan,sections:checkpoint.timeline.sections,draft:checkpoint.draft});
 }};
}
