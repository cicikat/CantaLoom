import type {z} from 'zod';
export interface Groove {projectId:string;trackId:string;version:number;swingTicks?:number;timingTicks?:number;velocityAmount?:number}
export const grooveSchema:z.ZodType<Groove>;

export interface GrooveSettings {swingTicks?:number;timingTicks?:number;velocityAmount?:number}
export const grooveSettingsSchema:z.ZodType<GrooveSettings>;
