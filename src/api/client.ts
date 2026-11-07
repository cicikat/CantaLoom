import {productionJobSchema} from '../../shared/contracts/production.mjs';
import {freeInputSchema,freeResultSchema,type FreeInput} from '../../shared/contracts/free-composition.mjs';
import {melodyRequestSchema,melodyResponseSchema,type MelodyRequest} from '../../shared/contracts/melody.mjs';
import type {z} from 'zod';
import * as c from '../../shared/contracts/index.mjs';
import {mockRequest,mockMediaUrl} from './mock';
import {hasMockData} from './provenance';

export class ApiError extends Error {
 constructor(message:string,public status=0){super(message);this.name='ApiError'}
}
export interface ClientOptions {baseUrl?:string;mode?:'real'|'mock';request?:typeof fetch;timeoutMs?:number;onTask?:(task:c.GenerationTask)=>void}
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
   if(!response.ok){const error=c.errorSchema.safeParse(await response.json().catch(()=>null));throw new ApiError(error.success?error.data.error:`请求失败 (${response.status})`,response.status)}
   const type=response.headers.get('content-type')||'';
   const result=type.includes('json')&&path!=='/api/export'?await response.json():await response.blob();
   return {result,publish};
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
  startProduction:(input:FreeInput)=>json('/api/production',productionJobSchema,freeInputSchema.parse(input)),
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
  async audio(path:string){c.audioFileSchema.parse(path.replace(/^\/api\/audio\//,''));const {result}=await send(path,undefined,130000);return (result as Blob).arrayBuffer()},
  mediaUrl:(path:string)=>mock?mockMediaUrl(path):url(path),
  async exportVideo(input:c.ExportInput){const {result,publish}=await send('/api/export',c.exportInput.parse(input),180000,'export');const blob=result as Blob;if(!blob.type.includes(mock?'application/json':'video/mp4')){publish('failed','导出响应格式无效');throw new ApiError('导出响应格式无效')}publish('succeeded');return blob},
 };
}
// Only public VITE_ values are read here. Server secrets never enter the bundle.
const env=import.meta.env;
export const api=createApiClient({mode:env?.DEV&&env.VITE_API_MODE==='mock'?'mock':'real',baseUrl:env?.VITE_API_BASE_URL||''});
