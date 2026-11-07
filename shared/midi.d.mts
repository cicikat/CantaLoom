import type {Groove} from './contracts/groove.mjs';
export type MidiTrackKind='drums'|'bass'|'guitar'|'keys'|'melody'|'vocal';
export interface MidiNote {beat:number;duration:number;midi:number;velocity:number;sound?:'kick'|'snare'|'hat';locked?:boolean}
export const gmPrograms:Record<MidiTrackKind,number>;
export function midiFile(input:{bpm:number;tracks:{kind:MidiTrackKind;notes:MidiNote[];program?:number;groove?:Groove;locked?:boolean;manuallyEdited?:boolean}[];endBeat?:number}):Uint8Array<ArrayBuffer>;
