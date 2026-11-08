import type {PvProject,PvDesign} from './pv.mjs';
import type {Groove} from './groove.mjs';
export {grooveSchema} from './groove.mjs';
export type {Groove} from './groove.mjs';
import type {Performance} from './melody.mjs';
import type {z} from 'zod';
import type {MidiNote} from '../midi.mjs';
export {planInputSchema,planResponseSchema} from '../song-plan.mjs';
export type MockTag={mock?:true};
export interface Health extends MockTag {ffmpeg:boolean;llm:boolean;llmStatus:'local'|'unverified'|'verified';vocal?:string;images?:string}
export interface RenderNote extends MidiNote {syllable?:string}
export interface InstrumentInput {bpm:number;kind:'drums'|'bass'|'guitar'|'keys'|'melody';notes:RenderNote[];groove?:Groove;locked?:boolean;manuallyEdited?:boolean;program?:number;soundfont?:string;endBeat:number}
export interface AudioResult extends MockTag {audioUrl:string;key:string}
export interface InstrumentResult extends AudioResult {providerId:'fluidsynth';soundfont:string;sampleRate:48000;startSeconds:0;cached:boolean}
export type Runner='CPU'|'DirectML';
export interface VoiceParameters {steps:number;depth:number}
export interface QixuanCapabilities {curves:{brec:boolean;voic:boolean;genc:boolean;velc:boolean;pexp:boolean;shfc:boolean;ene:boolean;tenc:boolean};phonemeOverride:{offset:boolean;replace:boolean};unsupported:string[]}
export interface AvailableQixuan extends MockTag {available:true;id:string;version:string;providerId:'openutau-diffsinger';label:string;engineVersion:string;parameters:VoiceParameters;runners?:Runner[];capabilities?:QixuanCapabilities}
export type QixuanStatus=AvailableQixuan|({available:false;id:string;version:string;message:string}&MockTag);
export interface QixuanInput {lyricId:string;lyrics:string;start:number;end:number;bpm:number;notes:RenderNote[];runner?:Runner;take?:number;engineVersion:string;performance?:Performance}
export interface QixuanResult extends AudioResult {voiceId:string;voiceVersion:string;providerId:'openutau-diffsinger';engineVersion:string;renderParameters:VoiceParameters&{runner:Runner};take:number;isDemo:boolean;cached:boolean;startSeconds:number;durationSeconds:number;createdAt:string;phonemes?:string[]}
export interface Engines extends MockTag {instruments:{installed:boolean;ready:boolean;soundfonts:string[];version?:string};singing:string}
export interface ImportInput {wav:string;voice:{id:string;version:string;providerId:'openutau-exchange'|'diffsinger';label:string}}
export interface CanvasExportInput {visualMode?:'canvas';wav:string;scenes:{png:string;duration:number}[];duration:number;lyrics:{text:string;start:number;end:number}[];style:'cinema'|'poster'|'minimal';title:string;singingCredit?:'demo'|'qixuan'|'external'}
export type HtmlExportInput=Omit<CanvasExportInput,'scenes'|'visualMode'>&{visualMode:'html';pvProject:PvProject;pvDesign:PvDesign;inputFingerprint:string};
// Existing Client remains Canvas-only until the Toge integration.
export type ExportInput=CanvasExportInput;
export type VideoExportInput=CanvasExportInput|HtmlExportInput;
export const htmlExportInput:z.ZodType<HtmlExportInput>;
export const canvasExportInput:z.ZodType<CanvasExportInput>;
export interface GenerationTask {kind:'plan'|'instrument'|'singing'|'export';state:'running'|'succeeded'|'failed';mock:boolean;error?:string}
export const errorSchema:z.ZodType<{error:string}>;
export const healthSchema:z.ZodType<Health>;
export const instrumentInput:z.ZodType<InstrumentInput>;
export const audioFileSchema:z.ZodType<string>;
export const artifactFileSchema:z.ZodType<string>;
export const audioResultSchema:z.ZodType<AudioResult>;
export const instrumentResultSchema:z.ZodType<InstrumentResult>;
export const qixuanStatusSchema:z.ZodType<QixuanStatus>;
export const qixuanInput:z.ZodType<QixuanInput>;
export const qixuanResultSchema:z.ZodType<QixuanResult>;
export const enginesSchema:z.ZodType<Engines>;
export const dictionarySchema:z.ZodType<Record<string,string>>;
export const importInput:z.ZodType<ImportInput>;
export const exportInput:z.ZodType<VideoExportInput>;
export const taskSchema:z.ZodType<GenerationTask>;

export interface LoudnessReport {integratedLufs:number|null;truePeakDbtp:number|null}
export const loudnessReportSchema:z.ZodType<LoudnessReport>;
