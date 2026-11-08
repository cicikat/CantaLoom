import {pvRequestSchema,pvResultSchema,pvFingerprint,type PvDesign} from '../../shared/contracts/pv.mjs';
export type MockPvScenario='success'|'failure'|'unavailable'|'invalid-fingerprint';
export function createMockPvRoutes(scenario:MockPvScenario='success'){
 return async(path:string,body:unknown):Promise<Response|undefined>=>{
  if(path==='/api/pv/status')return Response.json({mock:true,available:scenario!=='unavailable',width:1280,height:720,fps:24,maxSeconds:35,...(scenario==='unavailable'?{code:'PV_CHROMIUM_UNAVAILABLE'}:{})});
  if(path!=='/api/pv/design')return;
  if(scenario==='failure'||scenario==='unavailable')return Response.json({code:scenario==='unavailable'?'PV_NOT_CONFIGURED':'PV_PLANNING_FAILED',error:'MOCK 视觉模型未配置或设计失败，原设计保留'},{status:scenario==='unavailable'?503:502});
  try{
   const {project}=pvRequestSchema.parse(body);
   // Fixed scene fixture: no model call, no arbitrary HTML, no real trace.
   const pvDesign:PvDesign={version:1,canvas:{width:1280,height:720},scenes:project.sections.map((s,i)=>({sectionId:s.id,background:{colors:['#101e38','#539bab'],angle:120},layers:[{id:`mock-shape-${i}`,type:'shape',shape:'circle',x:.3,y:.3,width:.3,height:.4,color:'#b6e5ef',opacity:.7,scale:1,rotate:0,keyframes:[{at:0,x:.2},{at:1,x:.8}]},{id:`mock-lyric-${i}`,type:'text',textSource:'current_lyric',fontSize:54,align:'center',x:.5,y:.7,width:.9,height:.2,color:'#ffffff',opacity:1,scale:1,rotate:0,keyframes:[{at:0,scale:.95},{at:1,scale:1.05}]}]}))};
   return Response.json(pvResultSchema.parse({source:'mock',mock:true,inputFingerprint:scenario==='invalid-fingerprint'?'0'.repeat(64):await pvFingerprint(project),pvDesign}));
  }catch{return Response.json({code:'PV_INPUT_INVALID',error:'MOCK PV 工程快照无效'},{status:400})}
 };
}
