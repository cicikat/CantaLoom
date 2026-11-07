import {realAcceptance} from './support/tier.mjs';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdir,mkdtemp,readFile,writeFile,rm} from 'node:fs/promises';
import path from 'node:path';
import express from 'express';
import {InstrumentRenderer,cacheRoot,runProcess} from '../server/services/instruments.mjs';
import {mountArtifacts} from '../server/routes/instruments.mjs';
import {measureLoudness,normalizationFilter} from '../server/services/loudness.mjs';
import {createVideoService} from '../server/services/export.mjs';

test('artifact downloads preserve bytes and reject non-whitelisted paths',async()=>{
 await mkdir('temp',{recursive:true});const root=await mkdtemp(path.resolve('temp/artifact-test-'));
 const app=express();mountArtifacts(app,root);const server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));
 try{const base=`http://127.0.0.1:${server.address().port}/api/artifacts/`;
  for(const ext of ['mid','ustx','wav']){const file='a'.repeat(64)+'.'+ext,bytes=Buffer.from(`fixture ${ext}`);await writeFile(path.join(root,file),bytes);const res=await fetch(base+file);assert.equal(res.status,200);assert.deepEqual(Buffer.from(await res.arrayBuffer()),bytes);assert.match(res.headers.get('content-disposition'),/attachment/)}
  for(const file of ['bad.wav','a'.repeat(64)+'.json','%2e%2e%2fsecret.wav'])assert.equal((await fetch(base+file)).status,400);
  assert.equal((await fetch(base+'b'.repeat(64)+'.mid')).status,404);
 }finally{await new Promise(r=>server.close(r));await rm(root,{recursive:true,force:true})}
});

test('real FluidSynth renders non-silent 48k s16 PCM and valid MIDI, then hits cache',async t=>{
 if(!realAcceptance)return t.skip('需要 SONGYU_TEST_TIER=acceptance；快速回归不调用外部引擎');
 const renderer=new InstrumentRenderer();if(!(await renderer.status()).ready)return t.skip('FluidSynth/SoundFont unavailable');
 const input={bpm:120,kind:'keys',notes:[{beat:0,duration:2,midi:60,velocity:.7}],endBeat:4};
 const result=await renderer.render(input),wav=await readFile(path.join(cacheRoot,result.key+'.wav'));
 assert.equal(result.sampleRate,48000);const fmt=wav.indexOf(Buffer.from('fmt '));assert.ok(fmt>=0);assert.equal(wav.readUInt32LE(fmt+12),48000);assert.equal(wav.readUInt16LE(fmt+22),16);
 const data=wav.indexOf(Buffer.from('data'));assert.ok(data>=0);assert.ok(wav.subarray(data+8).some(v=>v!==0));
 assert.equal((await readFile(path.join(cacheRoot,result.key+'.mid'))).subarray(0,4).toString(),'MThd');assert.equal((await renderer.render(input)).cached,true);
});

test('real FFmpeg normalization and MP4 report decoded AAC loudness',async t=>{
 if(!realAcceptance)return t.skip('需要 SONGYU_TEST_TIER=acceptance；快速回归不编码真实 MP4');
 const ffmpeg=process.env.FFMPEG_PATH||'ffmpeg';try{await runProcess(ffmpeg,['-version'],process.cwd())}catch{return t.skip('FFmpeg unavailable')}
 await mkdir('temp',{recursive:true});const root=await mkdtemp(path.resolve('temp/loudness-test-'));let rendered;
 try{
  await runProcess(ffmpeg,['-y','-f','lavfi','-i','sine=frequency=440:duration=16','-af','volume=0.1','-ar','24000','input.wav'],root);
  const before=await measureLoudness(ffmpeg,'input.wav',root);
  await runProcess(ffmpeg,['-y','-i','input.wav','-af',normalizationFilter,'normalized.wav'],root);
  const after=await measureLoudness(ffmpeg,'normalized.wav',root);assert.ok(Math.abs(after.integratedLufs+14)<.5);assert.ok(after.truePeakDbtp<=-1.4);
  await runProcess(ffmpeg,['-y','-f','lavfi','-i','color=c=blue:s=1280x720','-frames:v','1','scene.png'],root);
  const video=await createVideoService(process.cwd()),png=(await readFile(path.join(root,'scene.png'))).toString('base64');
  rendered=await video.render({wav:(await readFile(path.join(root,'input.wav'))).toString('base64'),scenes:Array.from({length:4},()=>({png,duration:4})),duration:16,lyrics:[],style:'minimal',title:'工单19合成测试',singingCredit:'demo'});
  assert.ok(Math.abs(rendered.loudness.output.integratedLufs+14)<.6);assert.ok(rendered.loudness.output.truePeakDbtp<=-1.3);assert.ok((await readFile(rendered.file)).length>10000);
  t.diagnostic(JSON.stringify({before,after,export:rendered.loudness}));
 }finally{if(rendered)await rm(rendered.directory,{recursive:true,force:true});await rm(root,{recursive:true,force:true})}
});
