import type {Note,TrackKind} from '../src/model';
export const gmPrograms:Record<TrackKind,number>;
export function midiFile(input:{bpm:number;tracks:{kind:TrackKind;notes:Pick<Note,'beat'|'duration'|'midi'|'velocity'|'sound'>[];program?:number}[];endBeat?:number}):Uint8Array<ArrayBuffer>;
