import {test} from 'node:test';
import assert from 'node:assert/strict';
// @ts-expect-error Native server dependency has no declaration
import express from 'express';
import {once} from 'node:events';
import {productionInputSchema} from '../shared/contracts/production.mjs';
import {freeInputSchema} from '../shared/contracts/free-composition.mjs';
import {projectInstrumentInput,performedNotes} from '../shared/groove.mjs';
import {midiFile} from '../shared/midi.mjs';
import {createProject} from '../src/composer';
import {validateProject,type Track} from '../src/model';
import {localSongPlan} from '../src/song-plan';
import {freeTimeline} from '../shared/free-timeline.mjs';
import {localMelody} from '../shared/melody.mjs';
// @ts-expect-error Native backend module
import {mountProduction} from '../server/routes/production.mjs';
const settings={swingTicks:48,timingTicks:8,velocityAmount:.06};
const zero={swingTicks:0,timingTicks:0,velocityAmount:0};
test('production settings reject invalid values and identity injection; free compose stays strict',()=>{
 assert.deepEqual(productionInputSchema.parse({intent:'fixture',grooveSettings:{}}).grooveSettings,zero);
 assert.equal(productionInputSchema.parse({intent:'fixture'}).grooveSettings,undefined);
 for(const bad of [null,[],{swingTicks:121},{swingTicks:.5},{timingTicks:-1},{timingTicks:21},{velocityAmount:.201},{velocityAmount:'0.1'},{projectId:'forged'},{trackId:'forged'},{version:2}])assert.throws(()=>productionInputSchema.parse({intent:'fixture',grooveSettings:bad}));
 assert.throws(()=>freeInputSchema.parse({intent:'fixture',grooveSettings:settings}));
});
test('v1 JSON roundtrip preserves settings, rejects bad settings, never migrates old score',()=>{
 const p=createProject(),original=structuredClone(p);validateProject(p);assert.deepEqual(p,original);assert.ok(!('grooveSettings' in p));
 p.grooveSettings=settings;const next=validateProject(JSON.parse(JSON.stringify(p)));assert.deepEqual(next,p);
 for(const bad of [null,{timingTicks:50},{trackId:'forged'}])assert.throws(()=>validateProject({...p,grooveSettings:bad}));
});
test('shared input and performed events preserve score and protected MIDI; zero uses legacy input',()=>{
 const p=createProject(),t=p.tracks.find(t=>t.kind==='keys')!;t.notes=[0,.5,1,1.5].map((beat,i)=>({id:'note-'+i,beat,duration:.25,midi:60,velocity:.5}));
 const legacy=projectInstrumentInput(p,t),bytes=(input:ReturnType<typeof projectInstrumentInput>)=>midiFile({bpm:p.bpm,tracks:[input],endBeat:input.endBeat});
 assert.deepEqual(legacy,{bpm:p.bpm,kind:t.kind,notes:t.notes,endBeat:p.sections[0].beats});
 p.grooveSettings=zero;assert.deepEqual(projectInstrumentInput(p,t),legacy);
 p.grooveSettings=settings;const before=structuredClone(p),input=projectInstrumentInput(p,t);
 assert.deepEqual(input.groove,{projectId:p.id,trackId:t.id,version:t.version,...settings});
 assert.deepEqual(bytes(input),bytes(projectInstrumentInput(p,t)));assert.notDeepEqual(bytes(input),bytes(legacy));assert.deepEqual(performedNotes(input,input.endBeat),performedNotes(input,input.endBeat));assert.deepEqual(p,before);
 for(const protection of [{locked:true},{manuallyEdited:true},{notes:t.notes.map(n=>({...n,locked:true}))}]){
  const track={...t,...protection};const protectedInput=projectInstrumentInput(p,track);
  assert.deepEqual(bytes(protectedInput),bytes({...protectedInput,groove:undefined}));
  assert.deepEqual(protectedInput.notes,track.notes);
 }
});
test('HTTP production strips planning-only fields, returns persisted groove and stable rendering inputs',async()=>{
 const input={intent:'explicit test fixture',targetSeconds:25},plan={title:'fixture',mood:'calm',bpm:96,songPlan:localSongPlan('安静','海盐汽水'),lyrics:['我等风吹来','你听海潮声'],phraseWeights:[1,1]};let id=0;
 const timeline=freeTimeline(input,plan,()=>`fixture-${++id}`),draft=localMelody({intent:input.intent,bpm:96,songPlan:plan.songPlan,phrases:timeline.phrases});draft.source='llm';
 const calls:ReturnType<typeof projectInstrumentInput>[]=[],composeInputs:unknown[]=[];
 const app=express();app.use(express.json());mountProduction(app,{env:{},compose:{compose:async(raw:unknown)=>{composeInputs.push(raw);freeInputSchema.parse(raw);return {requestId:'fixture',source:'llm',model:'fixture-no-inference',input,plan,sections:timeline.sections,draft}}},renderer:{status:async()=>({ready:true}),render:async(raw:ReturnType<typeof projectInstrumentInput>)=>{calls.push(structuredClone(raw));return {audioUrl:'fixture'}}},voiceStatus:async()=>({available:true}),sing:async()=>({voiceId:'fixture',voiceVersion:'1',providerId:'openutau-diffsinger',audioUrl:'fixture'})});
 const server=app.listen(0,'127.0.0.1');await once(server,'listening');const address=server.address() as {port:number},url=`http://127.0.0.1:${address.port}/api/production`;
 try{
  const post=(body:unknown)=>fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
  for(const grooveSettings of [{swingTicks:121},{projectId:'forged'},null])assert.equal((await post({...input,grooveSettings})).status,400);
  for(const grooveSettings of [settings,undefined,zero]){
   calls.length=0;const response=await post({...input,...(grooveSettings?{grooveSettings}:{})});assert.equal(response.status,202);const created=await response.json();
   let job;const deadline=Date.now()+3000;
   do{const get=await fetch(url+'/'+created.id);assert.equal(get.headers.get('cache-control'),'no-store');job=await get.json();if(job.state!=='running')break;await new Promise(r=>setTimeout(r,5))}while(Date.now()<deadline);
   assert.equal(job.state,'succeeded');assert.deepEqual(job.project.grooveSettings,grooveSettings);assert.deepEqual(composeInputs.at(-1),input);assert.ok(calls.length>0);
   for(const call of calls){const track:Track=job.project.tracks.find((t:{id:string})=>t.id===call.groove?.trackId)??job.project.tracks.find((t:{kind:string;notes:unknown})=>t.kind===call.kind&&JSON.stringify(t.notes)===JSON.stringify(call.notes));assert.deepEqual(call,projectInstrumentInput(job.project,track));}
  }
 }finally{await new Promise<void>((resolve,reject)=>server.close((error?:Error)=>error?reject(error):resolve()));}
});

