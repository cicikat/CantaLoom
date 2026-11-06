import type {z} from 'zod';
export interface ProductionJob {id:string;state:'running'|'succeeded'|'failed';stage:string;error?:string;phraseId?:string;completedPhrases?:number;project?:unknown;composition?:unknown}
export const productionJobSchema:z.ZodType<ProductionJob>;
export const mixSettingsSchema:z.ZodType<{enabled:boolean;vocalGain?:number;bandGain?:number;reverb?:number}>;
