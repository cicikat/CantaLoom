import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {createApiClient} from '../src/api/client';
import {createProject} from '../src/composer';
import {applyVocalResult} from '../src/features/singing/qixuan';
import {singingDependency} from '../src/singing';
import {validateProject,type VocalAsset} from '../src/model';
import {readProject} from '../src/features/project/files';
import {qixuanInput,qixuanResultSchema,instrumentInput,type GenerationTask} from '../shared/contracts/index.mjs';

test('shared inputs reject invalid notes, runners and filesystem paths in audio requests',async()=>{
 const p=createProject(),l=p.lyrics[0];const input={lyricId:l.id,lyrics:l.text,start:l.start,end:l.end,bpm:p.bpm,notes:l.notes,engineVersion:'fixture'};
 assert.equal(qixuanInput.parse(input).runner,'CPU');
 assert.throws(()=>qixuanInput.parse({...input,runner:'CUDA'}));
 assert.throws(()=>instrumentInput.parse({bpm:120,kind:'vocal',notes:[],endBeat:16}));
 let called=false;const client=createApiClient({request:async()=>{called=true;return Response.json({})}});
 await assert.rejects(()=>client.audio('/api/audio/../../secret.wav'));assert.equal(called,false);
});

test('project import preserves legacy JSON and prevents Mock files entering the real workflow',async()=>{
 const p=createProject();delete p.songPlan;delete p.planning;p.tracks[0].locked=true;
 const file=(p:unknown)=>new File([JSON.stringify(p)],'project.songyu.json',{type:'application/json'});
 assert.deepEqual(await readProject(file(p)),p);
 const mock=structuredClone(p);mock.planning={source:'local-rules',mock:true,appliedAt:'2026-01-01T00:00:00.000Z',compatibility:[]};await assert.rejects(()=>readProject(file(mock)),/MOCK 测试工程/);
});

test('client applies base URL, rejects invalid responses and centralizes task success/failure',async()=>{
 const tasks:GenerationTask[]=[];let mode='valid',seen='';const client=createApiClient({baseUrl:'http://fixture.local/',onTask:t=>tasks.push(t),request:async(url)=>{
  seen=String(url);if(mode==='http')return Response.json({error:'fixture failure'},{status:503});if(mode==='invalid')return Response.json({audioUrl:'https://foreign.invalid/x.wav'});
   return Response.json({audioUrl:`/api/audio/${'a'.repeat(64)}.wav`,key:'a'.repeat(64),providerId:'fluidsynth',soundfont:'fixture.sf2',sampleRate:48000,startSeconds:0,cached:false});
 }});
 const input={bpm:120,kind:'keys' as const,notes:[],endBeat:16};
 await client.instruments(input);assert.equal(seen,'http://fixture.local/api/instruments/render');assert.deepEqual(tasks.map(t=>t.state),['running','succeeded']);
 for(mode of ['http','invalid']){tasks.length=0;await assert.rejects(()=>client.instruments(input),mode==='http'?/fixture failure/:/响应格式无效/);assert.deepEqual(tasks.map(t=>t.state),['running','failed'])}
 const real=createApiClient({request:async()=>Response.json({llm:true,ffmpeg:true,llmStatus:'unverified',mock:true})});await assert.rejects(()=>real.health());
});

test('Mock covers planning, voice, rendering, audio and export without any network or model',async()=>{
 const tasks:GenerationTask[]=[];const client=createApiClient({mode:'mock',request:()=>{throw Error('Mock leaked network')},onTask:t=>tasks.push(t)});
 assert.equal((await client.health()).mock,true);assert.equal((await client.engines()).mock,true);
 const a=await client.plan({idea:'一种想法',style:'海盐汽水'}),b=await client.plan({idea:'完全不同',style:'橘子摇滚'});assert.deepEqual(a,b);assert.equal(a.mock,true);
 const p=createProject(),l=p.lyrics[0],voice=await client.qixuan();assert.ok(voice.available);
 const input={lyricId:l.id,lyrics:l.text,start:l.start,end:l.end,bpm:p.bpm,notes:l.notes,engineVersion:voice.engineVersion};
 const song=await client.sing(input);assert.equal(song.isDemo,true);assert.equal(song.mock,true);assert.equal((await client.sing(input)).cached,true);assert.notEqual((await client.sing({...input,take:1})).audioUrl,song.audioUrl);
 const pcm=await client.audio(song.audioUrl);assert.equal(new TextDecoder().decode(pcm.slice(0,4)),'RIFF');assert.ok(pcm.byteLength>1000);
 const instrument=await client.instruments({bpm:120,kind:'keys',notes:[],endBeat:16});assert.equal(instrument.mock,true);
 const blob=await client.exportVideo({wav:'UklGRg==',scenes:Array.from({length:4},()=>({png:'AAAA',duration:5})),duration:20,lyrics:[],title:'MOCK',style:'cinema'});assert.equal(blob.type,'application/json');assert.equal(JSON.parse(await blob.text()).state,'succeeded');assert.ok(tasks.every(t=>t.mock));
});

