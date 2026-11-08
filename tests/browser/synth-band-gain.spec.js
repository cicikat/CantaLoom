import {test} from '@playwright/test';
import assert from 'node:assert/strict';
import {resolve,dirname,basename} from 'node:path';
import {tmpdir} from 'node:os';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {realAcceptance} from '../support/tier.mjs';
let page;
test.beforeAll(async({browser,baseURL})=>{
 page=await browser.newPage();
 await page.route('**/__audio-test',route=>route.fulfill({contentType:'text/html',body:'<!doctype html><title>Audio core test</title>'}));
 await page.goto(`${baseURL}/__audio-test`);
 await page.evaluate(async()=>{
  const {createProject}=await import('/src/composer.ts'),{renderAudio,wavBlob}=await import('/src/audio.ts'),{api}=await import('/src/api/client.ts');
  const {singingDependency}=await import('/src/singing.ts');
  const check=(value,message)=>{if(!value)throw Error(message)};
  const metrics=b=>{let sum=0,peak=0;for(const x of b.getChannelData(0)){sum+=x*x;peak=Math.max(peak,Math.abs(x))}return {rms:Math.sqrt(sum/b.length),peak}};
  const difference=(a,b)=>{check(a.length===b.length,'PCM length');let total=0;for(let c=0;c<2;c++)for(let i=0;i<a.length;i++)total+=Math.abs(a.getChannelData(c)[i]-b.getChannelData(c)[i]);return total};
  const project=()=>{const p=createProject();p.bpm=120;p.sections.forEach((s,i)=>{s.start=i*4;s.beats=4});const s=p.sections[0];p.tracks=p.tracks.filter(t=>t.sectionId===s.id&&['keys','vocal'].includes(t.kind));for(const t of p.tracks)t.notes=[0,.5,1,1.5].map((beat,i)=>({id:t.id+i,beat,duration:.3,midi:t.kind==='vocal'?64:60,velocity:.18}));p.lyrics=p.lyrics.slice(0,1);Object.assign(p.lyrics[0],{sectionId:s.id,start:0,end:4,notes:p.tracks.find(t=>t.kind==='vocal').notes});p.instrumentMode='synth';return p};
  const fixtureCtx=new OfflineAudioContext(2,48000,24000),fixture=fixtureCtx.createBuffer(2,48000,24000);for(let c=0;c<2;c++)for(let i=0;i<fixture.length;i++)fixture.getChannelData(c)[i]=.025*Math.sin(i*2*Math.PI*330/24000);
  const bytes=await wavBlob(fixture).arrayBuffer();api.audio=async()=>bytes.slice(0);api.instruments=async()=>({audioUrl:'fixture-only-no-engine'});
  const external=p=>{p.vocalMode='external';const l=p.lyrics[0],voice={id:'test-fixture',version:'1',label:'fixture',providerId:'openutau-exchange'};p.vocalAssets={[l.id]:{audioUrl:'fixture-only-no-singer',dependency:singingDependency(p,l,voice),providerId:voice.providerId,voiceId:voice.id,voiceVersion:voice.version,startSeconds:0,durationSeconds:2,isDemo:false,projectVersion:p.metadata.updatedAt}}};
  window.audioCore={project,renderAudio,wavBlob,api,metrics,difference,check,external};
 });
});
test.afterAll(async()=>{await page?.close()});

