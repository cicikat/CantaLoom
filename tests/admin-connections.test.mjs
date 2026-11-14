import {test} from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import {mkdir,mkdtemp,readFile,rm} from 'node:fs/promises';
import path from 'node:path';
import {createConfigStore} from '../server/admin-config.mjs';
import {mountAdmin,createJobs} from '../server/admin.mjs';
import {createMelodyComposer} from '../server/services/melody.mjs';
import {localMelody} from '../shared/melody.mjs';
const plan={key:{tonic:'C',mode:'major'},emotion:'calm',intensity:.5,chordProgression:[1,5,6,4],drumDensity:'steady',melodyContour:'arch',melodyRange:'medium',sectionEnergy:{intro:.4,verse:.5,chorus:.8,outro:.4},reasons:[{decision:'energy',reason:'测试夹具'}]};
test('real melody prompt excludes fixture flag and retries contaminated outputs',async()=>{
 const input={intent:'测试',bpm:96,songPlan:plan,phrases:[{id:'p',text:'风',start:0,end:4,notes:[]}],source:'llm'};
 const draft={...localMelody({...input,source:'local-rules'}),source:'llm'};delete draft.mock;
 let calls=0;
 const composer=createMelodyComposer({env:{LLM_API_KEY:'fixture'},request:async(_,init)=>{const prompt=JSON.parse(init.body).messages[0].content;assert.ok(!prompt.includes('"mock"'));calls++;return {ok:true,json:async()=>({choices:[{message:{content:JSON.stringify(calls===1?{...draft,mock:true}:draft)}}]})}}});
 const result=await composer.compose(input);assert.equal(calls,2);assert.equal(result.draft.mock,undefined);
});
test('connections encrypt independent keys, survive reload and ping without leaking provider output',async()=>{
 await mkdir(path.resolve('temp'),{recursive:true});
 const directory=await mkdtemp(path.resolve('temp/admin-connections-test-')),env={};
 const options={directory,env,protect:async s=>Buffer.from(s).toString('base64'),unprotect:async s=>Buffer.from(s,'base64').toString()};
 const route={provider:'fixture',baseUrl:'https://example.invalid/v1',model:'fixture-model',keyRef:'SONGYU_CONNECTION_MAIN'};
 try{const store=await createConfigStore(options);await store.update({LLM_CONNECTIONS:JSON.stringify({main:route}),connectionKeys:{main:'independent-fixture-secret'}});assert.ok(!(await readFile(path.join(directory,'settings.json'),'utf8')).includes('independent-fixture-secret'));const reloaded={};await createConfigStore({...options,env:reloaded});assert.equal(reloaded.SONGYU_CONNECTION_MAIN,'independent-fixture-secret');assert.ok(!JSON.stringify(store.snapshot()).includes('independent-fixture-secret'));
 const old={connections:process.env.LLM_CONNECTIONS,key:process.env.SONGYU_CONNECTION_MAIN};process.env.LLM_CONNECTIONS=env.LLM_CONNECTIONS;process.env.SONGYU_CONNECTION_MAIN=env.SONGYU_CONNECTION_MAIN;
 let fail=false;const app=express();app.use(express.json());mountAdmin(app,{store,jobs:createJobs(),root:directory,publicDirectory:path.resolve('server/public'),request:async(url,init)=>{assert.equal(url,'https://example.invalid/v1/chat/completions');assert.equal(init.headers.Authorization,'Bearer independent-fixture-secret');assert.equal(JSON.parse(init.body).model,'fixture-model');if(fail)throw Error('private upstream body');return {ok:true,json:async()=>({choices:[{message:{content:'private provider text'}}]})}}});const server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));const base=`http://127.0.0.1:${server.address().port}`;
 try{const {csrf}=await (await fetch(base+'/api/admin/state')).json();const headers={'Content-Type':'application/json','X-SONGYU-CSRF':csrf};const body=JSON.stringify({connectionId:'main'});assert.equal((await fetch(base+'/api/admin/ping',{method:'POST',headers:{'Content-Type':'application/json'},body})).status,403);const result=await fetch(base+'/api/admin/ping',{method:'POST',headers,body});assert.equal(result.status,200);const text=await result.text();assert.ok(text.includes('reachable'));assert.ok(!text.includes('private provider text'));fail=true;const failed=await fetch(base+'/api/admin/ping',{method:'POST',headers,body});assert.equal(failed.status,502);assert.ok(!(await failed.text()).includes('private upstream body'))}finally{await new Promise(r=>server.close(r));for(const [key,value] of [['LLM_CONNECTIONS',old.connections],['SONGYU_CONNECTION_MAIN',old.key]])if(value===undefined)delete process.env[key];else process.env[key]=value}
 }finally{await rm(directory,{recursive:true,force:true})}
});
