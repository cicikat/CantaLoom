import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createProject} from '../src/composer';
import {validateProject} from '../src/model';
import {pvSnapshot,currentPv,validateStoredPv} from '../src/features/pv/project';
import {pvFingerprint} from '../shared/contracts/pv.mjs';
import {createMockPvRoutes} from '../src/api/mock-pv';
import {createMockFreeRoutes} from '../src/api/mock-free';
import {createApiClient,ApiError,api} from '../src/api/client';
import {productionProject,productionInput} from '../src/hooks/production-result';
import {hasMockData} from '../src/api/provenance';

test('PV snapshot is minimal; storage roundtrip and fingerprint reject stale or foreign designs',async()=>{
 const p=createProject(),before=structuredClone(p),snapshot=pvSnapshot(p);
 assert.deepEqual(p,before);assert.ok(!('tracks' in snapshot));assert.ok(!('vocalAssets' in snapshot));
 const routes=createMockPvRoutes(),response=await routes('/api/pv/design',{project:snapshot});
 p.pvVisual={project:snapshot,result:await response!.json()};p.pvVisualMode='html';
 const restored=validateProject(JSON.parse(JSON.stringify(p)));assert.deepEqual(await currentPv(restored,true),p.pvVisual);
 assert.ok(hasMockData({pvVisual:p.pvVisual}));await assert.rejects(currentPv(p,false),/来源/);
 for(const change of [(p:ReturnType<typeof createProject>)=>{p.bpm++},(p:ReturnType<typeof createProject>)=>{p.lyrics[0].text+='呀'},(p:ReturnType<typeof createProject>)=>{p.metadata.title+='呀'},(p:ReturnType<typeof createProject>)=>{p.tracks.find(t=>t.kind==='drums')!.muted=true}]){
  const changed=structuredClone(p);change(changed);await assert.rejects(currentPv(changed,true),/失效/);assert.deepEqual(changed.pvVisual,p.pvVisual);
 }
 assert.throws(()=>validateStoredPv({...p.pvVisual,html:'<script>bad</script>'}));
 const invalid=structuredClone(p);invalid.pvVisual!.result.pvDesign.scenes[0].sectionId='foreign';assert.throws(()=>validateProject(invalid));
 const forged=structuredClone(p);forged.pvVisual!.result.inputFingerprint='0'.repeat(64);await assert.rejects(currentPv(forged,true),/失效/);
});

test('old v1 stays unchanged; malformed visuals and counterfeit Mock provenance are rejected',()=>{
 const p=createProject(),before=JSON.stringify(p);validateProject(p);assert.equal(JSON.stringify(p),before);assert.equal(p.pvVisual,undefined);
 assert.throws(()=>validateProject({...p,pvVisualMode:'remote'}));assert.throws(()=>validateProject({...p,pvVisualMode:'html'}));assert.throws(()=>validateProject({...p,pvVisual:{project:{},result:{}}}));
});

test('Client submits production groove with the existing schema, keeps compose strict and PV errors readable',async()=>{
 const calls:{path:string;body:any}[]=[],id=crypto.randomUUID();
 const client=createApiClient({request:async(input,init)=>{calls.push({path:String(input),body:JSON.parse(String(init?.body))});return Response.json({id,state:'running',stage:'queued'})}});
 const grooveSettings={swingTicks:60,timingTicks:12,velocityAmount:.08};
 await client.startProduction({intent:'fixture',grooveSettings});assert.deepEqual(calls[0].body.grooveSettings,grooveSettings);
 assert.throws(()=>client.compose({intent:'fixture',grooveSettings} as any));
 const errorClient=createApiClient({request:async()=>Response.json({code:'PV_NOT_CONFIGURED',error:'请配置独立视觉模型'},{status:503})});
 await assert.rejects(errorClient.pvDesign(pvSnapshot(createProject())),(e:unknown)=>e instanceof ApiError&&e.status===503&&e.code==='PV_NOT_CONFIGURED');
});

test('Mock PV has explicit provenance and no trace; real Client rejects Mock results',async()=>{
 const project=pvSnapshot(createProject()),routes=createMockPvRoutes(),result=await (await routes('/api/pv/design',{project}))!.json();
 assert.equal(result.inputFingerprint,await pvFingerprint(project));assert.equal(result.source,'mock');assert.equal(result.mock,true);assert.equal(result.trace,undefined);
 const client=createApiClient({request:async()=>Response.json(result)});await assert.rejects(client.pvDesign(project),/拒绝 Mock/);
 for(const scenario of ['failure','unavailable'] as const){const route=createMockPvRoutes(scenario),response=await route('/api/pv/design',{project});assert.equal(response!.status,scenario==='failure'?502:503)}
});

async function mockJob(scenario:Parameters<typeof createMockFreeRoutes>[1]='success'){
 const routes=createMockFreeRoutes(async()=> 'a'.repeat(64),scenario),input=productionInput('fixture','风吹过小岛\n灯照着海岸','96',25,{swingTicks:60,timingTicks:10,velocityAmount:.06});
 let job=await (await routes('/api/production','POST',input))!.json();const states:string[]=[];
 for(let i=0;i<20&&job.state==='running';i++){job=await (await routes('/api/production/'+job.id,'GET',undefined))!.json();if(job.performancePlanning)states.push(job.performancePlanning.status)}
 return {routes,job,input,states};
}
test('Mock production passes groove to returned project without sending it to strict composition',async()=>{
 const {job,input}=await mockJob();assert.equal(job.state,'succeeded');const old=api.mock;api.mock=true;try{assert.deepEqual(productionProject(job,input,true).grooveSettings,input.grooveSettings)}finally{api.mock=old}
 const bad=structuredClone(job);bad.project.grooveSettings.swingTicks++;assert.throws(()=>productionProject(bad,input,true),/律动/);
 assert.equal(productionInput('fixture','','',25,{swingTicks:0,timingTicks:0,velocityAmount:0}).grooveSettings,undefined);
 assert.throws(()=>productionInput('fixture','','',25,{swingTicks:121,timingTicks:0,velocityAmount:0}));
});
test('Mock planning five states, optional trace and planning failure retry guard match public contract',async()=>{
 for(const [scenario,status] of [['performance-disabled','disabled'],['performance-skipped','skipped'],['performance-success','succeeded'],['performance-no-trace','succeeded'],['performance-failure','failed']] as const){
  const {routes,job,states}=await mockJob(scenario);assert.ok(states.includes('running'));assert.equal(job.performancePlanning.status,status);
  assert.equal(!!job.performancePlanning.trace,scenario==='performance-success');
  if(status==='failed'){assert.equal(job.errorCode,'PERFORMANCE_PLANNING_FAILED');assert.equal(job.project,undefined);assert.equal((await routes(`/api/production/${job.id}/retry/anything`,'POST',{}))!.status,409)}
 }
 const old=await mockJob();assert.equal(old.job.performancePlanning,undefined);
});
