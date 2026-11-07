import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createProject} from '../src/composer';
import {editPhraseNotes,setLyricText,setPhrasePerformance} from '../src/melody';
import {notePerformance} from '../shared/performance.mjs';
import {pitchCurveSchema} from '../shared/contracts/melody.mjs';
import {alignedNotes,singingDependency} from '../src/singing';
import {phraseEdgeFades} from '../src/audio-mix';
import {restoreVocalAsset} from '../src/features/singing/qixuan';
import {validateProject,type SongProject,type VocalAsset} from '../src/model';
// @ts-expect-error backend module
import {qixuanProject} from '../server/services/qixuan.mjs';

const voice={id:'qixuan',version:'2.7',label:'test',providerId:'openutau-diffsinger' as const,engineVersion:'eng-1',renderParameters:{runner:'CPU' as const,steps:20,depth:.6}};

test('pitch curve contract requires two sorted points with integer tenths',()=>{
 assert.equal(pitchCurveSchema.parse([{x:-40,y:0},{x:60,y:20}])[0].shape,'io');
 assert.throws(()=>pitchCurveSchema.parse([{x:0,y:0}]),'至少两个点');
 assert.throws(()=>pitchCurveSchema.parse([{x:10,y:0},{x:10,y:5}]),'时间必须严格递增');
 assert.throws(()=>pitchCurveSchema.parse([{x:0,y:0},{x:10,y:1.5}]),'y 为十分之一半音整数');
 assert.throws(()=>pitchCurveSchema.parse([{x:0,y:0,breath:1},{x:10,y:5}]),'不接受伪造字段');
});

test('custom pitch curve reaches USTX for the edited note only and precisely invalidates that line cache',()=>{
 const p=createProject(),l=p.lyrics[0],sibling=p.lyrics[1];
 const before=singingDependency(p,l,voice),siblingBefore=singingDependency(p,sibling,voice);
 const soft=setPhrasePerformance(p,l.id,{preset:'soft'});
 const curve=[{x:-80,y:-60,shape:'io' as const},{x:30,y:0,shape:'io' as const},{x:200,y:40,shape:'l' as const}];
 const tuned=setPhrasePerformance(soft,l.id,{preset:'natural',mode:'manual',overrides:[{index:0,origin:'manual',pitch:curve}]});
 assert.equal(tuned.performanceHistory?.[l.id]?.length,1,'上一版调教已保存');
 assert.notEqual(singingDependency(tuned,tuned.lyrics[0],voice),before,'本句缓存精准失效');
 assert.equal(singingDependency(tuned,sibling,voice),siblingBefore,'兄弟句缓存不变');
 const notes=alignedNotes(tuned.lyrics[0]);
 assert.deepEqual(notePerformance(notes,0,p.bpm,tuned.lyrics[0].performance!).pitch,{data:curve,snap_first:false});
 const auto=notePerformance(notes,1,p.bpm,tuned.lyrics[0].performance!).pitch;
 assert.equal(auto.data.length,2,'其他音符保持自动过渡点');
 const input={lyricId:l.id,lyrics:l.text,start:l.start,end:l.end,bpm:p.bpm,notes:l.notes,engineVersion:'test',performance:tuned.lyrics[0].performance};
 const u=qixuanProject(input);
 assert.deepEqual(u.voice_parts[0].notes[0].pitch.data,curve);
 assert.equal(u.voice_parts[0].notes[0].pitch.snap_first,false);
 assert.equal(u.voice_parts[0].notes[1].pitch.data.length,2);
 validateProject(JSON.parse(JSON.stringify(tuned)));
});

test('lyric edit can keep the melody with same character count or clear notes for recomposition',()=>{
 const p=createProject(),l=p.lyrics[1],siblingDependency=singingDependency(p,p.lyrics[0],voice);
 const sung=l.notes.filter(n=>n.syllable!=='+').length,replacement=`改词保留旋律不变测试新词`.slice(0,sung);
 const kept=setLyricText(p,l.id,replacement,{keepMelody:true}),line=kept.lyrics[1];
 assert.equal(line.text,replacement);assert.equal(line.source,'manual');assert.equal(line.version,l.version+1);
 assert.deepEqual(line.notes.map(n=>[n.beat,n.duration,n.midi]),l.notes.map(n=>[n.beat,n.duration,n.midi]),'保留旋律不改音高与时值');
 assert.equal(line.notes.find(n=>n.syllable!=='+')!.syllable,'改');
 assert.doesNotThrow(()=>alignedNotes(line));
 assert.equal(singingDependency(kept,p.lyrics[0],voice),siblingDependency,'兄弟句依赖不变');
 assert.notDeepEqual(kept.tracks.find(t=>t.kind==='vocal'&&t.sectionId===l.sectionId)!.notes,p.tracks.find(t=>t.kind==='vocal'&&t.sectionId===l.sectionId)!.notes,'演示人声轨已同步');
 assert.throws(()=>setLyricText(p,l.id,replacement+'多一个字',{keepMelody:true}),'字数不一致必须重新作曲');
 const cleared=setLyricText(p,l.id,'全新的句子待作曲',{keepMelody:false});
 assert.equal(cleared.lyrics[1].notes.length,0);assert.equal(cleared.lyrics[1].text,'全新的句子待作曲');
 const withPerformance=setPhrasePerformance(p,l.id,{preset:'natural',mode:'manual',overrides:[{index:0,origin:'manual',dynamics:10}]});
 assert.equal(setLyricText(withPerformance,l.id,'重新作曲的歌词',{keepMelody:false}).lyrics[1].performance?.overrides?.length,0,'重新作曲清除旧音符索引的调教覆盖');
 const locked=structuredClone(p);locked.lyrics[1].locked=true;assert.throws(()=>setLyricText(locked,l.id,replacement,{keepMelody:true}));
});

