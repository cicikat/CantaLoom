import type {FreeInput} from './free-composition.mjs';
import type {GrooveSettings} from './groove.mjs';
import type {z} from 'zod';
export interface ProductionJob {mock?:true;id:string;state:'running'|'succeeded'|'failed';stage:string;error?:string;errorCode?:'PERFORMANCE_PLANNING_FAILED';performancePlanning?:PerformancePlanning;phraseId?:string;completedPhrases?:number;project?:unknown;composition?:unknown}
export const productionJobSchema:z.ZodType<ProductionJob>;
export const mixSettingsSchema:z.ZodType<{enabled:boolean;vocalGain?:number;bandGain?:number;reverb?:number}>;

export interface ProductionInput extends FreeInput {grooveSettings?:GrooveSettings}
export const productionInputSchema:z.ZodType<ProductionInput>;

export interface PerformanceTrace {provider:string;model:string;promptVersion:string;attempts:number;promptTokens:number;completionTokens:number;milliseconds:number;cost:number|null;costCurrency:'USD'|null}
export interface PerformancePlanning {status:'disabled'|'running'|'succeeded'|'failed'|'skipped';trace?:PerformanceTrace}
export const performanceTraceSchema:z.ZodType<PerformanceTrace>;
export const performancePlanningSchema:z.ZodType<PerformancePlanning>;
