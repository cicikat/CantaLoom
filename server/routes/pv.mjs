import {createPvPlanner} from '../services/pv.mjs';
import {pvRequestSchema} from '../../shared/contracts/pv.mjs';
import {pvRenderStatus} from '../services/pv-render.mjs';
export function mountPv(app,options={}){const planner=createPvPlanner(options);let busy=false;
 app.get('/api/pv/status',async(_req,res)=>res.set('Cache-Control','no-store').json(await pvRenderStatus()));
 app.post('/api/pv/design',async(req,res)=>{const parsed=pvRequestSchema.safeParse(req.body);if(!parsed.success)return res.status(400).json({code:'PV_INPUT_INVALID',error:'PV 工程快照无效'});if(busy)return res.status(429).json({code:'PV_BUSY',error:'已有视觉规划正在进行'});busy=true;try{res.json(await planner.design(parsed.data))}catch(e){const missing=e.code==='PV_NOT_CONFIGURED';res.status(missing?503:502).json({code:missing?'PV_NOT_CONFIGURED':'PV_PLANNING_FAILED',error:missing?'请检查独立 PV 模型路由配置':'视觉规划失败，原 Canvas PV 仍可使用'})}finally{busy=false}});
}
