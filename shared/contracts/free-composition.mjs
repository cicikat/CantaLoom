import {z} from 'zod';
import {songPlanSchema} from '../song-plan.mjs';
import {melodyDraftSchema} from './melody.mjs';
export const freeInputSchema=z.object({intent:z.string().trim().min(1).max(500),lyrics:z.array(z.string().min(1).max(100)).min(1).max(8).optional(),bpm:z.number().int().min(60).max(160).optional(),targetSeconds:z.number().min(20).max(30).default(25)}).strict();
export const freePlanSchema=z.object({title:z.string().min(1).max(30),mood:z.string().min(1).max(60),bpm:z.number().int().min(60).max(160),songPlan:songPlanSchema,lyrics:z.array(z.string().min(1).max(100)).min(1).max(8),phraseWeights:z.array(z.number().min(.5).max(4)).min(1).max(8)}).strict();
export const freeResultSchema=z.object({requestId:z.string(),source:z.literal('llm'),model:z.string(),input:freeInputSchema,plan:freePlanSchema,sections:z.array(z.object({id:z.string(),name:z.string(),start:z.number(),beats:z.number().int().min(4).max(64)})).length(4),draft:melodyDraftSchema});
