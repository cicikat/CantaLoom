import {healthSchema} from '../../shared/contracts/index.mjs';
import {isTaskConfigured} from '../services/llm-router.mjs';
export function mountPlanning(app,{planner,video}){
 app.get('/api/health',(_req,res)=>res.json(healthSchema.parse({ffmpeg:video.ready,llm:isTaskConfigured(process.env,'lyrics_planning')&&isTaskConfigured(process.env,'melody_composition'),llmStatus:planner().status(),vocal:'demo-vowel',images:'procedural'})));
 app.post('/api/plan',(req,res)=>planner().handle(req,res));
}
