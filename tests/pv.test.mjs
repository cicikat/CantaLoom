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


test('HTML export discriminant validates snapshot binding and preserves old PNG parsing',async()=>{
 const {exportInput}=await import('../shared/contracts/index.mjs');const p=pvProject(),d=pvDesign(p),base={wav:'UklGRg==',duration:25,title:p.title,lyrics:p.lyrics.map(l=>({text:l.text,start:l.start*60/p.bpm,end:l.end*60/p.bpm})),style:'cinema',singingCredit:'demo'};
 const old={...base,scenes:p.sections.map(s=>({png:'AAAA',duration:s.beats*60/p.bpm}))};assert.deepEqual(exportInput.parse(old),old);
 const html={...base,visualMode:'html',pvProject:p,pvDesign:d,inputFingerprint:await pvFingerprint(p)};assert.deepEqual(exportInput.parse(html),html);
 for(const change of [{visualMode:'unknown'},{pvDesign:{...d,script:'evil'}},{title:'forged'},{lyrics:[]},{duration:24},{scenes:old.scenes}])assert.throws(()=>exportInput.parse({...html,...change}));
});

test('HTML resource disabled leaves Canvas HTTP export available; stale design and failures release lock',async()=>{
 const {mountExport}=await import('../server/routes/export.mjs'),{mkdtemp,writeFile}=await import('node:fs/promises'),{tmpdir}=await import('node:os'),path=await import('node:path');
 const p=pvProject(),d=pvDesign(p),wav=Buffer.from('RIFF1234WAVEexplicit fixture').toString('base64'),base={wav,duration:25,title:p.title,lyrics:p.lyrics.map(l=>({text:l.text,start:l.start*60/p.bpm,end:l.end*60/p.bpm})),style:'cinema'};
 let calls=0;const video={ready:true,render:async()=>{calls++;const directory=await mkdtemp(path.join(tmpdir(),'songyu-test-'));const file=path.join(directory,'test.mp4');await writeFile(file,'HTTP binary transport fixture, not an actual MP4');return {directory,file}}};
 const app=express();app.use(express.json());mountExport(app,video);const server=app.listen(0,'127.0.0.1');await once(server,'listening');const url=`http://127.0.0.1:${server.address().port}/api/export`,prior=process.env.SONGYU_HTML_PV_DISABLED;process.env.SONGYU_HTML_PV_DISABLED='1';
 try{const post=body=>fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}),html={...base,visualMode:'html',pvProject:p,pvDesign:d,inputFingerprint:'0'.repeat(64)};assert.equal((await post(html)).status,400);html.inputFingerprint=await pvFingerprint(p);assert.equal((await post(html)).status,503);assert.equal(calls,0);const old={...base,scenes:p.sections.map(s=>({png:'AAAA',duration:s.beats*60/p.bpm}))};const response=await post(old);assert.equal(response.status,200);assert.match(await response.text(),/transport fixture/);assert.equal(calls,1)}finally{if(prior===undefined)delete process.env.SONGYU_HTML_PV_DISABLED;else process.env.SONGYU_HTML_PV_DISABLED=prior;await new Promise(r=>server.close(r))}
});


test('PV admin route keys persist encrypted, snapshots redact prompts without losing them on form save',async()=>{
 const {createConfigStore}=await import('../server/admin-config.mjs'),{mkdtemp,mkdir,readFile,rm}=await import('node:fs/promises'),path=await import('node:path');await mkdir('temp/task35-config',{recursive:true});const directory=await mkdtemp(path.resolve('temp/task35-config/store-')),local={};
 try{const store=await createConfigStore({directory,env:local,protect:async value=>Buffer.from(value).toString('base64'),unprotect:async value=>Buffer.from(value,'base64').toString()});await store.update({LLM_ROUTES:JSON.stringify({pv_design:{...route,keyRef:'SONGYU_ROUTE_PV_DESIGN',systemPrompt:'private director prompt'}}),routeKeys:{pv_design:'secret-pv-route-key'}});const snapshot=store.snapshot();assert.ok(!JSON.stringify(snapshot).includes('private director prompt'));assert.ok(!JSON.stringify(snapshot).includes('secret-pv-route-key'));assert.ok(!(await readFile(path.join(directory,'settings.json'),'utf8')).includes('secret-pv-route-key'));await store.update({LLM_ROUTES:snapshot.values.LLM_ROUTES});assert.equal(JSON.parse(local.LLM_ROUTES).pv_design.systemPrompt,'private director prompt');const next={};await createConfigStore({directory,env:next,protect:async value=>Buffer.from(value).toString('base64'),unprotect:async value=>Buffer.from(value,'base64').toString()});assert.equal(next.SONGYU_ROUTE_PV_DESIGN,'secret-pv-route-key')}
 finally{if(!path.resolve(directory).startsWith(path.resolve('temp/task35-config')+path.sep))throw Error('Unsafe cleanup');await rm(directory,{recursive:true,force:true})}
});


test('PV model request limiter rejects overlap and releases after success',async()=>{
 let entered,release;const entry=new Promise(r=>entered=r),gate=new Promise(r=>release=r);const app=express();app.use(express.json());mountPv(app,{env,request:async()=>{entered();await gate;return {ok:true,json:async()=>({choices:[{message:{content:JSON.stringify(pvDesign(pvProject()))}}]})}}});const server=app.listen(0,'127.0.0.1');await once(server,'listening');
 try{const post=()=>fetch(`http://127.0.0.1:${server.address().port}/api/pv/design`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({project:pvProject()})});const first=post();await entry;assert.equal((await post()).status,429);release();assert.equal((await first).status,200);assert.equal((await post()).status,200)}finally{release();await new Promise(r=>server.close(r))}
});
