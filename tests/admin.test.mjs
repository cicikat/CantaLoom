import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile,rm} from 'node:fs/promises';
import {temporaryDirectory} from './support/temp.mjs';
import path from 'node:path';
import express from 'express';
import http from 'node:http';
import {createConfigStore,settingsSchema,dpapi} from '../server/admin-config.mjs';
import {createJobs,mountAdmin} from '../server/admin.mjs';
test('encrypted config persists without key disclosure; blank retains, explicit clear survives restart, invalid save is atomic',async()=>{
 const directory=await temporaryDirectory('songyu-admin-');const env={};const options={directory,env,protect:async x=>'encrypted:'+Buffer.from(x).toString('base64'),unprotect:async x=>Buffer.from(x.slice(10),'base64').toString()};
 try{const store=await createConfigStore(options);await store.update({LLM_API_KEY:'test-secret-only',LLM_BASE_URL:'https://provider.example/v1',LLM_MODEL:'test-model'});assert.equal(env.LLM_API_KEY,'test-secret-only');assert.ok(!JSON.stringify(store.snapshot()).includes('test-secret-only'));assert.ok(!(await readFile(path.join(directory,'settings.json'),'utf8')).includes('test-secret-only'));await store.update({LLM_API_KEY:''});assert.equal(env.LLM_API_KEY,'test-secret-only');
 const reloadEnv={};await createConfigStore({...options,env:reloadEnv});assert.equal(reloadEnv.LLM_API_KEY,'test-secret-only');const before=await readFile(path.join(directory,'settings.json'),'utf8');await assert.rejects(store.update({LLM_BASE_URL:'https://user:password@example.com/v1?api_key=secret'}));assert.equal(await readFile(path.join(directory,'settings.json'),'utf8'),before);await store.update({clearKey:true});const cleared={LLM_API_KEY:'from-env'};await createConfigStore({...options,env:cleared});assert.equal(cleared.LLM_API_KEY,undefined);
 }finally{await rm(directory,{recursive:true,force:true})}
});
test('Windows DPAPI roundtrip never writes plaintext (real OS crypto)',{skip:process.platform!=='win32'},async()=>{const secret='TEST-ONLY-'+Date.now();const protectedValue=await dpapi(secret);assert.ok(!protectedValue.includes(secret));assert.equal(await dpapi(protectedValue,true),secret)});
test('admin blocks foreign hosts/origins and missing CSRF; masks secrets, tracks actual jobs and sanitizes upstream failures',async()=>{
 const directory=await temporaryDirectory('songyu-admin-api-');const store=await createConfigStore({directory,env:{LLM_API_KEY:'snapshot-secret'}});const jobs=createJobs(),app=express();app.use(express.json());app.use(jobs.middleware);mountAdmin(app,{store,jobs,root:directory,publicDirectory:directory,request:async()=>{throw Error('upstream secret raw response')}});app.post('/api/instruments/render',(_req,res)=>res.status(503).json({error:'fixture failure'}));const server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));const base=`http://127.0.0.1:${server.address().port}`;
 try{let r=await fetch(base+'/api/admin/state');const raw=await r.text();assert.ok(!raw.includes('snapshot-secret'));const state=JSON.parse(raw);const headers={'Content-Type':'application/json','X-SONGYU-CSRF':state.csrf};
 assert.equal((await fetch(base+'/api/admin/config',{method:'PUT',headers:{'Content-Type':'application/json'},body:'{}'})).status,403);assert.equal((await fetch(base+'/api/admin/config',{method:'PUT',headers:{...headers,Origin:'https://evil.example'},body:'{}'})).status,403);assert.equal(await new Promise((resolve,reject)=>{http.get(base+'/api/admin/state',{headers:{Host:'evil.example'}},r=>{r.resume();resolve(r.statusCode)}).on('error',reject)}),403);
 assert.equal((await fetch(base+'/api/admin/config',{method:'PUT',headers,body:JSON.stringify({LLM_MODEL:'saved-model'})})).status,200);assert.equal(store.snapshot().values.LLM_MODEL,'saved-model');
 await fetch(base+'/api/instruments/render',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});assert.equal(jobs.list()[0].state,'failed');assert.equal(jobs.list()[0].httpStatus,503);
 r=await fetch(base+'/api/admin/check',{method:'POST',headers,body:JSON.stringify({kind:'llm'})});assert.equal(r.status,502);assert.ok(!(await r.text()).includes('upstream secret'));
 r=await fetch(base+'/api/admin/resources');const resources=await r.json();assert.ok(resources.some(g=>g.name==='soundfonts'));assert.ok(!JSON.stringify(resources).includes('settings.json'));
 }finally{await new Promise(r=>server.close(r));await rm(directory,{recursive:true,force:true})}
});
test('config only accepts credential-free HTTPS or loopback HTTP roots',()=>{assert.ok(settingsSchema.safeParse({LLM_BASE_URL:'http://127.0.0.1:3456/v1'}).success);for(const url of ['file:///tmp','http://remote.example','https://example.com?token=secret'])assert.ok(!settingsSchema.safeParse({LLM_BASE_URL:url}).success)});

