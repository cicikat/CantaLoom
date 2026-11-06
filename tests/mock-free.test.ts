import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createApiClient,ApiError} from '../src/api/client';
import {createMockRequest} from '../src/api/mock';
import {hasMockData} from '../src/api/provenance';
import {projectFromComposition,melodyRequest,applyMelodyDraft} from '../src/melody';
import {validateProject} from '../src/model';
import {freeResultSchema} from '../shared/contracts/free-composition.mjs';
import {melodyDraftSchema,melodyResponseSchema} from '../shared/contracts/melody.mjs';
import {productionJobSchema,type ProductionJob} from '../shared/contracts/production.mjs';
import {readProject,initialProject,canAutoSave,STORAGE} from '../src/features/project/files';

const input={intent:'MOCK 交互测试',lyrics:['风吹过小岛','灯照着海岸'],bpm:96,targetSeconds:25};
async function jobRequest(request:typeof fetch,path:string,body?:unknown){const response=await request(path,{method:body===undefined?'GET':'POST',...(body===undefined?{}:{body:JSON.stringify(body)})});return {response,body:await response.json()}}
async function runJob(scenario:Parameters<typeof createMockRequest>[0]){
 const request=createMockRequest(scenario),created=await jobRequest(request,'/api/production',input);
 assert.equal(created.response.status,202);assert.equal(created.body.stage,'queued');
 let job:ProductionJob=productionJobSchema.parse(created.body);const stages:string[]=[];
 for(let i=0;i<20&&job.state==='running';i++){const next=await jobRequest(request,'/api/production/'+job.id);assert.equal(next.response.status,200);job=productionJobSchema.parse(next.body);assert.equal(job.mock,true);stages.push(job.stage)}
 return {request,job,stages};
}

test('new Mock client composes validated projects with persistent fixture provenance and no real requests',async()=>{
 const client=createApiClient({mode:'mock',request:()=>{throw Error('network leaked')}});
 for(const lyrics of [undefined,input.lyrics,Array.from({length:8},(_,i)=>`第${i+1}句测试`)]){
  const result=await client.compose({...input,lyrics}),p=projectFromComposition(result);
  assert.equal(result.mock,true);assert.equal(result.model,'mock-fixture-no-inference');assert.equal(result.draft.mock,true);
  assert.equal(p.planning?.source,'local-rules');assert.equal(p.planning.mock,true);assert.equal(p.melodyDraft?.source,'local-rules');
  assert.ok(p.lyrics.every(l=>l.source===(lyrics?'manual':'local-template')));if(lyrics)assert.deepEqual(p.lyrics.map(l=>l.text),lyrics);
  assert.ok(hasMockData(validateProject(JSON.parse(JSON.stringify(p)))));assert.equal(p.sections.length,4);
 }
 for(const bpm of [60,160])for(const targetSeconds of [20,30]){
  const p=projectFromComposition(await client.compose({...input,bpm,targetSeconds}));
  const seconds=p.sections.reduce((n,s)=>n+s.beats,0)*60/p.bpm;assert.ok(seconds>=20&&seconds<=30);
 }
});

test('Mock melody supports empty lyrics, local targets, phrase locks and partially locked notes',async()=>{
 const client=createApiClient({mode:'mock'}),p=projectFromComposition(await client.compose(input));
 p.lyrics[0].notes[0].locked=true;
 const req=melodyRequest(p,'保留锁定音符',[p.lyrics[0].id]),before=structuredClone(p);
 const result=await client.melody(req),next=applyMelodyDraft(p,req,result.draft);
 assert.equal(result.mock,true);assert.equal(result.draft.mock,true);assert.equal(result.draft.source,'local-rules');
 assert.deepEqual(next.lyrics[0].notes[0],p.lyrics[0].notes[0]);assert.deepEqual(next.lyrics[1],p.lyrics[1]);assert.deepEqual(p,before);
 p.lyrics[0].locked=true;const locked=await client.melody(melodyRequest(p,'保留整句'));assert.deepEqual(locked.draft.phrases[0].notes,p.lyrics[0].notes);
 const empty={...req,targetIds:undefined,phrases:req.phrases.map(l=>({...l,text:'',notes:[],locked:false}))};
 assert.ok((await client.melody(empty)).draft.phrases.every(l=>l.text.length>0&&l.notes.length>0));
});

test('Mock production client creates, polls and supplies playable marked test tones',async()=>{
 const client=createApiClient({mode:'mock',request:()=>{throw Error('network leaked')}});let job=await client.startProduction(input);const stages:string[]=[];
 for(let i=0;i<20&&job.state==='running';i++){job=await client.production(job.id);stages.push(job.stage)}
 assert.equal(job.state,'succeeded');assert.equal(job.stage,'ready-for-mix');assert.ok(stages.includes('singing'));
 const p=validateProject(job.project);assert.equal(p.instrumentMode,'synth');assert.equal(p.planning?.mock,true);
 for(const asset of Object.values(p.vocalAssets!)){
  assert.equal(asset.mock,true);assert.equal(asset.isDemo,true);const pcm=await client.audio(asset.audioUrl);
  assert.equal(new TextDecoder().decode(pcm.slice(0,4)),'RIFF');assert.ok(new Int16Array(pcm.slice(44)).some(n=>n!==0));
 }
 await assert.rejects(()=>client.retryProduction(job.id,p.lyrics[0].id),(e:unknown)=>e instanceof ApiError&&e.status===409);
 await assert.rejects(()=>client.production(crypto.randomUUID()),(e:unknown)=>e instanceof ApiError&&e.status===404);
});