test('real project inputs: FluidSynth WAV difference, zero legacy cache, protected cache stability',async t=>{
 // @ts-expect-error Native test tier module
 const {realAcceptance}=await import('./support/tier.mjs');if(!realAcceptance)return t.skip('external acceptance disabled');
 // @ts-expect-error Native backend module
 const {InstrumentRenderer,cacheRoot}=await import('../server/services/instruments.mjs');
 const {readFile,mkdir,writeFile}=await import('node:fs/promises');const path=await import('node:path');
 const renderer=new InstrumentRenderer();if(!(await renderer.status()).ready)return t.skip('FluidSynth/SoundFont unavailable');
 const p=createProject();p.id='task31-stable-project';const track=p.tracks.find(t=>t.kind==='keys')!;track.id='task31-stable-track';
 track.notes=[0,.5,1,1.5,2,2.5,3,3.5].map((beat,i)=>({id:'note-'+i,beat,duration:.25,midi:60,velocity:.5}));
 const plain=await renderer.render(projectInstrumentInput(p,track));p.grooveSettings=zero;assert.equal((await renderer.render(projectInstrumentInput(p,track))).key,plain.key);
 p.grooveSettings=settings;const before=structuredClone(p),first=await renderer.render(projectInstrumentInput(p,track)),again=await renderer.render(projectInstrumentInput(p,track));assert.equal(again.key,first.key);assert.equal(again.cached,true);assert.notEqual(first.key,plain.key);assert.deepEqual(p,before);
 const a=await readFile(path.join(cacheRoot,plain.key+'.wav')),b=await readFile(path.join(cacheRoot,first.key+'.wav'));const pcm=(x:Buffer)=>x.subarray(x.indexOf(Buffer.from('data'))+8);
 assert.ok(pcm(a).some(x=>x!==0));assert.ok(pcm(b).some(x=>x!==0));assert.notDeepEqual(pcm(a),pcm(b));
 await mkdir('temp/task31',{recursive:true});await writeFile('temp/task31/plain.wav',a);await writeFile('temp/task31/groove.wav',b);
 for(const protection of [{locked:true},{manuallyEdited:true},{notes:track.notes.map(n=>({...n,locked:true}))}]){
  const protectedTrack={...track,...protection};p.grooveSettings=zero;const base=await renderer.render(projectInstrumentInput(p,protectedTrack));p.grooveSettings=settings;const active=await renderer.render(projectInstrumentInput(p,protectedTrack));assert.equal(active.key,base.key);assert.equal(active.cached,true);
 }
 t.diagnostic(JSON.stringify({plain:plain.key,groove:first.key,artifacts:'temp/task31/'}));
});
