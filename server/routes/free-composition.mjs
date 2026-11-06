import {freeInputSchema} from '../../shared/contracts/free-composition.mjs';
import {createFreeComposer} from '../services/free-composition.mjs';
export function mountFreeComposition(app){app.post('/api/compose',async(req,res)=>{const input=freeInputSchema.safeParse(req.body);if(!input.success)return res.status(400).json({error:'自由创作输入无效'});try{const result=await createFreeComposer().compose(input.data,stage=>{if(res.locals.job)res.locals.job.stage=stage});res.json(result)}catch{res.status(502).json({error:'自由创作失败，未返回半成品；请保留现有工程后重试'})}})}
