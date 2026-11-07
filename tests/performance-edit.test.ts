import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createProject} from '../src/composer';
import {autoTuneProject,setPhrasePerformance} from '../src/melody';
import {parseControlFields,setNoteExpression,toggleExpressionLock,setAdvancedNoteExpression,setExpressionCurve} from '../src/hooks/performance-edit';
import {singingDependency} from '../src/singing';

test('manual note controls preserve pitch curves, siblings and note data; bad values are atomic',()=>{
 const p=createProject(),line=p.lyrics[0],pitch=[{x:0,y:0,shape:'io' as const},{x:50,y:10,shape:'io' as const}];
 line.performance={preset:'natural',overrides:[{index:0,pitch,dynamics:3},{index:1,consonantMs:2}]};
 const before=structuredClone(p),next=setNoteExpression(p,line.id,0,{dynamics:'15',transitionMs:'45'});
 assert.deepEqual(next.lyrics[0].notes,before.lyrics[0].notes);
 assert.deepEqual(next.lyrics.slice(1),before.lyrics.slice(1));
 assert.deepEqual(next.lyrics[0].performance?.overrides?.[0].pitch,pitch);
 assert.equal(next.lyrics[0].performance?.overrides?.[0].origin,'manual');
 assert.equal(next.performanceHistory?.[line.id].length,1);
 const inherited=setNoteExpression(next,line.id,0,{});
 assert.equal(inherited.lyrics[0].performance?.overrides?.[0].dynamics,undefined);
 assert.deepEqual(inherited.lyrics[0].performance?.overrides?.[0].pitch,pitch);
 for(const fields of [{dynamics:'61'},{transitionMs:'-1'},{vibratoDepth:'NaN'},{consonantMs:'Infinity'}])assert.throws(()=>setNoteExpression(p,line.id,0,fields));
 assert.throws(()=>setNoteExpression(p,line.id,999,{}));assert.deepEqual(p,before);
 assert.equal(parseControlFields({dynamics:'0'}).dynamics,0);
});

test('advanced note and phrase curves preserve siblings, round-trip, invalidate only this singing dependency and reject bad drafts',()=>{
 const p=createProject(),id=p.lyrics[0].id,voice={id:'qixuan',version:'fixture',providerId:'openutau-diffsinger' as const,label:'fixture'};
 p.lyrics[0].performance={preset:'soft',overrides:[{index:0,dynamics:4},{index:1,dynamics:8}],curves:[{abbr:'voic',points:[{x:0,y:100},{x:1000,y:90}]}]};
 const snapshot=structuredClone(p),before=singingDependency(p,p.lyrics[0],voice);
 let next=setAdvancedNoteExpression(p,id,0,{pitch:[{x:-40,y:0,shape:'io'},{x:60,y:10,shape:'l'}],vibratoLength:70,vibratoPeriod:180,vibratoIn:20,vibratoOut:30,vibratoDrift:10,vibratoVolLink:-5,phonemes:[{index:0,offsetMs:0},{index:1,phoneme:'zh/ang'}]});
 next=setExpressionCurve(next,id,'dyn',[{x:0,y:0},{x:1000,y:-80}]);
 next=setExpressionCurve(next,id,'brec',[{x:0,y:0},{x:1000,y:50}]);
 assert.deepEqual(next.lyrics.slice(1),p.lyrics.slice(1));assert.deepEqual(next.tracks,p.tracks);assert.deepEqual(next.lyrics[0].notes,p.lyrics[0].notes);
 assert.notEqual(singingDependency(next,next.lyrics[0],voice),before);assert.equal(singingDependency(next,next.lyrics[1],voice),singingDependency(p,p.lyrics[1],voice));
 const override=next.lyrics[0].performance!.overrides![0];assert.equal(override.dynamics,4);assert.deepEqual(next.lyrics[0].performance!.overrides![1],p.lyrics[0].performance!.overrides![1]);
 const clear=setAdvancedNoteExpression(next,id,0,{pitch:undefined});assert.equal(clear.lyrics[0].performance!.overrides![0].pitch,undefined);assert.deepEqual(clear.lyrics[0].performance!.overrides![0].phonemes,override.phonemes);
 assert.deepEqual(setExpressionCurve(next,id,'brec',undefined).lyrics[0].performance!.curves,p.lyrics[0].performance!.curves);
 for(const patch of [{vibratoIn:80,vibratoOut:30},{vibratoPeriod:NaN},{pitch:[{x:0,y:0,shape:'io' as const},{x:0,y:10,shape:'io' as const}]},{phonemes:[{index:1,offsetMs:10},{index:1,offsetMs:20}]}])assert.throws(()=>setAdvancedNoteExpression(p,id,0,patch));
 assert.throws(()=>setExpressionCurve(p,id,'brec',[{x:0,y:101},{x:100,y:0}]));
 assert.deepEqual(p,snapshot);assert.deepEqual(JSON.parse(JSON.stringify(next)).lyrics[0].performance,next.lyrics[0].performance);
 for(const locked of [toggleExpressionLock(next,id,0),toggleExpressionLock(next,id)])assert.throws(()=>setAdvancedNoteExpression(locked,id,0,{vibratoLength:10}));
});

test('expression locks can be released without unlocking a protected phrase; auto preserves manual overrides',()=>{
 const p=createProject(),id=p.lyrics[0].id;
 const manual=setNoteExpression(p,id,0,{dynamics:'9'}),lockedNote=toggleExpressionLock(manual,id,0);
 assert.throws(()=>setNoteExpression(lockedNote,id,0,{dynamics:'10'}));
 const auto=autoTuneProject(lockedNote,id);
 assert.deepEqual(auto.lyrics[0].performance?.overrides?.find(o=>o.index===0),lockedNote.lyrics[0].performance?.overrides?.find(o=>o.index===0));
 const locked=toggleExpressionLock(auto,id);
 assert.deepEqual(autoTuneProject(locked,id).lyrics[0],locked.lyrics[0]);
 assert.throws(()=>setPhrasePerformance(locked,id,{preset:'soft'}));
 assert.throws(()=>toggleExpressionLock(locked,id,0));
 const unlocked=toggleExpressionLock(locked,id);assert.equal(unlocked.lyrics[0].performance?.locked,false);
 const protectedPhrase=structuredClone(locked);protectedPhrase.lyrics[0].locked=true;
 assert.throws(()=>toggleExpressionLock(protectedPhrase,id));
 const protectedTrack=structuredClone(locked);protectedTrack.tracks.find(t=>t.sectionId===p.lyrics[0].sectionId&&t.kind==='vocal')!.locked=true;
 assert.throws(()=>toggleExpressionLock(protectedTrack,id));
});
