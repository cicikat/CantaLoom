import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,rm,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {z} from 'zod';
import {createTaskRouter,routingHistory} from '../server/services/llm-router.mjs';
import {createFreeComposer} from '../server/services/free-composition.mjs';
import {createProduction,productionDetails,serializeProductionJob} from '../server/services/production.mjs';
import {fingerprint,openCheckpoints} from '../server/services/production-checkpoints.mjs';
import {inspectPcm,createProductionMixer} from '../server/services/production-mix.mjs';
import {runProcess} from '../server/services/instruments.mjs';
import {localMelody} from '../shared/melody.mjs';

const songPlan={key:{tonic:'C',mode:'major'},emotion:'calm',intensity:.5,chordProgression:[1,5,6,4],
 drumDensity:'steady',melodyContour:'arch',melodyRange:'medium',
 sectionEnergy:{intro:.4,verse:.5,chorus:.8,outro:.4},reasons:[{decision:'energy',reason:'测试'}]};
const input={intent:'夹具测试',lyrics:['风吹过，','灯亮了。'],bpm:96,targetSeconds:25};
const plan={version:1,title:'夹具',mood:'平静',songPlan,phraseWeights:[1,1]};
const upstream=(content,finish_reason)=>Response.json({choices:[{message:{content},finish_reason}]});

test('classified model errors, diagnostics, lossless repair, and bounded configured fallback',async()=>{
 const primary={provider:'fixture',baseUrl:'https://example.invalid',model:'main',keyRef:'PRIMARY',
  structuredOutputMode:'json_schema',backupConnection:'spare',maxOutputTokens:512};
 const backup={...primary,model:'backup',keyRef:'BACKUP',structuredOutputMode:'text_json'};
 const env={PRIMARY:'private-primary',BACKUP:'private-backup',LLM_ROUTES:JSON.stringify({lyrics_planning:primary}),LLM_CONNECTIONS:JSON.stringify({spare:backup})};
 const schema=z.object({phrases:z.array(z.object({duration:z.number()}))}).strict();
 const options={schema,input:{},system:'fixture',attempts:3};
 const requests=[];
 const request=async(_url,init)=>{
  requests.push(JSON.parse(init.body));
  if(requests.length===1)return Response.json({error:{param:'response_format',code:'unsupported_value'}},{status:400});
  if(requests.length===2)return upstream('{"phrases":[{"duration":"wrong"}]}');
  return upstream('\ufeff```json\n{"phrases":[{"duration":1}]}\n```');
 };
 const result=await createTaskRouter({env,request}).run('lyrics_planning',options);
 assert.deepEqual(requests.map(body=>body.response_format?.type),['json_schema',undefined,undefined]);
 assert.equal(requests[0].max_tokens,512);
 assert.match(requests[2].messages.at(-1).content,/phrases\[0\]\.duration/);
 assert.equal(result.trace.details[2].repaired,true);
 assert.equal(result.trace.details[2].backup,true);
 assert.equal(result.trace.cost,null);
 assert.doesNotMatch(JSON.stringify(routingHistory()),/private-primary|private-backup|wrong/);
 for(const [response,code] of [
  [()=>upstream('   '),'EMPTY_CONTENT'],[()=>upstream('{}','length'),'OUTPUT_TRUNCATED'],
  [()=>upstream('{'),'JSON_PARSE_FAILED'],[()=>upstream('{}'),'SCHEMA_VALIDATION_FAILED'],
  [()=>Response.json({}, {status:401}),'UPSTREAM_AUTH'],[()=>Response.json({}, {status:403}),'UPSTREAM_AUTH'],
  [()=>Response.json({}, {status:400}),'UPSTREAM_REJECTED'],[()=>Response.json({}, {status:503}),'UPSTREAM_UNAVAILABLE'],
  [()=>Response.json({}, {status:429}),'UPSTREAM_RATE_LIMIT'],
 ]){
  await assert.rejects(createTaskRouter({env,request:response}).run('lyrics_planning',{...options,attempts:1}),error=>error.code===code);
 }
});

test('one-click melody repair preserves hand-written text and passes the full music validator',async()=>{
 let calls=0;
 const composer=createFreeComposer({env:{LLM_API_KEY:'fixture'},request:async(_url,init)=>{
  calls++;
  const request=JSON.parse(init.body),data=JSON.parse(request.messages[1].content);
  if(calls===1)return upstream(JSON.stringify(plan));
  const phrases=data.phrases.map(phrase=>({id:phrase.phraseId,text:phrase.lyricChars.join(''),start:phrase.start,end:phrase.end,notes:[]}));
  const draft=localMelody({...data,phrases});
  const compact={version:1,phrases:draft.phrases.map(phrase=>{
   let index=0;
   return {phraseId:phrase.id,motif:phrase.motif,notes:phrase.notes.map(note=>({
    offset:note.beat-phrase.start,duration:note.duration,midi:note.midi,lyricIndex:note.syllable==='+'?-1:index++,
   }))};
  })};
  if(calls===2)compact.phrases[0].notes[0].midi=61;
  else assert.match(request.messages.at(-1).content,/调式|和弦/);
  return upstream(JSON.stringify(compact));
 }});
 const result=await composer.compose(input);
 assert.equal(calls,3);
 assert.equal(result.plan.bpm,input.bpm);
 assert.deepEqual(result.draft.phrases.map(phrase=>phrase.text),input.lyrics);
});

