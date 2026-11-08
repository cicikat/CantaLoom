import {freeInputSchema} from './free-composition.mjs';
import {grooveSettingsSchema} from './groove.mjs';
import {z} from 'zod';
export const productionInputSchema=freeInputSchema.extend({grooveSettings:grooveSettingsSchema.optional()});
export const productionJobSchema=z.object({mock:z.literal(true).optional(),id:z.string().uuid(),state:z.enum(['running','succeeded','failed']),stage:z.enum(['queued','checking','composing','planning','melody','validated','instruments','singing','ready-for-mix']),error:z.string().optional(),phraseId:z.string().optional(),completedPhrases:z.number().optional(),project:z.unknown().optional(),composition:z.unknown().optional()});
export const mixSettingsSchema=z.object({enabled:z.boolean(),vocalGain:z.number().min(0).max(2).optional(),bandGain:z.number().min(0).max(2).optional(),reverb:z.number().min(0).max(.25).optional()}).strict();