test('note editing validates pitch, timing, locks and preserves alignment and siblings',()=>{
 const p=createProject(),l=p.lyrics[1],siblingDependency=singingDependency(p,p.lyrics[0],voice);
 const raised=l.notes.map((n,i)=>i===0?{...n,midi:n.midi+2}:n);
 const edited=editPhraseNotes(p,l.id,raised);
 assert.equal(edited.lyrics[1].notes[0].midi,l.notes[0].midi+2);assert.equal(edited.lyrics[1].version,l.version+1);
 assert.equal(p.lyrics[1].notes[0].midi,l.notes[0].midi,'原工程不被修改');
 assert.notEqual(singingDependency(edited,edited.lyrics[1],voice),singingDependency(p,l,voice),'本句演唱依赖失效');
 assert.equal(singingDependency(edited,p.lyrics[0],voice),siblingDependency,'兄弟句依赖不变');
 assert.ok(edited.tracks.find(t=>t.kind==='vocal'&&t.sectionId===l.sectionId)!.notes.some(n=>n.midi===l.notes[0].midi+2),'演示人声轨同步');
 assert.throws(()=>editPhraseNotes(p,l.id,l.notes.slice(1)),'数量改变需重新作曲');
 assert.throws(()=>editPhraseNotes(p,l.id,l.notes.map((n,i)=>i===0?{...n,syllable:'换'}:n)),'音节由歌词编辑负责');
 assert.throws(()=>editPhraseNotes(p,l.id,l.notes.map((n,i)=>i===1?{...n,beat:l.notes[0].beat}:n)),'重叠被拒绝');
 assert.throws(()=>editPhraseNotes(p,l.id,l.notes.map((n,i)=>i===l.notes.length-1?{...n,duration:l.end-l.notes[l.notes.length-1].beat+1}:n)),'越界被拒绝');
 const reordered=l.notes.map((n,i,a)=>i===0?{...n,beat:a[1].beat+a[1].duration+.001}:i===1?{...n,beat:a[0].beat}:n);
 assert.throws(()=>editPhraseNotes(p,l.id,reordered),'时间顺序保持不变');
 const locked=structuredClone(p);locked.lyrics[1].notes[0].locked=true;
 assert.throws(()=>editPhraseNotes(locked,l.id,raised),'锁定音符逐字段不变');
 assert.doesNotThrow(()=>editPhraseNotes(locked,l.id,locked.lyrics[1].notes.map(n=>({...n,syllable:n.syllable??'+'}))),'锁定音符原样提交可通过');
});

const assetFor=(p:SongProject,l:SongProject['lyrics'][number],take:number,key:string):VocalAsset=>({audioUrl:`/api/audio/${key}.wav`,dependency:singingDependency(p,l,voice),providerId:voice.providerId,voiceId:voice.id,voiceVersion:voice.version,engineVersion:voice.engineVersion,renderParameters:{...voice.renderParameters},take,startSeconds:l.start*60/p.bpm,durationSeconds:(l.end-l.start)*60/p.bpm+.4,isDemo:false,projectVersion:p.metadata.updatedAt});

test('vocal history restores matching takes, rotates the displaced one and rejects stale or mismatched versions',()=>{
 const p=createProject(),l=p.lyrics[0];
 const current=assetFor(p,l,1,'b'.repeat(64)),older=assetFor(p,l,0,'a'.repeat(64));
 const project:SongProject={...structuredClone(p),vocalMode:'external',vocalAssets:{[l.id]:current},vocalHistory:{[l.id]:[older]}};
 const restored=restoreVocalAsset(project,l.id,0);
 assert.equal(restored.vocalAssets?.[l.id].audioUrl,older.audioUrl,'旧版本恢复为当前演唱');
 assert.equal(restored.vocalHistory?.[l.id].length,1);assert.equal(restored.vocalHistory?.[l.id][0].audioUrl,current.audioUrl,'被替换版本进入历史');
 const back=restoreVocalAsset(restored,l.id,0);assert.equal(back.vocalAssets?.[l.id].audioUrl,current.audioUrl,'可再次恢复回来');
 const edited=setLyricText(project,l.id,'完全不同的新歌词',{keepMelody:false});
 assert.throws(()=>restoreVocalAsset(edited,l.id,0),'歌词已改的旧演唱不能恢复');
 const gpu={...structuredClone(project),singingRunner:'DirectML' as const};assert.throws(()=>restoreVocalAsset(gpu,l.id,0),'推理设备不一致不能恢复');
 const locked=structuredClone(project);locked.lyrics[0].locked=true;assert.throws(()=>restoreVocalAsset(locked,l.id,0),'锁定句不能恢复');
 assert.equal(JSON.stringify(project.vocalAssets),JSON.stringify({[l.id]:current}),'失败恢复不修改工程');
});

test('phrase edge fades only touch the padding and leave the sung body intact',()=>{
 const data=new Float32Array(24000).fill(1);phraseEdgeFades(data,24000,.05,.15);
 assert.equal(data[0],0,'头部从零淡入');
 assert.ok(data[1199]>.99&&data[1200]===1,'淡入在 50 ms 内完成');
 assert.equal(data[10000],1,'演唱主体不被修改');
 assert.equal(data[23999],0,'尾部淡出到零');
 assert.ok(data[20399]===1&&data[20400]>.99,'淡出只覆盖末尾 150 ms');
 assert.doesNotThrow(()=>phraseEdgeFades(new Float32Array(10).fill(1),24000),'极短缓冲安全');
});
