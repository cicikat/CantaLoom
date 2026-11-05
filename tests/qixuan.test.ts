import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createProject} from '../src/composer';
import {singingDependency} from '../src/singing';
// @ts-expect-error Node backend module is exercised through tsx.
import {qixuanInput,qixuanProject} from '../server/qixuan.mjs';
test('Qixuan USTX selects real DiffSinger and Chinese phonemizer with valid pitch points',()=>{const p=createProject(),l=p.lyrics[0];const input=qixuanInput.parse({lyricId:l.id,lyrics:l.text,start:l.start,end:l.end,bpm:p.bpm,notes:l.notes,engineVersion:'test'});const u=qixuanProject(input);assert.equal(u.tracks[0].renderer_settings.renderer,'DIFFSINGER');assert.ok(u.tracks[0].phonemizer.includes('DiffSingerChinese'));assert.ok(u.voice_parts[0].notes.every((n:{pitch:{data:unknown[]}})=>n.pitch.data.length>=2));assert.equal(u.voice_parts[0].notes.map((n:{lyric:string})=>n.lyric).join(''),l.text);assert.throws(()=>qixuanProject({...input,lyrics:'字数不对'}));});
test('Qixuan cache dependencies include engine and parameters while preserving sibling lines',()=>{const p=createProject(),l=p.lyrics[0],v={id:'qixuan',version:'2.7.0',providerId:'openutau-diffsinger' as const,label:'绮萱',engineVersion:'official-core-1',renderParameters:{runner:'CPU' as const,steps:20,depth:.6}};const d=singingDependency(p,l,v);p.lyrics[1].text='第二句修改';assert.equal(singingDependency(p,l,v),d);assert.notEqual(singingDependency(p,l,{...v,engineVersion:'official-core-2'}),d);assert.notEqual(singingDependency(p,l,{...v,renderParameters:{...v.renderParameters,runner:'DirectML'}}),d);});
