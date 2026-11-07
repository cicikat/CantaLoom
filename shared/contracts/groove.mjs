import {z} from 'zod';
export const grooveSchema=z.object({
 projectId:z.string().min(1).max(150),trackId:z.string().min(1).max(150),version:z.number().int().min(1).max(1000000),
 swingTicks:z.number().int().min(0).max(120).default(0),
 timingTicks:z.number().int().min(0).max(20).default(0),
 velocityAmount:z.number().min(0).max(.2).default(0),
}).strict();
