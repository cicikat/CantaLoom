import {test} from 'node:test';
import assert from 'node:assert/strict';
import {automaticPhrase,plannedNote,notePerformance,performanceCurves} from '../shared/performance.mjs';
import {analyzePCM,mixParameters} from '../src/audio-mix';
import {createProject} from '../src/composer';
import {autoTuneProject,restorePerformance} from '../src/melody';
import {singingDependency} from '../src/singing';
import {localSongPlan} from '../src/song-plan';
import {freeTimeline} from '../shared/free-timeline.mjs';
import {localMelody} from '../shared/melody.mjs';
// @ts-expect-error Native backend module
import {createProduction} from '../server/services/production.mjs';
const notes=[{beat:0,duration:.25,midi:60,velocity:.4,syllable:'我'},{beat:.25,duration:2,midi:72,velocity:.8,syllable:'在'},{beat:3,duration:1,midi:72,velocity:.5,syllable:'等'}];
test('auto expression adapts to gaps, duration and leaps, respects overrides, emits bounded USTX curves',()=>{const perf={preset:'natural' as const,mode:'auto' as const};const short=plannedNote(notes,0,96,perf),long=plannedNote(notes,1,96,perf);assert.equal(short.vibratoDepth,0);assert.ok(long.vibratoDepth>0);assert.equal(notePerformance(notes,1,96,perf).pitch.snap_first,false);assert.equal(plannedNote(notes,2,96,perf).consonantMs,0);assert.equal(plannedNote(notes,1,96,{...perf,overrides:[{index:1,vibratoDepth:3,locked:true}]}).vibratoDepth,3);const c=performanceCurves(notes,0,4,perf)[0];assert.ok(c.xs.every((x,i)=>!i||x>c.xs[i-1]));assert.equal(c.xs.length,c.ys.length)});
test('auto tuning preserves notes, supports history and lock, invalidates only affected phrase',()=>{const p=createProject(),voice={id:'q',version:'1',label:'test',providerId:'openutau-diffsinger' as const};const sibling=singingDependency(p,p.lyrics[1],voice),next=autoTuneProject(p,p.lyrics[0].id);assert.deepEqual(next.lyrics[0].notes,p.lyrics[0].notes);assert.equal(singingDependency(next,next.lyrics[1],voice),sibling);next.lyrics[0].performance!.locked=true;assert.deepEqual(autoTuneProject(next).lyrics[0],next.lyrics[0]);const twice=autoTuneProject(autoTuneProject(p));assert.ok(restorePerformance(twice,p.lyrics[0].id).lyrics[0].performance)});
test('analysis chooses adaptive gain and safe dynamics; no random reprocessing',()=>{const quiet=Float32Array.from({length:2400},(_,i)=>Math.sin(i*.1)*.01),loud=quiet.map(x=>x*40);assert.ok(mixParameters(quiet).gain>mixParameters(loud).gain);assert.equal(analyzePCM(quiet).clipped,0);assert.deepEqual(mixParameters(quiet),mixParameters(quiet))});
test('production failure is staged; retry reuses composition and successful sibling assets',async()=>{
 let id=0,composes=0,sings=0,fail=true;const input={intent:'任务夹具',targetSeconds:25},plan={title:'夹具',mood:'平静',bpm:96,songPlan:localSongPlan('安静','海盐汽水'),lyrics:['我等风吹来','你听海潮声'],phraseWeights:[1,1]},timeline=freeTimeline(input,plan,()=>`id-${++id}`),draft=localMelody({intent:input.intent,bpm:96,songPlan:plan.songPlan,phrases:timeline.phrases});draft.source='llm';
 const service=createProduction({compose:{compose:async()=>{composes++;return {requestId:'fixture',source:'llm',model:'fixture',input,plan,sections:timeline.sections,draft}}},renderer:{status:async()=>({ready:true}),render:async()=>({audioUrl:'fixture'})},voiceStatus:async()=>({available:true,engineVersion:'fixture'}),sing:async()=>{sings++;if(sings===2&&fail)throw Error('fixture failure');return {voiceId:'q',voiceVersion:'1',providerId:'openutau-diffsinger',engineVersion:'fixture',renderParameters:{runner:'CPU',steps:20,depth:.6},audioUrl:'fixture'}}});
 const job=service.start(input);for(let i=0;i<100&&job.state==='running';i++)await new Promise(resolve=>setTimeout(resolve,5));assert.equal(job.state,'failed');assert.equal(job.stage,'singing');assert.equal(job.completedPhrases,1);const first=structuredClone(job.project.vocalAssets);fail=false;await service.retry(job.id,job.phraseId);assert.equal(job.state,'succeeded');assert.equal(composes,1);assert.equal(sings,3);assert.deepEqual(job.project.vocalAssets[Object.keys(first)[0]],first[Object.keys(first)[0]]);
});

test('retuning replaces automatic punctuation controls but keeps explicit manual locks',()=>{const first=automaticPhrase('我，在等',notes,.6,{preset:'natural'});assert.ok(first.overrides?.some(o=>o.origin==='auto'));const next=automaticPhrase('我在等',notes,.6,first);assert.equal(next.overrides?.length,0);const manual=automaticPhrase('我在等',notes,.6,{...first,overrides:[{index:1,dynamics:12,origin:'manual',locked:true}]});assert.equal(manual.overrides?.[0].dynamics,12)});

test('auto presets modify actual controls while explicit manual values still win',()=>{const soft=plannedNote(notes,1,96,{preset:'soft',mode:'auto'}),strong=plannedNote(notes,1,96,{preset:'strong',mode:'auto'});assert.ok(soft.dynamics<strong.dynamics);assert.notEqual(soft.transitionMs,strong.transitionMs);assert.equal(plannedNote(notes,1,96,{preset:'strong',mode:'auto',dynamics:7}).dynamics,7)});
