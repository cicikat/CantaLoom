import {createTaskRouter,routesSchema} from './llm-router.mjs';
import {pvRequestSchema,pvDesignSchema,pvResultSchema,validatePvBinding,pvFingerprint} from '../../shared/contracts/pv.mjs';
export function createPvPlanner({env=process.env,request=fetch}={}){return {async design(raw){
 const {project}=pvRequestSchema.parse(raw);let routes;try{routes=routesSchema.parse(JSON.parse(env.LLM_ROUTES||'{}'))}catch{throw Object.assign(Error('视觉模型路由配置无效'),{code:'PV_NOT_CONFIGURED'})}
 if(!routes.pv_design||!env[routes.pv_design.keyRef])throw Object.assign(Error('请先配置独立 PV 视觉模型路由'),{code:'PV_NOT_CONFIGURED'});
 const result=await createTaskRouter({env,request}).run('pv_design',{schema:pvDesignSchema,input:project,promptVersion:'1',timeout:90000,system:'你是原创音乐PV视觉导演。设计自由组合的HTML/CSS/SVG场景树，不选择固定模板，不输出代码。根据歌词意象、情绪、能量、节拍安排不同层与动态关键帧；四段sectionId按输入顺序精确保持。每段恰好一个current_lyric文字层，文字只由可信工程绑定。关键帧at归一化且从0到1，位置与尺寸归一化。图层id全局唯一，所有必需字段完整。不得改写歌词或时间轴，不输出URL/HTML/脚本/CSS。',validate:raw=>validatePvBinding(project,raw).design});
 return pvResultSchema.parse({source:'llm',inputFingerprint:await pvFingerprint(project),pvDesign:result.value,trace:result.trace});
}}}
