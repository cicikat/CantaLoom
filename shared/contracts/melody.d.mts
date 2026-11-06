import type {z} from 'zod';
import type {SongPlan} from '../song-plan.mjs';
export interface Performance {mode?:'auto'|'manual';energy?:number;locked?:boolean;overrides?:({index:number;origin?:'auto'|'manual';locked?:boolean}&Omit<Performance,'overrides'|'mode'|'energy'|'preset'>)[];preset:'natural'|'soft'|'strong';transitionMs?:number;vibratoDepth?:number;dynamics?:number;consonantMs?:number}
export interface MelodyNote {id:string;beat:number;duration:number;midi:number;velocity:number;syllable:string;locked?:boolean}
export interface PhrasePlan {id:string;text:string;start:number;end:number;notes:MelodyNote[];motif:string;variationOf?:string;locked?:boolean;performance?:Performance}
export interface MelodyDraft {mock?:true;version:1;source:'llm'|'local-rules';phrases:PhrasePlan[]}
export interface MelodyRequest {intent:string;bpm:number;songPlan:SongPlan;phrases:{id:string;text:string;start:number;end:number;notes:MelodyNote[];locked?:boolean;performance?:Performance}[];targetIds?:string[];source?:'llm'|'local-rules'}
export interface MelodyResponse {mock?:true;draft:MelodyDraft;model?:string;metrics?:{milliseconds:number;promptTokens:number;completionTokens:number}}
export const performanceSchema:z.ZodType<Performance>;
export const melodyNoteSchema:z.ZodType<MelodyNote>;
export const phraseSchema:z.ZodType<PhrasePlan>;
export const melodyDraftSchema:z.ZodType<MelodyDraft>;
export const melodyRequestSchema:z.ZodType<MelodyRequest>;
export const melodyResponseSchema:z.ZodType<MelodyResponse>;
