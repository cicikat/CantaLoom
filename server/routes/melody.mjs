import {melodyRequestSchema} from '../../shared/contracts/melody.mjs';
import {createMelodyComposer} from '../services/melody.mjs';
export function mountMelody(app){app.post('/api/melody',async(req,res)=>{const input=melodyRequestSchema.safeParse(req.body);if(!input.success)return res.status(400).json({error:'旋律请求无效'});try{const result=await createMelodyComposer().compose(input.data);res.locals.metrics=result.metrics;res.json(result)}catch{res.status(502).json({error:'旋律生成或校验失败，原工程保留；可明确选择本地规则。'})}})}