test('client timeout covers a stalled response body and fails the generation task',async()=>{
 const server=createServer((_req,res)=>{res.writeHead(200,{'Content-Type':'application/json'});res.write('{');const timer=setTimeout(()=>res.end('}'),1000);res.on('close',()=>clearTimeout(timer))});
 await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve));
 const tasks:GenerationTask[]=[];const address=server.address() as import('node:net').AddressInfo;
 try{const client=createApiClient({baseUrl:`http://127.0.0.1:${address.port}`,timeoutMs:100,onTask:t=>tasks.push(t)});await assert.rejects(()=>client.instruments({bpm:120,kind:'keys',notes:[],endBeat:16}),/请求超时/);assert.deepEqual(tasks.map(t=>t.state),['running','failed'])}
 finally{server.closeAllConnections();await new Promise<void>(resolve=>server.close(()=>resolve()))}
});

test('vocal result transaction preserves siblings and rejects stale notes, runner, locks or removed lines',()=>{
 const p=createProject(),l=p.lyrics[0],voice={id:'qixuan',version:'2.7.0',label:'fixture',providerId:'openutau-diffsinger' as const,engineVersion:'fixture',renderParameters:{runner:'CPU' as const,steps:20,depth:.6}};
 const asset:VocalAsset={audioUrl:`/api/audio/${'a'.repeat(64)}.wav`,dependency:singingDependency(p,l,voice),voiceId:voice.id,voiceVersion:voice.version,providerId:voice.providerId,engineVersion:voice.engineVersion,renderParameters:voice.renderParameters,startSeconds:l.start*60/p.bpm,durationSeconds:(l.end-l.start)*60/p.bpm+.4,isDemo:false,projectVersion:p.metadata.updatedAt};
 const applied=applyVocalResult(p,l.id,asset);assert.ok(!p.vocalAssets);assert.equal(validateProject(applied),applied);
 assert.throws(()=>applyVocalResult({...p,id:'different-project'},l.id,asset,p.id));
 // Runtime Schema parsing changes object insertion order; legacy cache keys must survive it.
 const parsed=qixuanResultSchema.parse({...asset,key:'a'.repeat(64),take:0,cached:false,createdAt:'2026-01-01T00:00:00Z'});
 assert.ok(applyVocalResult(p,l.id,{...asset,...parsed}).vocalAssets![l.id]);
 const sibling=structuredClone(applied);sibling.lyrics[1].text='只修改第二句';assert.deepEqual(applyVocalResult(sibling,l.id,asset).vocalAssets![l.id],asset);
 for(const edit of [(p:typeof applied)=>{p.lyrics[0].notes[0].midi++},(p:typeof applied)=>{p.singingRunner='DirectML'},(p:typeof applied)=>{p.lyrics[0].locked=true},(p:typeof applied)=>{p.lyrics.shift()},(p:typeof applied)=>{p.tracks.find(t=>t.kind==='vocal'&&t.sectionId===l.sectionId)!.locked=true}]){const next=structuredClone(applied);edit(next);const before=JSON.stringify(next);assert.throws(()=>applyVocalResult(next,l.id,asset));assert.equal(JSON.stringify(next),before)}
 let history=applied;for(const letter of ['b','c','d','e'])history=applyVocalResult(history,l.id,{...asset,audioUrl:`/api/audio/${letter.repeat(64)}.wav`});assert.equal(history.vocalHistory![l.id].length,3);assert.equal(history.vocalHistory![l.id][0].audioUrl,`/api/audio/${'d'.repeat(64)}.wav`);
});
