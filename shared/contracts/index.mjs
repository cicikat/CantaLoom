import {grooveSchema} from './groove.mjs';
export {grooveSchema} from './groove.mjs';
import {performanceSchema} from './melody.mjs';
import {z} from 'zod';
export {planInputSchema,planResponseSchema} from '../song-plan.mjs';

const mockFields={mock:z.literal(true).optional()};
export const errorSchema=z.object({error:z.string()});
export const healthSchema=z.object({ffmpeg:z.boolean(),llm:z.boolean(),llmStatus:z.enum(['local','unverified','verified']).default('local'),vocal:z.string().optional(),images:z.string().optional(),...mockFields});
const note=z.object({beat:z.number().min(0).max(256),duration:z.number().positive().max(64),midi:z.number().int().min(0).max(127),velocity:z.number().min(0).max(1),sound:z.enum(['kick','snare','hat']).optional()});
export const instrumentInput=z.object({bpm:z.number().min(40).max(240),kind:z.enum(['drums','bass','guitar','keys','melody']),notes:z.array(note.extend({locked:z.boolean().optional()})).max(512),groove:grooveSchema.optional(),locked:z.boolean().optional(),manuallyEdited:z.boolean().optional(),program:z.number().int().min(0).max(127).optional(),soundfont:z.string().max(200).optional(),endBeat:z.number().min(0).max(256)});
export const audioFileSchema=z.string().regex(/^[a-f0-9]{64}\.wav$/);
// Read-only creative artifacts: same 64-hex cache key, whitelisted suffixes (project MIDI, sung USTX, per-track WAV).
export const artifactFileSchema=z.string().regex(/^[a-f0-9]{64}\.(wav|mid|ustx)$/);
const audioUrl=z.string().regex(/^\/api\/audio\/[a-f0-9]{64}\.wav$/);
export const audioResultSchema=z.object({audioUrl,key:z.string().regex(/^[a-f0-9]{64}$/),...mockFields});
export const instrumentResultSchema=audioResultSchema.extend({providerId:z.literal('fluidsynth'),soundfont:z.string(),sampleRate:z.literal(48000),startSeconds:z.literal(0),cached:z.boolean()});
const parameters=z.object({steps:z.number(),depth:z.number()});
const runner=z.enum(['CPU','DirectML']);
// v0.4.0: engine-reported tuning capabilities, parsed from the installed singer/vocoder configs (not hard-coded).
const capabilities=z.object({curves:z.object({brec:z.boolean(),voic:z.boolean(),genc:z.boolean(),velc:z.boolean(),pexp:z.boolean(),shfc:z.boolean(),ene:z.boolean(),tenc:z.boolean()}),phonemeOverride:z.object({offset:z.boolean(),replace:z.boolean()}),unsupported:z.array(z.string())});
export const qixuanStatusSchema=z.discriminatedUnion('available',[
 z.object({available:z.literal(true),id:z.string(),version:z.string(),providerId:z.literal('openutau-diffsinger'),label:z.string(),engineVersion:z.string(),parameters,runners:z.array(runner).optional(),capabilities:capabilities.optional(),...mockFields}),
 z.object({available:z.literal(false),id:z.string(),version:z.string(),message:z.string(),...mockFields}),
]);
export const qixuanInput=z.object({lyricId:z.string().max(150),lyrics:z.string().min(1).max(100),start:z.number().min(0).max(256),end:z.number().positive().max(256),bpm:z.number().min(40).max(240),notes:z.array(note.omit({sound:true}).extend({syllable:z.string().max(20).optional()})).min(1).max(100),runner:runner.default('CPU'),take:z.number().int().min(0).max(10000).default(0),engineVersion:z.string().max(100),performance:performanceSchema.optional()}).strict();
export const qixuanResultSchema=audioResultSchema.extend({voiceId:z.string(),voiceVersion:z.string(),providerId:z.literal('openutau-diffsinger'),engineVersion:z.string(),renderParameters:parameters.extend({runner}),take:z.number().int(),isDemo:z.boolean(),cached:z.boolean(),startSeconds:z.number().nonnegative(),durationSeconds:z.number().positive().max(35),createdAt:z.string(),phonemes:z.array(z.string()).optional()}).refine(v=>v.isDemo===!!v.mock,{message:'Mock 音频必须显式标记 isDemo / mock'});
export const enginesSchema=z.object({instruments:z.object({installed:z.boolean(),ready:z.boolean(),soundfonts:z.array(z.string()),version:z.string().optional()}),singing:z.string(),...mockFields});
export const dictionarySchema=z.record(z.string(),z.string());
export const importInput=z.object({wav:z.string().max(11000000).regex(/^[A-Za-z0-9+/]+={0,2}$/),voice:z.object({id:z.string().min(1).max(120),version:z.string().min(1).max(120),providerId:z.enum(['openutau-exchange','diffsinger']),label:z.string().max(120)})});
const b64=z.string().regex(/^[A-Za-z0-9+/]+={0,2}$/);
export const exportInput=z.object({wav:b64.max(16000000),scenes:z.array(z.object({png:b64.max(2500000),duration:z.number().min(.5).max(30)})).length(4),duration:z.number().min(15).max(35),lyrics:z.array(z.object({text:z.string().max(100),start:z.number().min(0).max(35),end:z.number().min(0).max(35)})).max(32),style:z.enum(['cinema','poster','minimal']),title:z.string().max(200),singingCredit:z.enum(['demo','qixuan','external']).default('demo')});
// Lifecycle of one browser request. No invented server queue IDs or percentage progress.
export const taskSchema=z.object({kind:z.enum(['plan','instrument','singing','export']),state:z.enum(['running','succeeded','failed']),mock:z.boolean(),error:z.string().optional()});

export const loudnessReportSchema=z.object({integratedLufs:z.number().finite().nullable(),truePeakDbtp:z.number().finite().nullable()});
