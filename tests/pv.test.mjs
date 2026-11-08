import {test} from 'node:test';import assert from 'node:assert/strict';
import express from 'express';import {once} from 'node:events';
import {pvProject,pvDesign} from './support/pv-fixture.mjs';
import {pvProjectSchema,pvDesignSchema,pvFingerprint,validatePvBinding,pvResultSchema} from '../shared/contracts/pv.mjs';
import {createPvPlanner} from '../server/services/pv.mjs';import {mountPv} from '../server/routes/pv.mjs';
import {routesSchema} from '../server/services/llm-router.mjs';import {settingsSchema} from '../server/admin-config.mjs';
const route={provider:'fixture',model:'fixture-no-inference',baseUrl:'https://example.invalid/v1',keyRef:'LLM_API_KEY'};
const env={LLM_API_KEY:'private-fixture-key',LLM_ROUTES:JSON.stringify({pv_design:route})};
test('PV strict schemas, binding, complexity and stable snapshot fingerprint',async()=>{
 const p=pvProject(),d=pvDesign(p);assert.deepEqual(validatePvBinding(p,d),{project:p,design:d});assert.equal(await pvFingerprint(p),await pvFingerprint(structuredClone(p)));assert.notEqual(await pvFingerprint(p),await pvFingerprint({...p,bpm:100}));
 for(const change of [v=>v.scenes[0].layers[0].script='evil()',v=>v.scenes[0].layers[0].color='url(https://evil)',v=>v.scenes[0].layers[0].shape='path',v=>v.scenes[0].layers[0].keyframes.push({at:1}),v=>v.scenes[0].layers[0].x=5,v=>v.scenes[0].layers.push(v.scenes[0].layers[1])]){const x=structuredClone(d);change(x);assert.throws(()=>pvDesignSchema.parse(x))}
 assert.throws(()=>validatePvBinding({...p,sections:p.sections.map((s,i)=>({...s,id:'other'+i}))},d));assert.throws(()=>pvProjectSchema.parse({...p,bpm:20}));
 assert.equal(routesSchema.parse({pv_design:route}).pv_design.model,route.model);assert.equal(settingsSchema.parse({routeKeys:{pv_design:'private'}}).routeKeys.pv_design,'private');
 assert.throws(()=>pvResultSchema.parse({source:'mock',inputFingerprint:'0'.repeat(64),pvDesign:d}));
});
test('independent PV route validates actual router output and never silently falls back',async()=>{
 const seen=[];const planner=createPvPlanner({env,request:async(_url,init)=>{const body=JSON.parse(init.body),p=JSON.parse(body.messages[1].content);seen.push(body);return {ok:true,json:async()=>({choices:[{message:{content:JSON.stringify(pvDesign(p,p.mood==='激烈'))}}],usage:{prompt_tokens:50,completion_tokens:200}})}}});
 const a=await planner.design({project:pvProject()}),b=await planner.design({project:pvProject(true)});assert.notDeepEqual(a.pvDesign,b.pvDesign);assert.equal(a.source,'llm');assert.equal(a.trace.task,'pv_design');assert.equal(a.trace.model,'fixture-no-inference');assert.ok(!JSON.stringify(a).includes('private-fixture-key'));assert.ok(!('baseUrl' in a.trace));assert.equal(seen.length,2);
 await assert.rejects(createPvPlanner({env:{LLM_API_KEY:'other'}}).design({project:pvProject()}),e=>e.code==='PV_NOT_CONFIGURED');
 let requests=0;const invalid=createPvPlanner({env,request:async()=>{requests++;return {ok:true,json:async()=>({choices:[{message:{content:'{"script":"evil"}'}}]})}}});await assert.rejects(invalid.design({project:pvProject()}));assert.equal(requests,2);
});
test('PV HTTP errors are sanitized, invalid input 400, absent route 503, failures 502',async()=>{
 for(const options of [{env:{}},{env,request:async()=>{throw Error('private-fixture-key raw upstream')}}]){
  const app=express();app.use(express.json());mountPv(app,options);const server=app.listen(0,'127.0.0.1');await once(server,'listening');const url=`http://127.0.0.1:${server.address().port}`;
  try{const post=body=>fetch(url+'/api/pv/design',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});assert.equal((await post({})).status,400);const response=await post({project:pvProject()});assert.equal(response.status,options.request?502:503);assert.ok(!(await response.text()).includes('private-fixture-key'));assert.equal((await fetch(url+'/api/pv/status')).status,200)}finally{await new Promise(r=>server.close(r))}
 }
});