test('Mock production simulates planning failure, task loss and partial retries without rewriting completed work',async()=>{
 const planning=await runJob('planning-failure');assert.equal(planning.job.state,'failed');assert.equal(planning.job.project,undefined);
 const request=createMockRequest('lost'),lost=await jobRequest(request,'/api/production',input);assert.equal((await jobRequest(request,'/api/production/'+lost.body.id)).response.status,404);
 const {request:retry,job}=await runJob('singing-failure');assert.equal(job.state,'failed');assert.equal(job.completedPhrases,1);
 const before=structuredClone(validateProject(job.project)),composition=structuredClone(job.composition);
 const next=await jobRequest(retry,`/api/production/${job.id}/retry/${job.phraseId}`,{});
 assert.equal(next.body.state,'succeeded');const p=validateProject(next.body.project);
 assert.deepEqual(p.vocalAssets![before.lyrics[0].id],before.vocalAssets![before.lyrics[0].id]);assert.deepEqual(p.tracks,before.tracks);assert.deepEqual(next.body.composition,composition);
 const many=await jobRequest(retry,'/api/production',{...input,lyrics:['第一句测试','第二句测试','第三句测试']});
 let partial=many.body;for(let i=0;i<20&&partial.state==='running';i++)partial=(await jobRequest(retry,'/api/production/'+partial.id)).body;
 const remaining=validateProject(partial.project).lyrics.filter(l=>!partial.project.vocalAssets[l.id]);
 for(const [i,l] of remaining.entries()){partial=(await jobRequest(retry,`/api/production/${partial.id}/retry/${l.id}`,{})).body;assert.equal(partial.state,i===remaining.length-1?'succeeded':'failed')}
 const invalid=createMockRequest(),created=await jobRequest(invalid,'/api/production',{...input,lyrics:['！！！']});
 let failed=created.body;for(let i=0;i<10&&failed.state==='running';i++)failed=(await jobRequest(invalid,'/api/production/'+failed.id)).body;
 assert.equal(failed.state,'failed');assert.equal((await jobRequest(invalid,'/api/production/'+failed.id)).body.state,'failed');
});

test('real Client rejects top-level and nested fixture markers before stripping unknown fields',async()=>{
 const fixture=await createApiClient({mode:'mock'}).compose(input),p=projectFromComposition(fixture);
 for(const raw of [fixture,{...fixture,mock:undefined}, {...fixture,mock:undefined,draft:{...fixture.draft,mock:undefined},planning:{mock:true}}]){
  const client=createApiClient({request:async()=>Response.json(raw)});await assert.rejects(()=>client.compose(input),/拒绝 Mock/);
 }
 for(const payload of [{mock:true},{project:p},{composition:fixture},{project:{melodyDraft:fixture.draft}},{project:{vocalHistory:{x:[{mock:true}]}}}]){
  const client=createApiClient({request:async()=>Response.json({id:crypto.randomUUID(),state:'succeeded',stage:'ready-for-mix',...payload})});await assert.rejects(()=>client.production('fixture'),/拒绝 Mock/);
 }
 assert.equal(hasMockData({metadata:{title:'mock:true'},lyrics:[{text:'mock'}]}),false);
 const real=structuredClone(fixture);delete real.mock;delete real.draft.mock;real.draft.source='llm';
 const client=createApiClient({request:async()=>Response.json(real)});assert.equal((await client.compose(input)).mock,undefined);assert.equal(projectFromComposition(real).planning?.source,'llm');
 assert.equal(freeResultSchema.parse(fixture).mock,true);assert.equal(melodyDraftSchema.parse(fixture.draft).mock,true);
 assert.equal(melodyResponseSchema.parse({mock:true,draft:fixture.draft}).mock,true);
});

test('Mock import and startup recovery cannot enter real storage or overwrite rejected saved data',async()=>{
 const p=projectFromComposition(await createApiClient({mode:'mock'}).compose(input));delete p.planning;
 await assert.rejects(()=>readProject(new File([JSON.stringify(p)],'fixture.json')),/MOCK 测试工程/);
 const saved=JSON.stringify(p),descriptor=Object.getOwnPropertyDescriptor(globalThis,'localStorage');
 Object.defineProperty(globalThis,'localStorage',{configurable:true,value:{getItem:(key:string)=>key===STORAGE?saved:null}});
 try{assert.equal(canAutoSave(),false);assert.notEqual(initialProject().id,p.id);assert.equal(localStorage.getItem(STORAGE),saved)}
 finally{if(descriptor)Object.defineProperty(globalThis,'localStorage',descriptor);else Reflect.deleteProperty(globalThis,'localStorage')}
});

test('Mock route list stays closed and wrong methods or invalid inputs cannot create work',async()=>{
 const request=createMockRequest();
 for(const path of ['/api/compose','/api/melody','/api/production','/api/production/extra/route','/api/admin/state','/api/unknown'])assert.equal((await request(path)).status,404);
 assert.equal((await jobRequest(request,'/api/compose',{intent:''})).response.status,422);
 assert.equal((await jobRequest(request,'/api/production',{...input,mockScenario:'success'})).response.status,422);
});
