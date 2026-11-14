import {test} from 'node:test';
import assert from 'node:assert/strict';
import {localMelody} from '../shared/melody.mjs';
import {freeTimeline} from '../shared/free-timeline.mjs';
import {localSongPlan} from '../src/song-plan';
import {createFreeProject,projectFromComposition} from '../src/melody';
import {validateProject} from '../src/model';
// @ts-expect-error Native backend module
import {createFreeComposer} from '../server/services/free-composition.mjs';
const plan={title:'接口夹具',mood:'安静',bpm:96,songPlan:localSongPlan('安静','海盐汽水'),lyrics:['风吹过雨后的街口','灯等着未归的旅人'],phraseWeights:[1,2]};
test('free transaction joins validated planning and melody without presets or templates',async()=>{
 const input={intent:'雨夜等候',lyrics:plan.lyrics,bpm:96};let calls=0;
 const composer=createFreeComposer({env:{LLM_API_KEY:'fixture',LLM_MODEL:'fixture'},request:async()=>{calls++;return Response.json({choices:[{message:{content:JSON.stringify({version:1,title:plan.title,mood:plan.mood,songPlan:plan.songPlan,phraseWeights:plan.phraseWeights})}}]})},melody:{compose:async(r:Parameters<typeof localMelody>[0])=>({draft:{...localMelody(r),source:'llm'}})}});
 const stages:string[]=[],result=await composer.compose(input,(s:string)=>stages.push(s)),p=projectFromComposition(result);
 assert.equal(calls,1);assert.deepEqual(stages,['planning','melody','validated']);assert.equal(p.style,'自由创作');assert.equal(p.mode,'free');assert.deepEqual(p.lyrics.map(l=>l.text),input.lyrics);assert.ok(p.creationRequestId);validateProject(JSON.parse(JSON.stringify(p)));
 assert.ok(p.tracks.filter(t=>t.kind==='melody'&&p.lyrics.some(l=>l.sectionId===t.sectionId)).every(t=>t.notes.length===0));
 const shell=createFreeProject({intent:'全新输入',lyrics:'第一句\n第二句'});assert.equal(shell.tracks.length,0);assert.equal(shell.songPlan,undefined);
});
test('planning failure or lyric modification never publishes a partial composition',async()=>{
 const composer=createFreeComposer({env:{LLM_API_KEY:'fixture'},request:async()=>Response.json({choices:[{message:{content:JSON.stringify({...plan,lyrics:['改写了用户歌词']})}}]}),melody:{compose:()=>{throw Error('must not reach melody')}}});
 await assert.rejects(()=>composer.compose({intent:'保护歌词',lyrics:plan.lyrics}));
 const missing=createFreeComposer({env:{}});await assert.rejects(()=>missing.compose({intent:'主题'}));
});
test('weighted timeline remains a 20–30 second short song across BPM boundaries',()=>{
 for(const bpm of [60,96,160])for(const targetSeconds of [20,25,30]){let id=0;const timeline=freeTimeline({intent:'测试',bpm,targetSeconds},plan,()=>String(++id));const seconds=timeline.sections.reduce((n,s)=>n+s.beats,0)*60/bpm;assert.ok(seconds>=20&&seconds<=30);assert.ok(timeline.sections.every(s=>s.beats>=4&&s.beats<=64))}
});
