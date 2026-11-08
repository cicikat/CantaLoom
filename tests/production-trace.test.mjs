import {test} from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import {once} from 'node:events';
import {randomUUID} from 'node:crypto';
import {productionJobSchema,performancePlanningSchema} from '../shared/contracts/production.mjs';
import {createProduction,serializeProductionJob} from '../server/services/production.mjs';
import {mountProduction} from '../server/routes/production.mjs';
import {createPerformancePlanner} from '../server/services/performance-planner.mjs';
import {createApiClient} from '../src/api/client.ts';
import {productionProject} from '../src/hooks/production-result.ts';
import {freeTimeline} from '../shared/free-timeline.mjs';
import {localMelody} from '../shared/melody.mjs';
import {localSongPlan} from '../src/song-plan.ts';
const input={intent:'explicit production trace fixture',targetSeconds:25};
const route={provider:'fixture-provider',model:'fixture-model',baseUrl:'https://example.invalid/v1',keyRef:'LLM_API_KEY',systemPrompt:'private system prompt'};
const configured={LLM_API_KEY:'private-fixture-key',LLM_ROUTES:JSON.stringify({performance_planning:route})};
function fixture({locked=false,env={},performancePlanner,failSinging=false}={}){
 const plan={title:'fixture',mood:'calm',bpm:96,songPlan:localSongPlan('安静','海盐汽水'),lyrics:['风吹过小岛','灯照着海岸'],phraseWeights:[1,1]};let id=0,sings=0,requests=0,composes=0;
 const timeline=freeTimeline(input,plan,()=>`fixture-${++id}`),draft=localMelody({intent:input.intent,bpm:96,songPlan:plan.songPlan,phrases:timeline.phrases});draft.source='llm';if(locked)for(const line of draft.phrases)line.locked=true;
 const planner=performancePlanner??createPerformancePlanner({env,request:async(_url,init)=>{requests++;const data=JSON.parse(JSON.parse(init.body).messages[1].content);return {ok:true,json:async()=>({choices:[{message:{content:JSON.stringify({phrases:data.phrases.map(l=>({id:l.id,performance:{preset:'natural',mode:'auto'}}))})}}],usage:{prompt_tokens:30,completion_tokens:20}})}}});
 return {options:{env,compose:{compose:async()=>{composes++;return {requestId:'fixture',source:'llm',model:'fixture-no-inference',input,plan,sections:timeline.sections,draft}}},renderer:{status:async()=>({ready:true}),render:async()=>({audioUrl:'explicit-instrument-fixture'})},voiceStatus:async()=>({available:true,engineVersion:'fixture'}),performancePlanner:planner,sing:async l=>{sings++;if(failSinging&&sings===2)throw Error('private upstream singing failure');return {voiceId:'fixture',voiceVersion:'1',providerId:'openutau-diffsinger',engineVersion:'fixture',renderParameters:{runner:'CPU',steps:20,depth:.6},audioUrl:'/api/audio/'+String(sings).padStart(64,'0')+'.wav',startSeconds:l.start*60/l.bpm,durationSeconds:(l.end-l.start)*60/l.bpm,isDemo:false,sourceProject:'private-engine-cache-path',rawResponse:'private engine diagnostics'}}},counts:()=>({sings,requests,composes})};
}
async function done(job){const deadline=Date.now()+3000;while(job.state==='running'&&Date.now()<deadline)await new Promise(r=>setTimeout(r,5));assert.notEqual(job.state,'running');return job}
async function httpFixture(options,run){const app=express();app.use(express.json());const service=mountProduction(app,options),server=app.listen(0,'127.0.0.1');await once(server,'listening');try{await run(service,`http://127.0.0.1:${server.address().port}`)}finally{await new Promise((resolve,reject)=>server.close(error=>error?reject(error):resolve()))}}

test('public planning contract is optional and preserves old/mock jobs without inventing trace',()=>{
 const old={id:randomUUID(),state:'succeeded',stage:'ready-for-mix',mock:true};assert.deepEqual(productionJobSchema.parse(old),old);
 for(const status of ['disabled','running','succeeded','failed','skipped'])assert.deepEqual(performancePlanningSchema.parse({status}),{status});
 assert.throws(()=>performancePlanningSchema.parse({status:'configured'}));
 assert.throws(()=>performancePlanningSchema.parse({status:'disabled',trace:{provider:'x'}}));
});

test('disabled and all-locked skipped are distinct; success trace follows actual router fields',async()=>{
 for(const [env,locked,status] of [[{},false,'disabled'],[configured,true,'skipped'],[configured,false,'succeeded']]){
  const f=fixture({env,locked}),job=await done(createProduction(f.options).start(input));assert.equal(job.state,'succeeded');const publicJob=serializeProductionJob(job);assert.equal(publicJob.performancePlanning.status,status);
  if(status==='succeeded'){assert.match(publicJob.performancePlanning.trace.promptVersion,/^performance_planning\/1\/[a-f0-9]{16}$/);assert.deepEqual(publicJob.performancePlanning.trace,{provider:route.provider,model:route.model,promptVersion:publicJob.performancePlanning.trace.promptVersion,attempts:1,promptTokens:30,completionTokens:20,milliseconds:job.performanceTrace.milliseconds,cost:null,costCurrency:null});assert.equal(f.counts().requests,1)}
  else{assert.ok(!publicJob.performancePlanning.trace);assert.equal(f.counts().requests,0)}
 }
});