async function settled(job){
 for(let count=0;count<300&&job.state==='running';count++)await new Promise(resolve=>setTimeout(resolve,5));
 assert.notEqual(job.state,'running');
}
test('restart keeps validated planning and rejects concurrent resume; failed mixing reuses all stems',async()=>{
 const directory=await mkdtemp(path.join(tmpdir(),'cantaloom-production-'));
 let plans=0,melodies=0,sings=0,bands=0,mixes=0,failMelody=true,failMix=true;
 const options={directory,env:{},compose:createFreeComposer({
  env:{LLM_API_KEY:'fixture'},request:async()=>{plans++;return upstream(JSON.stringify(plan))},
  melody:{async compose(request){
   melodies++;
   if(failMelody)throw Error('fixture melody failure');
   return {draft:{...localMelody(request),source:'llm'}};
  }},
 }),renderer:{status:async()=>({ready:true}),render:async()=>({audioUrl:'fixture-band-'+(++bands)})},
 voiceStatus:async()=>({available:true,engineVersion:'fixture'}),
 sing:async()=>({audioUrl:'fixture-vocal-'+(++sings),engineVersion:'fixture'}),
 mixer:{assetHash:async asset=>fingerprint(asset.audioUrl),async mix(_job,destination){
  mixes++;
  if(failMix)throw Error('fixture mixing failure');
  const bytes=Buffer.from('fixture artifact');
  await writeFile(destination,bytes);
  return {sha256:fingerprint(bytes)};
 }}};
 try{
  const started=createProduction(options).start(input);
  await settled(started);
  const checkpoint=openCheckpoints(directory);
  const interrupted=checkpoint.jobs.get(started.id);
  interrupted.state='running';checkpoint.save(interrupted);
  const recovered=createProduction(options);
  assert.equal(productionDetails(recovered.get(started.id)).state,'interrupted');
  failMelody=false;
  const job=recovered.resume(started.id);
  assert.throws(()=>recovered.resume(started.id));
  await settled(job);
  assert.equal(job.phase,'mixing');
  assert.equal(job.state,'failed');
  assert.equal(plans,1);
  assert.equal(melodies,2);
  const rendered=bands;
  failMix=false;
  const final=createProduction(options);
  await settled(final.resume(started.id));
  assert.equal(final.get(started.id).phase,'completed');
  assert.equal(serializeProductionJob(final.get(started.id)).stage,'ready-for-mix');
  assert.deepEqual([plans,melodies,sings,bands,mixes],[1,2,2,rendered,2]);
  assert.ok(await final.artifact(started.id));
  await writeFile(checkpoint.artifact(started.id),'corrupted');
  assert.equal(await final.artifact(started.id),null);
  assert.equal(productionDetails(final.get(started.id)).errorCode,'ARTIFACT_INVALID');
 }finally{await rm(directory,{recursive:true,force:true})}
});

test('FFmpeg mixes deterministic fixture stems and validates real stereo PCM bytes',async t=>{
 const binary=process.env.FFMPEG_PATH||'ffmpeg';
 try{await runProcess(binary,['-version'],process.cwd(),5000)}
 catch{return t.skip('FFmpeg unavailable')}
 const directory=await mkdtemp(path.join(tmpdir(),'cantaloom-mix-'));
 try{
  const assets=[];
  for(const frequency of [440,550]){
   const key=fingerprint(String(frequency));
   await runProcess(binary,['-y','-f','lavfi','-i','sine=frequency='+frequency+':duration=1',key+'.wav'],directory);
   assets.push({audioUrl:'/api/audio/'+key+'.wav',startSeconds:1});
  }
  const job={instrumentAssets:{band:assets[0]},project:{bpm:96,sections:[{start:0,beats:40}],
   mixSettings:{enabled:true,reverb:.08},lyrics:[{id:'vocals'}],vocalAssets:{vocals:assets[1]}}};
  const destination=path.join(directory,'mix.wav');
  const qa=await createProductionMixer({binary:()=>binary,directory}).mix(job,destination);
  assert.equal(qa.channels,2);
  assert.equal(qa.durationSeconds,25);
  assert.ok(qa.truePeakDbtp<0);
  assert.equal(inspectPcm(await readFile(destination)).sha256,qa.sha256);
  assert.throws(()=>inspectPcm(Buffer.alloc(44)));
 }finally{await rm(directory,{recursive:true,force:true})}
});
