import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mockComposition,mockMelody} from '../src/api/mock-free';
import {projectFromComposition,melodyRequest} from '../src/melody';
import {editPhraseNote,togglePhraseLock,applyPhraseResult} from '../src/hooks/phrase-edit';
import {singingDependency} from '../src/singing';
import {validateProject} from '../src/model';

const fixture=()=>projectFromComposition(mockComposition({intent:'单句编辑测试',lyrics:['甲乙丙丁戊','己庚辛壬癸','云上明月光']}));
const voice={id:'qixuan',version:'2.7',label:'fixture',providerId:'openutau-diffsinger' as const};
test('manual pitch and duration edits preserve stable IDs, siblings, accompaniment and audio references',()=>{
 const p=fixture(),l=p.lyrics[0],before=JSON.stringify(p),track=p.tracks.find(t=>t.sectionId===l.sectionId&&t.kind==='vocal')!;
 const next=editPhraseNote(p,l.id,l.notes[0].id,{midi:72,duration:l.notes[0].duration/2});
 assert.equal(next.lyrics[0].notes[0].id,l.notes[0].id);assert.equal(next.lyrics[0].notes[0].midi,72);
 assert.deepEqual(next.lyrics.slice(1),p.lyrics.slice(1));assert.deepEqual(next.tracks.filter(t=>t.id!==track.id),p.tracks.filter(t=>t.id!==track.id));
 assert.deepEqual(next.tracks.find(t=>t.id===track.id)!.notes.slice(l.notes.length),track.notes.slice(l.notes.length));
 assert.deepEqual(next.tracks.find(t=>t.id===track.id)!.notes.map(n=>n.id),track.notes.map(n=>n.id));
 assert.notEqual(singingDependency(next,next.lyrics[0],voice),singingDependency(p,l,voice));assert.equal(singingDependency(next,next.lyrics[1],voice),singingDependency(p,p.lyrics[1],voice));
 assert.equal(JSON.stringify(p),before);validateProject(JSON.parse(JSON.stringify(next)));
});
test('reordering notes realigns lyric characters and remaps current/history overrides by stable ID',()=>{
 let p=fixture(),l=p.lyrics[0];l.performance={preset:'natural',overrides:[{index:0,dynamics:8,origin:'manual'},{index:1,consonantMs:4,locked:true}]};
 p.performanceHistory={[l.id]:[{preset:'soft',overrides:[{index:0,dynamics:2}]}]};
 p=editPhraseNote(p,l.id,l.notes[0].id,{duration:.125});l=p.lyrics[0];
 const originalIds=l.notes.map(n=>n.id),next=editPhraseNote(p,l.id,l.notes[0].id,{beat:l.end-.125}),line=next.lyrics[0];
 assert.deepEqual(line.notes.map(n=>n.syllable),Array.from(l.text));assert.equal(line.notes.at(-1)!.id,originalIds[0]);
 assert.equal(line.performance!.overrides![0].index,line.notes.length-1);assert.equal(line.performance!.overrides![1].index,0);assert.equal(next.performanceHistory![l.id][0].overrides![0].index,line.notes.length-1);
 assert.deepEqual(new Set(line.notes.map(n=>n.id)),new Set(originalIds));assert.deepEqual(next.lyrics.slice(1),p.lyrics.slice(1));
});
test('phrase/note/track locks protect notes and lock toggles leave singing dependencies intact',()=>{
 const p=fixture(),l=p.lyrics[0],id=l.notes[0].id,locked=editPhraseNote(p,l.id,id,{locked:true});
 assert.equal(singingDependency(p,l,voice),singingDependency(locked,locked.lyrics[0],voice));assert.throws(()=>editPhraseNote(locked,l.id,id,{midi:72}));
 const unlocked=editPhraseNote(locked,l.id,id,{locked:false});assert.equal(unlocked.lyrics[0].notes[0].locked,false);
 const phrase=togglePhraseLock(p,l.id);assert.equal(phrase.melodyDraft!.phrases[0].locked,true);assert.throws(()=>editPhraseNote(phrase,l.id,id,{duration:.125}));
 const track=structuredClone(p);track.tracks.find(t=>t.kind==='vocal'&&t.sectionId===l.sectionId)!.locked=true;assert.throws(()=>togglePhraseLock(track,l.id));assert.throws(()=>editPhraseNote(track,l.id,id,{locked:true}));
});
test('bad geometry, overlap, invalid pitch and moving lyrics across a locked note fail atomically',()=>{
 let p=fixture(),l=p.lyrics[0],id=l.notes[0].id;
 for(const patch of [{midi:85},{beat:l.start-.125},{duration:.01},{beat:l.end},{duration:16}]){const before=JSON.stringify(p);assert.throws(()=>editPhraseNote(p,l.id,id,patch));assert.equal(JSON.stringify(p),before)}
 p=editPhraseNote(p,l.id,id,{duration:.125});p=editPhraseNote(p,l.id,p.lyrics[0].notes[1].id,{locked:true});l=p.lyrics[0];assert.throws(()=>editPhraseNote(p,l.id,id,{beat:l.end-.125}),/锁定音符的歌词/);
 const inconsistent=JSON.parse(JSON.stringify(fixture()));inconsistent.melodyDraft.phrases[0].notes[0].midi++;assert.throws(()=>editPhraseNote(inconsistent,inconsistent.lyrics[0].id,inconsistent.lyrics[0].notes[0].id,{duration:.125}),/草稿不一致/);
});
test('targeted Mock melody changes notes, preserves handwritten text and full sibling draft/track data',()=>{
 const p=fixture(),id=p.lyrics[0].id,req=melodyRequest(p,'更高一点',[id]),result=mockMelody(req),before=JSON.stringify(p),next=applyPhraseResult(p,req,result.draft);
 assert.notDeepEqual(next.lyrics[0].notes,p.lyrics[0].notes);assert.equal(next.lyrics[0].text,p.lyrics[0].text);assert.equal(next.lyrics[0].source,'manual');
 assert.deepEqual(next.lyrics.slice(1),p.lyrics.slice(1));assert.deepEqual(next.melodyDraft!.phrases.slice(1),p.melodyDraft!.phrases.slice(1));
 assert.deepEqual(next.tracks.filter(t=>t.kind!=='vocal'),p.tracks.filter(t=>t.kind!=='vocal'));assert.equal(JSON.stringify(p),before);
});
test('targeted results cannot rewrite locked notes, stale snapshots or orphan expression controls',()=>{
 const initial=fixture(),id=initial.lyrics[0].id,p=editPhraseNote(initial,id,initial.lyrics[0].notes[0].id,{locked:true}),req=melodyRequest(p,'保留锁定',[id]),draft=mockMelody(req).draft;
 const bad=structuredClone(draft);bad.phrases[0].notes[0].midi++;assert.throws(()=>applyPhraseResult(p,req,bad));
 const stale=editPhraseNote(p,id,p.lyrics[0].notes[1].id,{duration:.125});assert.throws(()=>applyPhraseResult(stale,req,draft));
 const settings=fixture();settings.lyrics[0].performance={preset:'natural',overrides:[{index:0,dynamics:3}]};
 const request=melodyRequest(settings,'新音符 ID',[settings.lyrics[0].id]);
 const response=mockMelody(request).draft;response.phrases[0].notes=response.phrases[0].notes.map(n=>({...n,id:n.id+'-new'}));const before=JSON.stringify(settings);
 assert.throws(()=>applyPhraseResult(settings,request,response),/逐音符设置/);assert.equal(JSON.stringify(settings),before);
});

