import {healthSchema} from '../../shared/contracts/index.mjs';
export function mountPlanning(app,{planner,video}){
 app.get('/api/health',(_req,res)=>res.json(healthSchema.parse({ffmpeg:video.ready,llm:!!process.env.LLM_API_KEY,llmStatus:planner().status(),vocal:'demo-vowel',images:'procedural'})));
 app.post('/api/plan',(req,res)=>planner().handle(req,res));
}
