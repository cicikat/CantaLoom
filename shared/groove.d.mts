import type {Groove,GrooveSettings} from './contracts/groove.mjs';
import type {MidiNote,MidiTrackKind} from './midi.mjs';
import type {InstrumentInput} from './contracts/index.mjs';
export interface GrooveTrack {id:string;sectionId:string;kind:MidiTrackKind;version:number;notes:MidiNote[];locked?:boolean;manuallyEdited?:boolean}
export interface GrooveProject {id:string;bpm:number;sections:{id:string;start:number;beats:number}[];grooveSettings?:GrooveSettings;instrumentPrograms?:Partial<Record<MidiTrackKind,number>>;soundfont?:string}
export function projectInstrumentInput(project:GrooveProject,track:GrooveTrack):InstrumentInput;
export function grooveRandom(value:unknown):()=>number;
export function performedNotes<N extends MidiNote>(track:{kind:MidiTrackKind;notes:N[];groove?:Groove;locked?:boolean;manuallyEdited?:boolean},endBeat?:number):{note:N;start:number;end:number;velocity:number}[];