test('new generated IDs recompute only unlocked automatic expression controls with the existing rule',()=>{
 const p=fixture(),id=p.lyrics[0].id;p.lyrics[0].performance={preset:'soft',mode:'auto',energy:.7,overrides:[{index:0,origin:'auto',dynamics:5}]};
 p.performanceHistory={[id]:[{preset:'natural',mode:'auto',overrides:[{index:0,origin:'auto',dynamics:4}]}]};
 const req=melodyRequest(p,'更新音符 ID',[id]),draft=mockMelody(req).draft;draft.phrases[0].notes=draft.phrases[0].notes.map(n=>({...n,id:n.id+'-new'}));
 const before=JSON.stringify(p),next=applyPhraseResult(p,req,draft);
 assert.equal(next.lyrics[0].performance!.preset,'soft');assert.equal(next.lyrics[0].performance!.energy,.7);assert.deepEqual(next.lyrics[0].performance!.overrides,[]);assert.deepEqual(next.performanceHistory![id][0].overrides,[]);assert.equal(JSON.stringify(p),before);
 const locked=structuredClone(p);locked.lyrics[0].performance!.overrides![0].locked=true;assert.throws(()=>applyPhraseResult(locked,melodyRequest(locked,'保留设置',[id]),draft),/逐音符设置/);
 const lockedExpression=structuredClone(p);lockedExpression.lyrics[0].performance!.locked=true;assert.throws(()=>applyPhraseResult(lockedExpression,melodyRequest(lockedExpression,'保留整句表达',[id]),draft),/逐音符设置/);
});
