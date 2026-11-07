import {createTaskRouter,resolveRoute} from './llm-router.mjs';
import {planInputSchema,planOutputSchema,planResponseSchema} from '../../shared/song-plan.mjs';

// Dependency injection lets tests exercise the actual route and upstream parser
// using a local fixture server, without a real key or provider billing.
export function createPlanner({env=process.env,request=fetch}={}){
 let status='local';try{if(env[resolveRoute(env,'lyrics_planning').keyRef])status='unverified'}catch{status='unverified'}
 return {
  status:()=>status,
  async handle(req,res){
   const parsed=planInputSchema.safeParse(req.body);
   if(!parsed.success)return res.status(400).json({error:'灵感格式无效'});
   if(!env.LLM_API_KEY&&!env.LLM_ROUTES)return res.status(503).json({error:'未配置 LLM_API_KEY，请使用本地规则模式'});
   try{
    const routed=await createTaskRouter({env,request}).run('lyrics_planning',{
     schema:planOutputSchema,input:parsed.data,system:`你是中文原创短歌策划。根据用户的灵感和风格，决定可以真正执行的音乐方案。只输出符合以下 JSON Schema 的 JSON 对象，不要 Markdown：（由任务路由附带的 Schema）\n和弦数组为所选调式内的四个自然音阶级数，每小节一个；minor 为自然小调。情绪强度控制音符密度与力度。sectionEnergy 控制四段力度与节奏密度。reasons 用普通中文解释具体字段选择与用户描述的关系，不给代码或自由指令。歌词每句5到16字，不引用已有歌曲。你规划的是音符合成，不是生成歌唱音频。`,promptVersion:'legacy-1',timeout:30000,
    });
    const result=planResponseSchema.parse({...routed.value,source:'llm',model:routed.model});
    if(res.locals)res.locals.metrics=routed.trace;
    // A configured key is never proof of a working provider.
    status='verified';return res.json(result);
   }catch(e){status='unverified';console.error('LLM planning failed:',e.name);return res.status(502).json({error:'LLM 暂不可用或音乐方案校验失败；现有工程已保留，可选择本地规则继续创作。'});}
  },
 };
}
