import {productionJobSchema,productionInputSchema,type ProductionInput} from '../../shared/contracts/production.mjs';
import {z as schema} from 'zod';
import {pvRequestSchema,pvResultSchema,type PvProject} from '../../shared/contracts/pv.mjs';
import {freeInputSchema,freeResultSchema,type FreeInput} from '../../shared/contracts/free-composition.mjs';
import {melodyRequestSchema,melodyResponseSchema,type MelodyRequest} from '../../shared/contracts/melody.mjs';
import type {z} from 'zod';
import * as c from '../../shared/contracts/index.mjs';
import {mockRequest,mockMediaUrl} from './mock';
import {hasMockData} from './provenance';

export class ApiError extends Error {
 constructor(message:string,public status=0,public code?:string){super(message);this.name='ApiError'}
}
export interface ClientOptions {baseUrl?:string;mode?:'real'|'mock';request?:typeof fetch;timeoutMs?:number;onTask?:(task:c.GenerationTask)=>void}
export interface ExportLoudness {input:c.LoudnessReport;output:c.LoudnessReport;target:c.LoudnessReport&{lra:number}}
export interface ExportReport {loudness?:ExportLoudness;status:'measured'|'missing'|'invalid'|'mock'}
function exportReport(headers:Headers,mock:boolean):ExportReport{
 const raw=headers.get('X-Songyu-Loudness');
 if(!raw)return {status:mock?'mock':'missing'};
 try{const value=JSON.parse(raw),input=c.loudnessReportSchema.parse(value.input),output=c.loudnessReportSchema.parse(value.output),target=c.loudnessReportSchema.parse(value.target);if(typeof value.target.lra!=='number'||!Number.isFinite(value.target.lra))throw Error('Invalid LRA');return {status:mock?'mock':'measured',loudness:{input,output,target:{...target,lra:value.target.lra}}}}catch{return {status:'invalid'}}
}
export function createApiClient({baseUrl='',mode='real',request=fetch,timeoutMs,onTask}:ClientOptions={}){
 const mock=mode==='mock';
 const transport=mock?mockRequest:request;
 const url=(path:string)=>`${baseUrl.replace(/\/$/,'')}${path}`;
 async function send(path:string,body:unknown,timeout:number,kind?:c.GenerationTask['kind']){
  const publish=(state:c.GenerationTask['state'],error?:string)=>{if(kind)onTask?.(c.taskSchema.parse({kind,state,mock,...(error?{error}:{})}))};
  publish('running');
  // Timeout covers response bodies as well as headers; Mock and real share the same path.
  const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),timeoutMs??timeout);
  try{
   const response=await transport(url(path),{method:body===undefined?'GET':'POST',headers:body===undefined?undefined:{'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body),signal:controller.signal});
   if(!response.ok){const body=await response.json().catch(()=>null),error=c.errorSchema.safeParse(body);throw new ApiError(error.success?error.data.error:`请求失败 (${response.status})`,response.status,typeof body?.code==='string'?body.code:undefined)}
   const type=response.headers.get('content-type')||'';
   const result=type.includes('json')&&path!=='/api/export'?await response.json():await response.blob();
   return {result,publish,headers:response.headers};
  }catch(e){const error=e instanceof ApiError?e:new ApiError(controller.signal.aborted?'请求超时，请重试':e instanceof Error?e.message:'无法连接 API');publish('failed',error.message);throw error}
  finally{clearTimeout(timer)}
 }
 async function json<T>(path:string,schema:z.ZodType<T>,body?:unknown,timeout=15000,kind?:c.GenerationTask['kind']):Promise<T>{
  const {result,publish}=await send(path,body,timeout,kind);
  try{
   if(!mock&&hasMockData(result))throw new ApiError('真实模式拒绝 Mock 响应，当前工程已保留');
   const parsed=schema.parse(result);
   if(!mock&&hasMockData(parsed))throw new ApiError('真实模式拒绝 Mock 响应，当前工程已保留');
   if(mock&&/^\/api\/(compose|melody|production)(\/|$)/.test(path)&&!(parsed as {mock?:true})?.mock)throw new ApiError('Mock 响应缺少测试标记，当前工程已保留');
   publish('succeeded');return parsed;
  }catch(e){const error=e instanceof ApiError?e:new ApiError('API 响应格式无效，当前工程已保留');publish('failed',error.message);throw error}
 }
 return {
  mode,mock,
  health:()=>json('/api/health',c.healthSchema),
  plan:(input:z.infer<typeof c.planInputSchema>)=>json('/api/plan',c.planResponseSchema,c.planInputSchema.parse(input),35000,'plan'),
  startProduction:(input:ProductionInput)=>json('/api/production',productionJobSchema,productionInputSchema.parse(input)),
  pvStatus:()=>json('/api/pv/status',schema.object({available:schema.boolean(),width:schema.literal(1280),height:schema.literal(720),fps:schema.literal(24),maxSeconds:schema.literal(35),code:schema.string().optional(),mock:schema.literal(true).optional()})),
  pvDesign:(project:PvProject)=>json('/api/pv/design',pvResultSchema,pvRequestSchema.parse({project}),130000),
  production:(id:string)=>json('/api/production/'+encodeURIComponent(id),productionJobSchema),
  retryProduction:(id:string,lineId:string)=>json('/api/production/'+encodeURIComponent(id)+'/retry/'+encodeURIComponent(lineId),productionJobSchema,{},610000),
  compose:(input:FreeInput)=>json('/api/compose',freeResultSchema,freeInputSchema.parse(input),290000,'plan'),
  melody:(input:MelodyRequest)=>json('/api/melody',melodyResponseSchema,melodyRequestSchema.parse(input),190000,'plan'),
  engines:()=>json('/api/engines',c.enginesSchema),
  dictionary:()=>json('/api/singing/dictionary',c.dictionarySchema),
  qixuan:()=>json('/api/singing/qixuan',c.qixuanStatusSchema),
  instruments:(input:c.InstrumentInput)=>json('/api/instruments/render',c.instrumentResultSchema,c.instrumentInput.parse(input),130000,'instrument'),
  sing:(input:c.QixuanInput)=>json('/api/singing/qixuan/render',c.qixuanResultSchema,c.qixuanInput.parse(input),610000,'singing'),
  importSinging:(input:c.ImportInput)=>json('/api/singing/import',c.audioResultSchema,c.importInput.parse(input)),
  async artifact(file:string){c.artifactFileSchema.parse(file);const {result}=await send('/api/artifacts/'+encodeURIComponent(file),undefined,130000);if(!(result instanceof Blob))throw new ApiError('产物响应格式无效');return result},
  loudness:(file:string)=>{c.audioFileSchema.parse(file);return json('/api/artifacts/'+encodeURIComponent(file)+'/loudness',c.loudnessReportSchema,undefined,130000)},
  async audio(path:string){c.audioFileSchema.parse(path.replace(/^\/api\/audio\//,''));const {result}=await send(path,undefined,130000);return (result as Blob).arrayBuffer()},
  mediaUrl:(path:string)=>mock?mockMediaUrl(path):url(path),
  async exportVideo(input:c.VideoExportInput,onReport?:(report:ExportReport)=>void){const parsed=c.exportInput.parse(input);if(!mock&&hasMockData(parsed))throw new ApiError('真实模式拒绝 Mock 视觉数据');const {result,publish,headers}=await send('/api/export',parsed,180000,'export');const blob=result as Blob;if(!blob.type.includes(mock?'application/json':'video/mp4')){publish('failed','导出响应格式无效');throw new ApiError('导出响应格式无效')}publish('succeeded');onReport?.(exportReport(headers,mock));return blob},
 };
}
// Only public VITE_ values are read here. Server secrets never enter the bundle.
const env=import.meta.env;
export const api=createApiClient({mode:env?.DEV&&env.VITE_API_MODE==='mock'?'mock':'real',baseUrl:env?.VITE_API_BASE_URL||''});
