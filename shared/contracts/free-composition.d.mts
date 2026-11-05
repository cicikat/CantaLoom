import type {z} from 'zod';
import type {SongPlan} from '../song-plan.mjs';
import type {MelodyDraft} from './melody.mjs';
export interface FreeInput {intent:string;lyrics?:string[];bpm?:number;targetSeconds?:number}
export interface FreePlan {title:string;mood:string;bpm:number;songPlan:SongPlan;lyrics:string[];phraseWeights:number[]}
export interface FreeResult {requestId:string;source:'llm';model:string;input:FreeInput;plan:FreePlan;sections:{id:string;name:string;start:number;beats:number}[];draft:MelodyDraft}
export const freeInputSchema:z.ZodType<FreeInput>;
export const freePlanSchema:z.ZodType<FreePlan>;
export const freeResultSchema:z.ZodType<FreeResult>;
