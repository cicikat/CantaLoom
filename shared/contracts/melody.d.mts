import type {z} from 'zod';
import type {SongPlan} from '../song-plan.mjs';
export interface PitchPoint {x:number;y:number;shape:'io'|'i'|'o'|'l'}
export interface PhonemeEdit {index:number;offsetMs?:number;phoneme?:string}
export interface CurvePoint {x:number;y:number}
export type ExpressionAbbr='brec'|'voic'|'genc'|'velc'|'pexp'|'shfc';
export interface ExpressionCurve {abbr:ExpressionAbbr;points:CurvePoint[]}
export interface Performance {mode?:'auto'|'manual';energy?:number;locked?:boolean;overrides?:({index:number;origin?:'auto'|'manual';locked?:boolean;pitch?:PitchPoint[];phonemes?:PhonemeEdit[];vibratoLength?:number;vibratoPeriod?:number;vibratoIn?:number;vibratoOut?:number;vibratoDrift?:number;vibratoVolLink?:number}&Omit<Performance,'overrides'|'mode'|'energy'|'preset'|'dynCurve'|'curves'>)[];dynCurve?:CurvePoint[];curves?:ExpressionCurve[];preset:'natural'|'soft'|'strong';transitionMs?:number;vibratoDepth?:number;dynamics?:number;consonantMs?:number}
export interface MelodyNote {id:string;beat:number;duration:number;midi:number;velocity:number;syllable:string;locked?:boolean}
export interface PhrasePlan {id:string;text:string;start:number;end:number;notes:MelodyNote[];motif:string;variationOf?:string;locked?:boolean;performance?:Performance}
export interface MelodyDraft {mock?:true;version:1;source:'llm'|'local-rules';phrases:PhrasePlan[]}
export interface MelodyRequest {intent:string;bpm:number;songPlan:SongPlan;phrases:{id:string;text:string;start:number;end:number;notes:MelodyNote[];locked?:boolean;performance?:Performance}[];targetIds?:string[];source?:'llm'|'local-rules'}
export interface MelodyResponse {mock?:true;draft:MelodyDraft;model?:string;metrics?:{milliseconds:number;promptTokens:number;completionTokens:number}}
export const pitchPointSchema:z.ZodType<PitchPoint>;
export const pitchCurveSchema:z.ZodType<PitchPoint[]>;
export const phonemeEditSchema:z.ZodType<PhonemeEdit>;
export const dynCurveSchema:z.ZodType<CurvePoint[]>;
export const curveRanges:Record<ExpressionAbbr,[number,number]>;
export const expressionCurveSchema:z.ZodType<ExpressionCurve>;
export const performanceSchema:z.ZodType<Performance>;
export const melodyNoteSchema:z.ZodType<MelodyNote>;
export const phraseSchema:z.ZodType<PhrasePlan>;
export const melodyDraftSchema:z.ZodType<MelodyDraft>;
export const melodyRequestSchema:z.ZodType<MelodyRequest>;
export const melodyResponseSchema:z.ZodType<MelodyResponse>;