test('running status is observable, failure retains score, never sings or retries past the planner',async()=>{
 let enter,release,original;const entered=new Promise(r=>enter=r),gate=new Promise(r=>release=r);
 const f=fixture({env:configured,performancePlanner:{plan:async project=>{original=structuredClone(project);enter();await gate;throw Error('private-fixture-key private system prompt https://upstream.invalid raw response')}}});
 const service=createProduction(f.options),job=service.start(input);await entered;assert.deepEqual(serializeProductionJob(job).performancePlanning,{status:'running'});release();await done(job);
 const response=serializeProductionJob(job);assert.deepEqual(response.performancePlanning,{status:'failed'});assert.equal(response.errorCode,'PERFORMANCE_PLANNING_FAILED');assert.match(response.error,/演唱表现规划失败/);assert.deepEqual(job.project,original);assert.equal(f.counts().sings,0);
 assert.ok(!JSON.stringify(response).includes('private-fixture-key'));assert.ok(!JSON.stringify(response).includes('upstream.invalid'));await assert.rejects(service.retry(job.id,job.project.lyrics[0].id),/不可重试/);
 const invalid=fixture({env:{LLM_ROUTES:JSON.stringify({performance_planning:{...route,baseUrl:'http://remote.invalid'}})}});assert.equal(serializeProductionJob(await done(createProduction(invalid.options).start(input))).errorCode,'PERFORMANCE_PLANNING_FAILED');
});

test('HTTP and existing Client keep trace, filter private roots/trace fields and preserve application/retry',async()=>{
 const f=fixture({env:configured,failSinging:true});await httpFixture(f.options,async(service,url)=>{
  const api=createApiClient({baseUrl:url,mode:'real'}),started=await api.startProduction(input),job=await done(service.get(started.id));assert.equal(job.state,'failed');assert.equal(job.stage,'singing');
  const first=structuredClone(serializeProductionJob(job).project.vocalAssets),phrase=job.phraseId;
  job.env=configured;job.Authorization='private bearer';job.systemPrompt='private root prompt';job.failureContext=undefined;
  Object.assign(job.performanceTrace,{baseUrl:route.baseUrl,keyRef:'LLM_API_KEY',Authorization:'private bearer',systemPrompt:'private trace prompt',response:'private raw response',stack:'private stack'});
  const response=await fetch(url+'/api/production/'+job.id);assert.equal(response.status,200);assert.equal(response.headers.get('cache-control'),'no-store');const json=await response.json();
  for(const key of ['input','failureContext','performanceTrace','env','Authorization','systemPrompt','instrumentAssets','createdAt','finishedAt'])assert.ok(!(key in json),key);
  const text=JSON.stringify(json);for(const marker of ['private-fixture-key','private bearer','private root prompt','private trace prompt','private raw response','private stack','private-engine-cache-path','private engine diagnostics',route.baseUrl])assert.ok(!text.includes(marker),marker);
  assert.ok((await api.production(job.id)).performancePlanning.trace);const oldSchema=productionJobSchema.omit({performancePlanning:true,errorCode:true});assert.equal(oldSchema.parse(json).id,job.id);
  const next=await api.retryProduction(job.id,phrase);assert.equal(next.state,'succeeded');assert.equal(next.performancePlanning.status,'succeeded');assert.ok(!('input' in next));assert.deepEqual(next.project.vocalAssets[Object.keys(first)[0]],first[Object.keys(first)[0]]);
  assert.equal(productionProject(next,input,false).id,job.project.id);assert.equal(f.counts().composes,1);assert.equal(f.counts().requests,1);assert.equal(f.counts().sings,3);
  assert.equal((await fetch(url+'/api/production/no-such-id')).status,404);
 });
});

test('missing or malformed success trace is omitted; failure HTTP keeps 200/state and 409 retry semantics',async()=>{
 const f=fixture({env:configured,performancePlanner:{plan:async project=>({project})}}),job=await done(createProduction(f.options).start(input));assert.deepEqual(serializeProductionJob(job).performancePlanning,{status:'succeeded'});
 job.performanceTrace={provider:'bad',promptTokens:-1,baseUrl:'https://private.invalid'};assert.deepEqual(serializeProductionJob(job).performancePlanning,{status:'succeeded'});
 const fail=fixture({env:configured,performancePlanner:{plan:async()=>{throw Error('private upstream body')}}});await httpFixture(fail.options,async(service,url)=>{
  const job=await done(service.start(input)),response=await fetch(url+'/api/production/'+job.id),json=await response.json();assert.equal(response.status,200);assert.equal(json.state,'failed');assert.equal(json.errorCode,'PERFORMANCE_PLANNING_FAILED');assert.ok(!JSON.stringify(json).includes('private upstream body'));assert.equal((await fetch(url+`/api/production/${job.id}/retry/${job.project.lyrics[0].id}`,{method:'POST'})).status,409);
 });
});
