import type {MelodyRequest,MelodyDraft} from './contracts/melody.mjs';
import type {SongPlan} from './song-plan.mjs';
export function lyricChars(text:string):string[];
export function scaleClasses(plan:SongPlan):number[];
export function chordClasses(plan:SongPlan,beat:number):number[];
export function validateMelody(input:MelodyRequest,raw:unknown):MelodyDraft;
export function localMelody(input:MelodyRequest):MelodyDraft;
