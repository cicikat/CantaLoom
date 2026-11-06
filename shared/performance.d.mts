import type {Performance,MelodyNote} from './contracts/melody.mjs';
export const performancePresets:Record<Performance['preset'],{transitionMs:number;vibratoDepth:number;dynamics:number;consonantMs:number}>;
export function resolvePerformance(input:Performance):Performance&{transitionMs:number;vibratoDepth:number;dynamics:number;consonantMs:number};
export function notePerformance(notes:Pick<MelodyNote,'beat'|'duration'|'midi'>[],index:number,bpm:number,input:Performance):{pitch:{data:{x:number;y:number;shape:string}[];snap_first:boolean};vibrato:{length:number;period:number;depth:number;in:number;out:number;shift:number;drift:number};phoneme_expressions:never[];phoneme_overrides:{index:number;offset:number}[]};
export function performanceCurves(notes:Pick<MelodyNote,'beat'|'duration'|'velocity'>[],start:number,end:number,input:Performance,bpm?:number):{abbr:string;xs:number[];ys:number[]}[];

export function plannedNote(notes:Pick<MelodyNote,'beat'|'duration'|'midi'|'velocity'>[],index:number,bpm:number,input:Performance):Performance&{transitionMs:number;vibratoDepth:number;dynamics:number;consonantMs:number};

export function automaticPhrase(text:string,notes:Pick<MelodyNote,'syllable'>[],energy?:number,previous?:Performance):Performance;
export function performancePlan(p:any):unknown;
