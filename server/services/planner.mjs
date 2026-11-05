import {z} from 'zod';
import {planInputSchema,planOutputSchema,planResponseSchema} from '../../shared/song-plan.mjs';

// Dependency injection lets tests exercise the actual route and upstream parser
// using a local fixture server, without a real key or provider billing.
export function createPlanner({env=process.env,request=fetch}={}){
 let status=env.LLM_API_KEY?'unverified':'local';
 return {
  status:()=>status,
  async handle(req,res){
   const parsed=planInputSchema.safeParse(req.body);
   if(!parsed.success)return res.status(400).json({error:'灵感格式无效'});
   if(!env.LLM_API_KEY)return res.status(503).json({error:'未配置 LLM_API_KEY，请使用本地规则模式'});
   try{
    const model=env.LLM_MODEL||'gpt-4.1-mini';
    const response=await request(`${(env.LLM_BASE_URL||'https://api.openai.com/v1').replace(/\/$/,'')}/chat/completions`,{
     method:'POST',redirect:'error',signal:AbortSignal.timeout(30000),
     headers:{'Content-Type':'application/json',Authorization:`Bearer ${env.LLM_API_KEY}`},
     body:JSON.stringify({model,response_format:{type:'json_object'},temperature:.85,messages:[
      {role:'system',content:`你是中文原创短歌策划。根据用户的灵感和风格，决定可以真正执行的音乐方案。只输出符合以下 JSON Schema 的 JSON 对象，不要 Markdown：${JSON.stringify(z.toJSONSchema(planOutputSchema))}\n和弦数组为所选调式内的四个自然音阶级数，每小节一个；minor 为自然小调。情绪强度控制音符密度与力度。sectionEnergy 控制四段力度与节奏密度。reasons 用普通中文解释具体字段选择与用户描述的关系，不给代码或自由指令。歌词每句5到16字，不引用已有歌曲。你规划的是音符合成，不是生成歌唱音频。`},
      {role:'user',content:JSON.stringify(parsed.data)},
     ]}),
    });
    if(!response.ok)throw Error(`Upstream HTTP ${response.status}`);
    const body=await response.json(),output=planOutputSchema.parse(JSON.parse(body.choices?.[0]?.message?.content??''));
    const result=planResponseSchema.parse({...output,source:'llm',model});
    // A configured key is never proof of a working provider.
    if(res.locals){res.locals.metrics={model,promptTokens:Number(body.usage?.prompt_tokens)||0,completionTokens:Number(body.usage?.completion_tokens)||0,totalTokens:Number(body.usage?.total_tokens)||0};}
    status='verified';return res.json(result);
   }catch(e){status='unverified';console.error('LLM planning failed:',e.name);return res.status(502).json({error:'LLM 暂不可用或音乐方案校验失败；现有工程已保留，可选择本地规则继续创作。'});}
  },
 };
}
