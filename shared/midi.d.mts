export type MidiTrackKind='drums'|'bass'|'guitar'|'keys'|'melody'|'vocal';
export interface MidiNote {beat:number;duration:number;midi:number;velocity:number;sound?:'kick'|'snare'|'hat'}
export const gmPrograms:Record<MidiTrackKind,number>;
export function midiFile(input:{bpm:number;tracks:{kind:MidiTrackKind;notes:MidiNote[];program?:number}[];endBeat?:number}):Uint8Array<ArrayBuffer>;
