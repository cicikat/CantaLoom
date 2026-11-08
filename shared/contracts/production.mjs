import {freeInputSchema} from './free-composition.mjs';
import {grooveSettingsSchema} from './groove.mjs';
import {z} from 'zod';
export const productionInputSchema=freeInputSchema.extend({grooveSettings:grooveSettingsSchema.optional()});
export const performanceTraceSchema=z.object({
 provider:z.string().min(1).max(80),model:z.string().min(1).max(100),
 promptVersion:z.string().regex(/^performance_planning\/[A-Za-z0-9._-]{1,40}\/[a-f0-9]{16}$/),
 attempts:z.number().int().min(1).max(3),promptTokens:z.number().int().nonnegative(),completionTokens:z.number().int().nonnegative(),milliseconds:z.number().int().nonnegative(),
 cost:z.number().nonnegative().nullable(),costCurrency:z.literal('USD').nullable(),
}).strict();
export const performancePlanningSchema=z.object({status:z.enum(['disabled','running','succeeded','failed','skipped']),trace:performanceTraceSchema.optional()}).strict().refine(v=>!v.trace||v.status==='succeeded',{message:'只有成功规划可返回成功追溯'});
export const productionJobSchema=z.object({mock:z.literal(true).optional(),id:z.string().uuid(),state:z.enum(['running','succeeded','failed']),stage:z.enum(['queued','checking','composing','planning','melody','validated','instruments','singing','ready-for-mix']),error:z.string().optional(),errorCode:z.literal('PERFORMANCE_PLANNING_FAILED').optional(),performancePlanning:performancePlanningSchema.optional(),phraseId:z.string().optional(),completedPhrases:z.number().optional(),project:z.unknown().optional(),composition:z.unknown().optional()});
export const mixSettingsSchema=z.object({enabled:z.boolean(),vocalGain:z.number().min(0).max(2).optional(),bandGain:z.number().min(0).max(2).optional(),reverb:z.number().min(0).max(.25).optional()}).strict();
