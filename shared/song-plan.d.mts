import type {z} from 'zod';
export interface SongPlan {
 key:{tonic:'C'|'D'|'E'|'F'|'G'|'A'|'B';mode:'major'|'minor'};
 emotion:'calm'|'melancholic'|'bright'|'driving';intensity:number;
 chordProgression:[number,number,number,number];
 drumDensity:'sparse'|'steady'|'busy';melodyContour:'rising'|'falling'|'arch'|'level';melodyRange:'narrow'|'medium'|'wide';
 sectionEnergy:{intro:number;verse:number;chorus:number;outro:number};
 reasons:{decision:'key'|'harmony'|'drums'|'melody'|'energy';reason:string}[];
}
export interface PlanOutput {title:string;mood:string;lyrics:string[];songPlan:SongPlan}
export interface PlanResponse extends PlanOutput {source:'llm';model:string}
export interface Planning {source:'llm'|'local-rules';model?:string;appliedAt:string;compatibility:string[]}
export const songPlanSchema:z.ZodType<SongPlan>;
export const planInputSchema:z.ZodType<{idea:string;style:'海盐汽水'|'深夜漫游'|'橘子摇滚'}>;
export const planOutputSchema:z.ZodType<PlanOutput>;
export const planResponseSchema:z.ZodType<PlanResponse>;
export const planningSchema:z.ZodType<Planning>;
