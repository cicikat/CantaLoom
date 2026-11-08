import type {z} from 'zod';
export interface PvProject {id:string;title:string;idea:string;mood:string;bpm:number;sections:{id:string;start:number;beats:number;energy:number}[];lyrics:{id:string;text:string;start:number;end:number}[];pulses:{beat:number;strength:number}[]}
export interface PvFrame {at:number;x?:number;y?:number;opacity?:number;scale?:number;rotate?:number}
interface LayerBase {id:string;x:number;y:number;width:number;height:number;color:string;opacity:number;scale:number;rotate:number;keyframes:PvFrame[]}
export type PvLayer=LayerBase&({type:'shape';shape:'circle'|'rect'|'triangle'}|{type:'particles';seed:number;count:number;motion:'fall'|'orbit'}|{type:'text';textSource:'title'|'current_lyric';fontSize:number;align:'left'|'center'|'right'});
export interface PvDesign {version:1;canvas:{width:1280;height:720};scenes:{sectionId:string;background:{colors:string[];angle:number};layers:PvLayer[]}[]}
export interface PvTrace {task:'pv_design';provider:string;model:string;promptVersion:string;attempts:number;promptTokens:number;completionTokens:number;milliseconds:number;cost:number|null;costCurrency:'USD'|null}
export interface PvResult {mock?:true;source:'llm'|'mock';inputFingerprint:string;pvDesign:PvDesign;trace?:PvTrace}
export const pvProjectSchema:z.ZodType<PvProject>;export const pvDesignSchema:z.ZodType<PvDesign>;export const pvRequestSchema:z.ZodType<{project:PvProject}>;export const pvTraceSchema:z.ZodType<PvTrace>;export const pvResultSchema:z.ZodType<PvResult>;
export function validatePvBinding(project:PvProject,design:PvDesign):{project:PvProject;design:PvDesign};export function pvFingerprint(project:PvProject):Promise<string>;
