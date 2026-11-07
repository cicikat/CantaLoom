import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import path from 'node:path';
import {createConfigStore} from '../server/admin-config.mjs';
import {externalRoot} from '../server/services/instruments.mjs';
import {resolveRoute,routingHistory} from '../server/services/llm-router.mjs';
import {createFreeComposer} from '../server/services/free-composition.mjs';
import {createPerformancePlanner} from '../server/services/performance-planner.mjs';
import {buildFreeScore} from '../shared/free-score.mjs';

test('real LLM task routing: different models, validated composition and performance, traceable prompts',{
 skip:process.env.SONGYU_LLM_ROUTING_REAL!=='1',timeout:300000,
},async()=>{
 const env={...process.env};await createConfigStore({directory:path.join(externalRoot,'runtime/config'),env});
 const route=(task,model)=>({...resolveRoute(env,task),...(model?{model}:{})});
 const routes={lyrics_planning:route('lyrics_planning',process.env.SONGYU_LYRICS_MODEL),melody_composition:route('melody_composition',process.env.SONGYU_MELODY_MODEL),performance_planning:route('performance_planning',process.env.SONGYU_PERFORMANCE_MODEL)};
 assert.ok(new Set(Object.values(routes).map(r=>r.model)).size>=2,'真实验收需至少两个不同可用模型 ID');
 env.LLM_ROUTES=JSON.stringify(routes);
 const composition=await createFreeComposer({env}).compose({intent:'雨后街头，轻柔而坚定，保留短句和呼吸',lyrics:['微光穿过雨','脚步向前去'],bpm:96,targetSeconds:25});
 const project=buildFreeScore(composition,randomUUID),planned=await createPerformancePlanner({env}).plan(project);
 assert.equal(composition.source,'llm');assert.equal(composition.plan.lyrics.join('|'),'微光穿过雨|脚步向前去');
 assert.deepEqual(planned.project.lyrics.map(l=>l.notes),project.lyrics.map(l=>l.notes));
 assert.ok(planned.project.lyrics.every(l=>l.performance.mode==='auto'));
 const history=routingHistory();
 for(const task of Object.keys(routes))assert.ok(history.some(h=>h.task===task&&h.state==='succeeded'&&h.model===routes[task].model&&h.promptVersion.startsWith(task+'/')));
 const output=path.resolve('temp/ticket-15-routing-real');await mkdir(output,{recursive:true});
 await writeFile(path.join(output,'evidence.json'),JSON.stringify({at:new Date().toISOString(),composition,performance:planned.project.lyrics.map(l=>({id:l.id,performance:l.performance})),history},null,2));
});
