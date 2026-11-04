import {test} from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import {createPlanner} from '../server/planner.mjs';
const valid={title:'接口夹具',mood:'沉静',lyrics:['这是测试第一句','这是测试第二句','这是测试第三句','这是测试第四句'],songPlan:{key:{tonic:'A',mode:'minor'},emotion:'melancholic',intensity:.3,chordProgression:[1,6,3,7],drumDensity:'sparse',melodyContour:'falling',melodyRange:'narrow',sectionEnergy:{intro:.2,verse:.3,chorus:.5,outro:.2},reasons:[{decision:'key',reason:'测试夹具：孤独对应小调。'}]}};
async function route(planner,fn){const app=express();app.use(express.json());app.post('/api/plan',planner.handle);const server=app.listen(0,'127.0.0.1');await new Promise(resolve=>server.once('listening',resolve));try{await fn(`http://127.0.0.1:${server.address().port}/api/plan`)}finally{await new Promise(resolve=>server.close(resolve))}}
const post=url=>fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({idea:'孤独安静',style:'海盐汽水'})});
test('API validates upstream music and only marks verified after a valid response (fixture)',async()=>{
 let mode='valid',sent;
 const planner=createPlanner({env:{LLM_API_KEY:'test-fixture-only',LLM_BASE_URL:'http://fixture.invalid/v1',LLM_MODEL:'fixture'},request:async(_url,init)=>{sent=JSON.parse(init.body);if(mode==='timeout')throw new DOMException('Timeout','TimeoutError');if(mode==='http')return new Response('{}',{status:500});const output=structuredClone(valid);if(mode==='invalid')output.songPlan.intensity=10;return Response.json({choices:[{message:{content:mode==='text'?'not-json':JSON.stringify(output)}}]})}});
 assert.equal(planner.status(),'unverified');await route(planner,async url=>{let res=await post(url);assert.equal(res.status,200);const body=await res.json();assert.equal(body.source,'llm');assert.equal(body.songPlan.key.mode,'minor');assert.equal(planner.status(),'verified');assert.ok(sent.messages[0].content.includes('chordProgression'));
 for(mode of ['invalid','text','timeout','http']){res=await post(url);assert.equal(res.status,502);assert.equal(planner.status(),'unverified');assert.ok(!(await res.text()).includes('test-fixture-only'));}
 const invalid=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({idea:'',style:'任意'})});assert.equal(invalid.status,400);});
});
test('API without key reports local and never invokes an upstream provider',async()=>{const planner=createPlanner({env:{},request:()=>{throw Error('unexpected upstream')}});assert.equal(planner.status(),'local');await route(planner,async url=>assert.equal((await post(url)).status,503))});
