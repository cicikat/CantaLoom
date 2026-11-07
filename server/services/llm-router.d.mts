import type {z} from 'zod';
export type LlmTask='lyrics_planning'|'melody_composition'|'performance_planning';
export interface TaskRoute {provider:string;baseUrl:string;model:string;keyRef:string;temperature:number;systemPrompt?:string;inputPerMillion?:number;outputPerMillion?:number}
export interface TaskTrace {task:LlmTask;provider:string;model:string;promptVersion:string;attempts:number;promptTokens:number;completionTokens:number;milliseconds:number;cost:number|null;costCurrency:'USD'|null}
export type TaskHistory=TaskTrace&{at:string;state:'succeeded'|'failed';reason?:string};
export interface AdminLlmResponse {routes:Record<LlmTask,TaskRoute&{keyConfigured:boolean}>;history:TaskHistory[]}
export const taskNames:LlmTask[];
export const taskRouteSchema:z.ZodType<TaskRoute>;
export const routesSchema:z.ZodType<Partial<Record<LlmTask,TaskRoute>>>;
export function resolveRoute(env:Record<string,string|undefined>,task:LlmTask):TaskRoute;
export function isTaskConfigured(env:Record<string,string|undefined>,task:LlmTask):boolean;
export function routingHistory():TaskHistory[];
export function createTaskRouter(options?:{env?:Record<string,string|undefined>;request?:typeof fetch}):{
 run<T>(task:LlmTask,options:{schema:z.ZodType<T>;input:unknown;system:string;validate?:(value:unknown)=>T;attempts?:number;promptVersion?:string;timeout?:number}):Promise<{value:T;model:string;trace:TaskTrace}>;
};
