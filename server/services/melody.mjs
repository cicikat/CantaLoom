import {z} from 'zod';
import {melodyRequestSchema,melodyDraftSchema,melodyResponseSchema} from '../../shared/contracts/melody.mjs';
import {validateMelody,localMelody} from '../../shared/melody.mjs';
export function createMelodyComposer({env=process.env,request=fetch}={}){
 return {async compose(raw){
  const input=melodyRequestSchema.parse(raw);if(input.source==='local-rules')return {draft:localMelody(input)};
  if(!env.LLM_API_KEY)throw Error('未配置 LLM，请明确选择本地规则');
  const started=performance.now(),model=env.LLM_MODEL||'gpt-4.1-mini';
  const system=`你是中文原创短歌旋律作曲者。只输出符合 JSON Schema 的对象：${JSON.stringify(z.toJSONSchema(melodyDraftSchema))}。source 必须 llm。输入已有宏观 songPlan，不要改和弦调性。所有乐句使用绝对 beat，保持 ID/start/end/顺序。用户提供 text 时逐字保留；空 text 时原创中文歌词，不能模板替换。输出真实可唱音符：重复音、跳进、非均匀时值、句内休止、长音、同字多音用 + 且紧接前音符。syllable 必须按中文字符逐个对应（忽略标点）。不要等分整句，不要连续音阶。强拍（beat 为偶数）落在当前小节和弦三和弦音，其余音在调内；和弦按全曲 beat 每4拍轮换。MIDI48到84。用 motif 说明动机，variationOf 引用另一句 ID 表示变化。非目标句和 locked 整句的 notes/text 原样返回；所有 locked 音符逐字段保留，其余音符绕开它们补全，不得重叠。保持 performance、锁定标记。短句适度留白。`;
  let last;for(let attempt=0;attempt<2;attempt++){
   try{const response=await request(`${(env.LLM_BASE_URL||'https://api.openai.com/v1').replace(/\/$/,'')}/chat/completions`,{method:'POST',redirect:'error',signal:AbortSignal.timeout(90000),headers:{'Content-Type':'application/json',Authorization:`Bearer ${env.LLM_API_KEY}`},body:JSON.stringify({model,response_format:{type:'json_object'},temperature:.8,messages:[{role:'system',content:system},{role:'user',content:JSON.stringify(input)},...(attempt?[{role:'user',content:`上一结果未通过本地音乐校验：${last}。请重新输出完整对象并修复，不改变用户歌词及锁定音符。`}]:[])]})});
    if(!response.ok)throw Error('上游请求失败');const body=await response.json(),draft=validateMelody(input,JSON.parse(body.choices?.[0]?.message?.content||''));if(draft.source!=='llm')throw Error('来源标记错误');
    return melodyResponseSchema.parse({draft,model,metrics:{milliseconds:Math.round(performance.now()-started),promptTokens:Number(body.usage?.prompt_tokens)||0,completionTokens:Number(body.usage?.completion_tokens)||0}});
   }catch(e){last=e instanceof z.ZodError?'JSON 字段不符合 Schema':e.message;if(!['上游请求失败'].includes(last)&&attempt===0)continue;throw Error('旋律生成或音乐校验失败，原工程保留')}
  }
 }};
}
