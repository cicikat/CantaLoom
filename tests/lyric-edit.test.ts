import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createProject} from '../src/composer';
import {mockComposition} from '../src/api/mock-free';
import {projectFromComposition} from '../src/melody';
import {singingDependency} from '../src/singing';
import {syncStudioLyrics} from '../src/hooks/lyric-edit';
const voice={id:'qixuan',version:'fixture',label:'fixture',providerId:'openutau-diffsinger' as const};

test('sync changes only edited local lyrics, preserves siblings and validates all lines atomically',()=>{
 const p=createProject(),before=JSON.stringify(p),lines=p.lyrics.map(l=>l.text);lines[0]='把今天写进一封信里';
 const next=syncStudioLyrics(p,lines.join('\r\n'));
 assert.equal(next.lyrics[0].text,lines[0]);assert.equal(next.lyrics[0].source,'manual');
 assert.deepEqual(next.lyrics.slice(1),p.lyrics.slice(1));assert.deepEqual(next.tracks.filter(t=>t.kind!=='vocal'),p.tracks.filter(t=>t.kind!=='vocal'));
 assert.equal(JSON.stringify(p),before);assert.equal(syncStudioLyrics(next,lines.join('\n')),next);
 assert.throws(()=>syncStudioLyrics(p,lines.slice(1).join('\n')),/当前作品有/);
 const locked=structuredClone(p);locked.lyrics[1].locked=true;lines[1]='改第二句';
 assert.throws(()=>syncStudioLyrics(locked,lines.join('\n')),/锁定/);assert.equal(locked.lyrics[0].text,p.lyrics[0].text);
});

test('free lyrics keep melody and update its draft together; locked notes and mismatched sung counts preserve source',()=>{
 const p=projectFromComposition(mockComposition({intent:'歌词同步夹具',lyrics:['甲乙丙丁戊','己庚辛壬癸','云上明月光']}));
 const before=JSON.stringify(p),lines=p.lyrics.map(l=>l.text);lines[0]='风吹过海面';
 const next=syncStudioLyrics(p,lines.join('\n'));
 assert.deepEqual(next.lyrics[0].notes.map(({syllable,...n})=>n),p.lyrics[0].notes.map(({syllable,...n})=>n));
 assert.equal(next.melodyDraft!.phrases[0].text,lines[0]);assert.deepEqual(next.melodyDraft!.phrases[0].notes,next.lyrics[0].notes);
 assert.deepEqual(next.lyrics.slice(1),p.lyrics.slice(1));
 assert.notEqual(singingDependency(next,next.lyrics[0],voice),singingDependency(p,p.lyrics[0],voice));
 assert.equal(singingDependency(next,next.lyrics[1],voice),singingDependency(p,p.lyrics[1],voice));
 lines[0]='风吹过海面远处';assert.throws(()=>syncStudioLyrics(p,lines.join('\n')),/字数一致/);
 const locked=structuredClone(p);locked.lyrics[0].notes[0].locked=true;lines[0]='风吹过海面';
 assert.throws(()=>syncStudioLyrics(locked,lines.join('\n')),/锁定音符/);assert.equal(JSON.stringify(p),before);
});
