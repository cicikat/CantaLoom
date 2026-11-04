import {test} from 'node:test';
import assert from 'node:assert/strict';
import {songPlanSchema,planOutputSchema} from '../shared/song-plan.mjs';
import {createProject,localComposer,applyRhythm} from '../src/composer';
import {localSongPlan,effectivePlan} from '../src/song-plan';
import {applySongPlan,composeFromIdea,localComposition} from '../src/composition';
import {validateProject} from '../src/model';

const shape=(notes:{midi:number;beat:number;duration:number;velocity:number}[])=>notes.map(({midi,beat,duration,velocity})=>[midi,beat,duration,velocity]);
test('SongPlan strictly rejects unknown instructions, bad enums and out-of-range music',()=>{
 const plan=localSongPlan('孤独安静','海盐汽水');assert.equal(songPlanSchema.parse(plan).key.mode,'minor');
 for(const bad of [{...plan,intensity:2},{...plan,drumDensity:'whatever'},{...plan,chordProgression:[1,2,8,4]},{...plan,chordProgression:[1,2,3]},{...plan,key:{tonic:'H',mode:'minor'}},{...plan,sectionEnergy:{...plan.sectionEnergy,chorus:0}},{...plan,execute:'delete-project'}])assert.throws(()=>songPlanSchema.parse(bad));
 assert.throws(()=>planOutputSchema.parse({title:'只有文字',mood:'孤独',lyrics:['一','二','三','四']}));
});
test('intent changes actual harmony, drums and melody with identical track IDs and versions',()=>{
 const p=createProject(),q=structuredClone(p);p.songPlan=localSongPlan('孤独安静，旋律下行','海盐汽水');q.songPlan=localSongPlan('明亮热血，旋律上扬','海盐汽水');
 for(const kind of ['keys','bass','guitar','drums','melody'] as const){const t=p.tracks.find(t=>t.kind===kind&&t.sectionId===p.sections[1].id)!;assert.notDeepEqual(shape(localComposer.generate(p,t)),shape(localComposer.generate(q,t)),kind);}
 const t=p.tracks.find(t=>t.kind==='drums'&&t.sectionId===p.sections[1].id)!;assert.ok(localComposer.generate(q,t).length>localComposer.generate(p,t).length);
});
test('individual plan fields control chord notes, density, contour and per-section energy',()=>{
 const p=createProject(),plan=effectivePlan(p),s=p.sections[1],track=(kind:string)=>p.tracks.find(t=>t.kind===kind&&t.sectionId===s.id)!;
 const render=(kind:string)=>shape(localComposer.generate(p,track(kind)));
 const a=render('keys');p.songPlan={...plan,key:{tonic:'D',mode:'minor'}};assert.notDeepEqual(render('keys'),a);
 p.songPlan={...plan,chordProgression:[6,4,1,5]};assert.notDeepEqual(render('keys'),a);
 p.songPlan=structuredClone(plan);p.songPlan.drumDensity='sparse';const sparse=render('drums');p.songPlan.drumDensity='busy';assert.ok(render('drums').length>sparse.length);
 p.songPlan=structuredClone(plan);p.songPlan.melodyRange='wide';p.songPlan.melodyContour='rising';const up=localComposer.generate(p,track('melody'));p.songPlan.melodyContour='falling';const down=localComposer.generate(p,track('melody'));assert.ok(up.at(-1)!.midi>up[0].midi);assert.ok(down.at(-1)!.midi<down[0].midi);
 p.songPlan=structuredClone(plan);p.songPlan.sectionEnergy.verse=.2;const quiet=render('drums');p.songPlan.sectionEnergy.verse=1;const loud=render('drums');assert.ok(loud.length>quiet.length);assert.ok(loud[0][3]>quiet[0][3]);
 p.songPlan=structuredClone(plan);p.songPlan.intensity=.1;const soft=render('melody');p.songPlan.intensity=.9;assert.ok(render('melody').length>soft.length);
 p.songPlan=structuredClone(plan);p.songPlan.emotion='calm';const calm=render('keys');p.songPlan.emotion='driving';assert.notDeepEqual(render('keys'),calm);
});
test('locked drums survive planning; preserve manual lyrics and tapped kick positions',async()=>{
 const p=applyRhythm(createProject(),[0,625,1250,1875],96,false);p.tracks[0].locked=true;p.lyrics[0].text='我亲手写下的这一句';p.lyrics[0].source='manual';
 const before=JSON.stringify(p),locked=JSON.stringify(p.tracks[0]);const next=await composeFromIdea(p,'明亮热血，向上冲刺','海盐汽水',false);
 assert.equal(JSON.stringify(p),before);assert.equal(JSON.stringify(next.tracks[0]),locked);assert.equal(next.lyrics[0].text,p.lyrics[0].text);assert.equal(next.lyrics[0].source,'manual');assert.equal(next.planning?.source,'local-rules');assert.equal(next.tracks.length,24);
 next.tracks.filter(t=>t.kind==='drums'&&!t.locked).forEach(t=>{assert.ok(t.notes.every(n=>n.sound==='kick'));const s=next.sections.find(s=>s.id===t.sectionId)!;assert.deepEqual(t.notes.slice(0,4).map(n=>n.beat-s.start),[0,1,2,3]);});validateProject(next);
});
test('protected pitched sections freeze harmony and all companion pitched notes',()=>{
 for(const kind of ['bass','guitar','keys','melody','vocal'] as const){const p=createProject(),s=p.sections[1],anchor=p.tracks.find(t=>t.kind===kind&&t.sectionId===s.id)!;anchor.locked=true;const old=effectivePlan(p);
 const next=applySongPlan(p,localComposition('孤独安静','海盐汽水'),'海盐汽水','孤独安静',{source:'local-rules'});
 assert.deepEqual(next.songPlan!.key,old.key);assert.deepEqual(next.songPlan!.chordProgression,old.chordProgression);
 assert.deepEqual(next.tracks.filter(t=>t.sectionId===s.id&&t.kind!=='drums'),p.tracks.filter(t=>t.sectionId===s.id&&t.kind!=='drums'));
 assert.deepEqual(next.lyrics.filter(l=>l.sectionId===s.id),p.lyrics.filter(l=>l.sectionId===s.id));assert.ok(next.planning!.compatibility.some(t=>t.includes('Verse')));}
 const p=createProject();p.tracks[2].manuallyEdited=true;const output=localComposition('孤独','海盐汽水');output.songPlan.reasons=Array.from({length:5},()=>({decision:'drums' as const,reason:'保持鼓点留白'}));const q=applySongPlan(p,output,'海盐汽水','孤独',{source:'local-rules'});assert.deepEqual(q.tracks[2],p.tracks[2]);validateProject(q);
});
test('failed HTTP, invalid JSON and invalid SongPlan keep the original project byte-for-byte',async()=>{
 const p=createProject(),before=JSON.stringify(p);const fixtures=[async()=>new Response('{}',{status:502}),async()=>new Response('bad json'),async()=>Response.json({title:'缺失音乐方案',mood:'安静',lyrics:['一','二','三','四'],source:'llm',model:'fixture'})];
 for(const request of fixtures){await assert.rejects(()=>composeFromIdea(p,'孤独','海盐汽水',true,request as typeof fetch));assert.equal(JSON.stringify(p),before);}
});
test('valid LLM contract is applied atomically and no-API mode never calls fetch',async()=>{
 const p=createProject(),response={...localComposition('孤独安静','海盐汽水'),source:'llm',model:'fixture-not-real-llm'};
 const next=await composeFromIdea(p,'孤独安静','海盐汽水',true,(async()=>Response.json(response)) as typeof fetch);assert.equal(next.planning?.source,'llm');assert.equal(next.songPlan?.key.mode,'minor');
 const local=await composeFromIdea(p,'热血希望','海盐汽水',false,(()=>{throw Error('must never call network')}) as typeof fetch);assert.equal(local.planning?.source,'local-rules');validateProject(local);
});
test('legacy import does not rewrite notes, while new plans roundtrip with provenance',()=>{
 const p=createProject();delete p.songPlan;delete p.planning;const old=JSON.stringify(p);validateProject(p);assert.equal(JSON.stringify(p),old);
 const next=applySongPlan(p,localComposition('孤独','海盐汽水'),'海盐汽水','孤独',{source:'local-rules'});assert.deepEqual(validateProject(JSON.parse(JSON.stringify(next))),next);
 const bad=structuredClone(next);bad.songPlan!.intensity=-1;assert.throws(()=>validateProject(bad));
});