test('Synth band gain controls actual PCM, preserving vocal, stems, mute, solo and processing defaults',async()=>{
 const report=await page.evaluate(async()=>{
  const {project,renderAudio,metrics,difference,check,external}=window.audioCore;
  const p=project();p.mode='free';p.mixSettings={enabled:true,bandGain:1};const before=JSON.stringify(p);
  const render=async(gain,options={stem:'instrumental'})=>{const next=structuredClone(p);next.mixSettings.bandGain=gain;return (await renderAudio(next,options)).buffer};
  const zero=await render(0),one=await render(1),two=await render(2);
  check(metrics(zero).peak===0,'bandGain=0 must silence Synth instrumental PCM');check(metrics(one).rms>.001,'baseline audible');check(metrics(two).rms>metrics(one).rms*1.05,'gain=2 increases PCM');check(metrics(two).peak<=.98001,'processed peak protected');
  const voice=await render(0,{stem:'vocal-processed'}),mix=await render(0,{stem:'mix'});check(metrics(voice).rms>.001,'vocal survives zero band');check(difference(voice,mix)<1e-5,'band mute preserves mixed vocal');
  check(difference(await render(0,{stem:'vocal-dry'}),await render(2,{stem:'vocal-dry'}))===0,'dry vocal unaffected');
  check(difference(await render(0,{stem:'vocal-processed'}),await render(2,{stem:'vocal-processed'}))===0,'processed vocal unaffected');
  check(difference(await render(0,{lyricId:p.lyrics[0].id}),await render(2,{lyricId:p.lyrics[0].id}))===0,'single lyric unaffected');
  const keys=p.tracks.find(t=>t.kind==='keys');check(metrics(await render(0,{trackId:keys.id})).peak===0,'solo instrumental silence');check(metrics(await render(1,{trackId:keys.id})).rms>.001,'solo baseline audible');
  const muted=structuredClone(p);muted.tracks.find(t=>t.kind==='keys').muted=true;check(metrics((await renderAudio(muted,{stem:'instrumental'})).buffer).peak===0,'muted instrumental silence');
  const disabled=structuredClone(p);disabled.mixSettings={enabled:false,bandGain:0};const a=(await renderAudio(disabled,{stem:'instrumental'})).buffer;disabled.mixSettings.bandGain=2;check(difference(a,(await renderAudio(disabled,{stem:'instrumental'})).buffer)===0,'disabled ignores band gain');
  const legacy=project(),legacyBefore=JSON.stringify(legacy);const old=(await renderAudio(legacy,{stem:'instrumental'})).buffer;check(difference(one,old)===0,'gain 1 Synth is transparent against legacy baseline');legacy.mixSettings={enabled:false,bandGain:0};check(difference(old,(await renderAudio(legacy,{stem:'instrumental'})).buffer)===0,'legacy default stays unprocessed');delete legacy.mixSettings;check(JSON.stringify(legacy)===legacyBefore,'legacy not migrated');
  const defaults=structuredClone(p);delete defaults.mixSettings;const defaultBuffer=(await renderAudio(defaults,{stem:'instrumental'})).buffer;check(difference(one,defaultBuffer)===0,'free mode defaults to processed gain 1');
  const missingGain=structuredClone(p);missingGain.mixSettings={enabled:true};check(difference(one,(await renderAudio(missingGain,{stem:'instrumental'})).buffer)===0,'missing gain defaults to 1');
  const ext=structuredClone(p);external(ext);ext.mixSettings.bandGain=0;const extVoice=(await renderAudio(ext,{stem:'vocal-processed'})).buffer;check(metrics(extVoice).rms>0,'external fixture vocal audible');check(difference(extVoice,(await renderAudio(ext,{stem:'mix'})).buffer)<1e-5,'external vocal preserved with muted band');
  const stress=structuredClone(p);stress.mixSettings.bandGain=2;stress.tracks=stress.tracks.filter(t=>t.kind==='keys');stress.tracks[0].notes=Array.from({length:24},(_,i)=>({...keys.notes[0],id:'stress-'+i,velocity:1}));const loud=(await renderAudio(stress)).buffer;check(metrics(loud).peak<=.98001&&metrics(loud).rms>.02,'loud summed Synth remains peak protected');
  const mutedVocal=structuredClone(p);mutedVocal.mixSettings.bandGain=0;mutedVocal.tracks.find(t=>t.kind==='vocal').muted=true;check(metrics((await renderAudio(mutedVocal,{stem:'mix'})).buffer).peak===0,'vocal mute remains effective');
  check(JSON.stringify(p)===before,'render does not mutate project');return {zero:metrics(zero),one:metrics(one),two:metrics(two),vocal:metrics(voice),fixture:'Chromium Web Audio synthesis and explicit sine WAV, no real singer'};
 });assert.equal(report.zero.peak,0);console.log(JSON.stringify(report));
});

