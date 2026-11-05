import {z} from 'zod';
import {renderQixuan,qixuanStatus} from '../services/qixuan.mjs';
import {qixuanResultSchema,qixuanStatusSchema} from '../../shared/contracts/index.mjs';
export function mountQixuan(app){app.get('/api/singing/qixuan',async(_req,res)=>res.json(qixuanStatusSchema.parse(await qixuanStatus())));app.post('/api/singing/qixuan/render',async(req,res)=>{try{res.json(qixuanResultSchema.parse(await renderQixuan(req.body)))}catch(e){res.status(e instanceof z.ZodError?400:503).json({error:e instanceof z.ZodError?'歌声参数无效':e.message.startsWith('外部引擎')?'OpenUtau 推理失败或超时，请检查引擎与声库依赖':e.message})}})}
