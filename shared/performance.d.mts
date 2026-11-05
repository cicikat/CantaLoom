import type {Performance,MelodyNote} from './contracts/melody.mjs';
export const performancePresets:Record<Performance['preset'],{transitionMs:number;vibratoDepth:number;dynamics:number;consonantMs:number}>;
export function resolvePerformance(input:Performance):Required<Performance>;
export function notePerformance(notes:Pick<MelodyNote,'beat'|'duration'|'midi'>[],index:number,bpm:number,input:Performance):{pitch:{data:{x:number;y:number;shape:string}[];snap_first:boolean};vibrato:{length:number;period:number;depth:number;in:number;out:number;shift:number;drift:number};phoneme_expressions:never[];phoneme_overrides:{index:number;offset:number}[]};
export function performanceCurves(notes:Pick<MelodyNote,'beat'|'duration'|'velocity'>[],start:number,end:number,input:Performance):{abbr:string;xs:number[];ys:number[]}[];
