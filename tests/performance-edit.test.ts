import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createProject} from '../src/composer';
import {autoTuneProject,setPhrasePerformance} from '../src/melody';
import {parseControlFields,setNoteExpression,toggleExpressionLock} from '../src/hooks/performance-edit';

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
