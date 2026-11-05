import {test} from 'node:test';
import assert from 'node:assert/strict';
import {midiFile} from '../shared/midi.mjs';
import {createProject,regenerate,lyricNotes} from '../src/composer';
import {openUtauProject,diffSingerInput,singingDependency} from '../src/singing';
import {currentVocalAsset} from '../src/external-audio';
import {validateProject} from '../src/model';
test('MIDI preserves tempo, meter, GM drums, note-off before note-on and overlapping pitches',()=>{
 const n={beat:0,duration:1,midi:60,velocity:.5};const data=Buffer.from(midiFile({bpm:120,tracks:[{kind:'keys',notes:[n,{...n,beat:1},{...n,beat:.5}]}]}));
 assert.equal(data.subarray(0,4).toString(),'MThd');assert.equal(data.readUInt16BE(12),480);assert.ok(data.includes(Buffer.from([255,81,3,7,161,32])));assert.ok(data.includes(Buffer.from([255,88,4,4,2,24,8])));assert.ok(data.includes(Buffer.from([0x91,60,64])));assert.ok(data.includes(Buffer.from([0x80,60,0,0,0x90,60,64])));
 const drum=Buffer.from(midiFile({bpm:96,tracks:[{kind:'drums',notes:[{...n,sound:'snare'}]}]}));assert.ok(drum.includes(Buffer.from([0x99,38,64])));
 assert.throws(()=>midiFile({bpm:0,tracks:[]}));
});
test('USTX and DS map Chinese syllables, gaps and melisma without invented phonemes',()=>{
 const p=createProject(),l=p.lyrics[0];l.text='海风';l.notes=[{id:'a',beat:l.start,duration:.5,midi:60,velocity:.5},{id:'b',beat:l.start+.5,duration:.5,midi:62,velocity:.5,syllable:'+'},{id:'c',beat:l.start+2,duration:1,midi:64,velocity:.5}];
 const ustx=openUtauProject(p,[l]);assert.equal(ustx.voice_parts[0].position,l.start*480);assert.deepEqual(ustx.voice_parts[0].notes.map(n=>n.lyric),['海','+','风']);
 const ds=diffSingerInput(p,l,{hai:'h ai',feng:'f eng'})[0];assert.ok(ds.ph_seq.startsWith('h ai SP f eng'));assert.equal(ds.note_slur.split(' ')[1],'1');assert.ok(ds.note_seq.includes('rest'));assert.equal(ds.ph_seq.split(' ').length,ds.ph_num.split(' ').reduce((s,n)=>s+Number(n),0));assert.ok(Math.abs(ds.note_dur.split(' ').reduce((s,n)=>s+Number(n),0)-(l.end-l.start)*60/p.bpm)<.00001);assert.throws(()=>diffSingerInput(p,l,{}));
});
test('single-line dependencies survive sibling edits and locks; reject stale audio and hostile saved references',()=>{
 const p=createProject(),l=p.lyrics[0],voice={id:'test-only',version:'1',label:'test',providerId:'openutau-exchange' as const};const key=singingDependency(p,l,voice);
 p.vocalAssets={[l.id]:{audioUrl:`/api/audio/${'a'.repeat(64)}.wav`,dependency:key,providerId:voice.providerId,voiceId:voice.id,voiceVersion:voice.version,startSeconds:l.start*60/p.bpm,durationSeconds:(l.end-l.start)*60/p.bpm,isDemo:false,projectVersion:p.metadata.updatedAt}};
 p.lyrics[1].text='修改第二句';assert.equal(singingDependency(p,l,voice),key);assert.ok(currentVocalAsset(p,l));const track=p.tracks.find(t=>t.kind==='drums')!;track.locked=true;assert.deepEqual(regenerate(p,track.id),p);assert.ok(validateProject(JSON.parse(JSON.stringify(p))).vocalAssets);
 l.notes[0].midi++;assert.throws(()=>currentVocalAsset(p,l));assert.notEqual(singingDependency(p,l,{...voice,version:'2'}),key);p.vocalAssets[l.id].audioUrl='https://evil.test/a.wav';assert.throws(()=>validateProject(p));
});
