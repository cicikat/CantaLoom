import {z} from 'zod';

// Shared executable contract: no arbitrary pitches, code or model instructions.
export const songPlanSchema = z.strictObject({
  key:z.strictObject({tonic:z.enum(['C','D','E','F','G','A','B']),mode:z.enum(['major','minor'])}),
  emotion:z.enum(['calm','melancholic','bright','driving']),
  intensity:z.number().min(0).max(1),
  chordProgression:z.tuple([z.number().int().min(1).max(7),z.number().int().min(1).max(7),z.number().int().min(1).max(7),z.number().int().min(1).max(7)]),
  drumDensity:z.enum(['sparse','steady','busy']),
  melodyContour:z.enum(['rising','falling','arch','level']),
  melodyRange:z.enum(['narrow','medium','wide']),
  sectionEnergy:z.strictObject({intro:z.number().min(.2).max(1),verse:z.number().min(.2).max(1),chorus:z.number().min(.2).max(1),outro:z.number().min(.2).max(1)}),
  reasons:z.array(z.strictObject({decision:z.enum(['key','harmony','drums','melody','energy']),reason:z.string().trim().min(1).max(120)})).min(1).max(5),
});
export const planInputSchema=z.strictObject({idea:z.string().trim().min(1).max(200),style:z.enum(['海盐汽水','深夜漫游','橘子摇滚'])});
export const planOutputSchema=z.strictObject({title:z.string().trim().min(1).max(30),mood:z.string().trim().min(1).max(60),lyrics:z.array(z.string().trim().min(1).max(40)).length(4),songPlan:songPlanSchema});
export const planResponseSchema=planOutputSchema.extend({source:z.literal('llm'),model:z.string().min(1).max(100),mock:z.literal(true).optional()});
export const planningSchema=z.strictObject({source:z.enum(['llm','local-rules']),model:z.string().max(100).optional(),appliedAt:z.string().datetime(),compatibility:z.array(z.string().max(200)).max(8),mock:z.literal(true).optional()});