test('admin serves the browser diagnostic bundle and allows local media blobs while retaining script and framing boundaries',async()=>{
 const app=express();mountAdmin(app,{store:{snapshot:()=>({})},jobs:createJobs(),root:process.cwd(),publicDirectory:path.resolve('server/public')});
 const server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));const base=`http://127.0.0.1:${server.address().port}`;
 try{const page=await fetch(base+'/admin');assert.equal(page.status,200);const csp=page.headers.get('content-security-policy');assert.ok(csp.includes("media-src 'self' blob:"));assert.ok(csp.includes("script-src 'self';"));assert.ok(csp.includes("frame-ancestors 'none'"));assert.equal(page.headers.get('cache-control'),'no-store');
 const module=await fetch(base+'/admin-assets/admin-pipeline.js');assert.equal(module.status,200);assert.match(module.headers.get('content-type'),/javascript/);assert.match(await module.text(),/Generated by node scripts\/build-admin/);
 assert.equal((await fetch(base+'/admin-assets/admin-config.mjs')).status,404);
 }finally{await new Promise(r=>server.close(r))}
});

test('admin preview requires CSRF, validates MP4 and returns a video response',async()=>{
 let calls=0;const app=express();app.use(express.json());mountAdmin(app,{store:{snapshot:()=>({})},jobs:createJobs(),root:process.cwd(),publicDirectory:path.resolve('server/public'),previewVideo:async bytes=>{calls++;assert.equal(bytes.subarray(4,8).toString(),'ftyp');return Buffer.from('webm-fixture')}});
 const server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));const base=`http://127.0.0.1:${server.address().port}`;
 try{const {csrf}=await (await fetch(base+'/api/admin/state')).json();const headers={'Content-Type':'application/json','X-SONGYU-CSRF':csrf};
 assert.equal((await fetch(base+'/api/admin/preview',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'})).status,403);
 assert.equal((await fetch(base+'/api/admin/preview',{method:'POST',headers,body:JSON.stringify({mp4:Buffer.from('invalid video').toString('base64')})})).status,400);assert.equal(calls,0);
 const response=await fetch(base+'/api/admin/preview',{method:'POST',headers,body:JSON.stringify({mp4:Buffer.from('0000ftypmp42').toString('base64')})});assert.equal(response.status,200);assert.match(response.headers.get('content-type'),/video\/webm/);assert.equal(await response.text(),'webm-fixture');assert.equal(calls,1);
 }finally{await new Promise(r=>server.close(r))}
});

test('model discovery uses draft credentials, requires CSRF and sanitizes provider failures',async()=>{
 const app=express();app.use(express.json());let fail=false;
 mountAdmin(app,{store:{snapshot:()=>({})},jobs:createJobs(),root:process.cwd(),publicDirectory:path.resolve('server/public'),request:async(url,options)=>{assert.equal(url,'https://provider.example/v1/models');assert.equal(options.headers.Authorization,'Bearer draft-secret');if(fail)throw Error('private upstream draft-secret');return {ok:true,json:async()=>({data:[{id:'b'},{id:'a'},{id:'a'}]})}}});
 const server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));const base=`http://127.0.0.1:${server.address().port}`;
 try{const {csrf}=await (await fetch(base+'/api/admin/state')).json();const body=JSON.stringify({task:'default',baseUrl:'https://provider.example/v1',apiKey:'draft-secret'});assert.equal((await fetch(base+'/api/admin/models',{method:'POST',headers:{'Content-Type':'application/json'},body})).status,403);const headers={'Content-Type':'application/json','X-SONGYU-CSRF':csrf};assert.deepEqual(await (await fetch(base+'/api/admin/models',{method:'POST',headers,body})).json(),{models:['a','b']});fail=true;const response=await fetch(base+'/api/admin/models',{method:'POST',headers,body});assert.equal(response.status,502);assert.ok(!(await response.text()).includes('draft-secret'))}finally{await new Promise(r=>server.close(r))}
});