test('FluidSynth fixture uses band gain once; WAV and real export entry points receive the rendered PCM',async()=>{
 const report=await page.evaluate(async()=>{
  const {project,renderAudio,wavBlob,api,metrics,difference,check}=window.audioCore;
  const {exportWavFile,exportPVFile}=await import('/src/features/export/files.ts');
  const p=project();p.mode='free';p.mixSettings={enabled:true,bandGain:1};p.instrumentMode='fluidsynth';
  const get=async gain=>{p.mixSettings.bandGain=gain;return (await renderAudio(p,{stem:'instrumental'})).buffer};
  const zero=await get(0),one=await get(1),two=await get(2);check(metrics(zero).peak===0,'FluidSynth fixture zero');const ratio=metrics(two).rms/metrics(one).rms;check(ratio>1.8&&ratio<2.1,'FluidSynth gain applied once, ratio '+ratio);
  p.instrumentMode='synth';p.tracks=p.tracks.filter(t=>t.kind!=='vocal');p.mixSettings.bandGain=0;
  const pcm=(await renderAudio(p)).buffer;let capturedWav,capturedPV;
  const originalURL=URL.createObjectURL,originalClick=HTMLAnchorElement.prototype.click,originalExport=api.exportVideo;
  URL.createObjectURL=blob=>{capturedWav=blob;return 'blob:test-only'};HTMLAnchorElement.prototype.click=()=>{};api.exportVideo=async input=>{capturedPV=input.wav;return new Blob(['explicit export fixture'])};
  try{
   await exportWavFile(p);const wave=await capturedWav.arrayBuffer();
   await exportPVFile(p);const videoInput=Uint8Array.from(atob(capturedPV),x=>x.charCodeAt(0));
   const expected=new Uint8Array(await wavBlob(pcm).arrayBuffer());check(expected.every((b,i)=>b===new Uint8Array(wave)[i]),'WAV export matches PCM');check(expected.every((b,i)=>b===videoInput[i]),'PV input matches same WAV PCM');check(expected.slice(44).every(x=>x===0),'muted exports silent');
   p.mixSettings.bandGain=1;const baseline=(await renderAudio(p)).buffer;await exportWavFile(p);const b=new Uint8Array(await capturedWav.arrayBuffer());const exact=new Uint8Array(await wavBlob(baseline).arrayBuffer());check(exact.every((x,i)=>x===b[i]),'gain 1 export matches baseline');check(b.slice(44).some(x=>x!==0),'baseline export audible');
   return {ratio,silentWavBytes:wave.byteLength,baseline:metrics(baseline),fixture:'decoded sine WAV and intercepted export transport; no engine/FFmpeg'};
  }finally{URL.createObjectURL=originalURL;HTMLAnchorElement.prototype.click=originalClick;api.exportVideo=originalExport}
 });assert.ok(report.ratio<2.1);console.log(JSON.stringify(report));
});


