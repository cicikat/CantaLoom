import type {FreeInput} from './free-composition.mjs';
import type {GrooveSettings} from './groove.mjs';
import type {z} from 'zod';
export interface ProductionJob {mock?:true;id:string;state:'running'|'succeeded'|'failed';stage:string;error?:string;phraseId?:string;completedPhrases?:number;project?:unknown;composition?:unknown}
export const productionJobSchema:z.ZodType<ProductionJob>;
export const mixSettingsSchema:z.ZodType<{enabled:boolean;vocalGain?:number;bandGain?:number;reverb?:number}>;

export interface ProductionInput extends FreeInput {grooveSettings?:GrooveSettings}
export const productionInputSchema:z.ZodType<ProductionInput>;
