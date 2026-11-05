import type {FreeInput,FreePlan} from './contracts/free-composition.mjs';
import type {MelodyRequest} from './contracts/melody.mjs';
export function freeTimeline(input:FreeInput,plan:FreePlan,id:()=>string):{bpm:number;sections:{id:string;name:string;start:number;beats:number}[];phrases:MelodyRequest['phrases']};