test('real FluidSynth WAV retains one band gain application in Chromium',{tag:'@acceptance'},async()=>{
 if(!realAcceptance)return test.skip('external acceptance disabled');
 const {InstrumentRenderer,cacheRoot}=await import('../../server/services/instruments.mjs');const path=await import('node:path');
 const renderer=new InstrumentRenderer();if(!(await renderer.status()).ready)return test.skip('FluidSynth/SoundFont unavailable');
 const input=await page.evaluate(()=>{const p=window.audioCore.project(),track=p.tracks.find(t=>t.kind==='keys');return {bpm:p.bpm,kind:track.kind,notes:track.notes,endBeat:4}});
 const asset=await renderer.render(input),wave=await readFile(path.join(cacheRoot,asset.key+'.wav'));
 const report=await page.evaluate(async b64=>{
  const {project,renderAudio,api,metrics,check}=window.audioCore;const original=api.audio;
  api.audio=async()=>Uint8Array.from(atob(b64),x=>x.charCodeAt(0)).buffer;
  try{const p=project();p.instrumentMode='fluidsynth';p.mode='free';p.tracks=p.tracks.filter(t=>t.kind==='keys');p.mixSettings={enabled:true,bandGain:0};
   const zero=(await renderAudio(p)).buffer;p.mixSettings.bandGain=1;const one=(await renderAudio(p)).buffer;p.mixSettings.bandGain=2;const two=(await renderAudio(p)).buffer;
   const ratio=metrics(two).rms/metrics(one).rms;check(metrics(zero).peak===0,'real FluidSynth zero');check(metrics(one).rms>.0001,'real FluidSynth audible');check(ratio>1.5&&ratio<2.1,'real FluidSynth no double band gain');check(metrics(two).peak<=.98001,'real FluidSynth peak protected');return {zero:metrics(zero),one:metrics(one),two:metrics(two),ratio};
  }finally{api.audio=original}
 },wave.toString('base64'));
 await mkdir('temp/task33',{recursive:true});await writeFile('temp/task33/fluidsynth.wav',wave);await writeFile('temp/task33/fluidsynth.json',JSON.stringify({key:asset.key,...report},null,2));console.log(JSON.stringify(report));
});

test('real FFmpeg MP4 encodes the Synth WAV delivered by the existing PV export entry', {tag:'@acceptance',timeout:180000},async()=>{
 if(!realAcceptance)return test.skip('external acceptance disabled');
 const {createVideoService}=await import('../../server/services/export.mjs'),{exportInput}=await import('../../shared/contracts/index.mjs');
 const {copyFile,rm}=await import('node:fs/promises');const video=await createVideoService(process.cwd());if(!video.ready)return test.skip('FFmpeg unavailable');
 const input=await page.evaluate(async()=>{
  const {project,api,renderAudio,wavBlob,check}=window.audioCore;const {exportPVFile}=await import('/src/features/export/files.ts');
  const p=project();p.tracks=p.tracks.filter(t=>t.kind==='keys');p.lyrics=[];p.sections.forEach((s,i)=>{s.start=i*8;s.beats=8});p.mixSettings={enabled:true,bandGain:2};p.mode='free';
  let captured;const originalExport=api.exportVideo,originalClick=HTMLAnchorElement.prototype.click;
  api.exportVideo=async value=>{captured=value;return new Blob(['transport intercepted before real encoding'])};HTMLAnchorElement.prototype.click=()=>{};
  try{await exportPVFile(p);const expected=new Uint8Array(await wavBlob((await renderAudio(p)).buffer).arrayBuffer()),actual=Uint8Array.from(atob(captured.wav),x=>x.charCodeAt(0));check(expected.length===actual.length&&expected.every((x,i)=>x===actual[i]),'actual PV input matches Synth PCM');return captured}
  finally{api.exportVideo=originalExport;HTMLAnchorElement.prototype.click=originalClick}
 });
 const result=await video.render(exportInput.parse(input));
 try{const mp4=await readFile(result.file);assert.equal(mp4.subarray(4,8).toString(),'ftyp');await mkdir('temp/task33',{recursive:true});await writeFile('temp/task33/synth-pv-input.wav',Buffer.from(input.wav,'base64'));await copyFile(result.file,'temp/task33/synth.mp4');await writeFile('temp/task33/export.json',JSON.stringify(result.loudness,null,2));console.log(JSON.stringify({bytes:mp4.length,loudness:result.loudness}));}finally{const target=resolve(result.directory);assert.equal(dirname(target),resolve(tmpdir()));assert.ok(basename(target).startsWith('songyu-'));await rm(target,{recursive:true,force:true})}
});
