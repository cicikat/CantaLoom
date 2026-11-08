import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createProject} from '../src/composer';
import {setPhrasePerformance} from '../src/melody';
import {notePerformance,performanceCurves,resolvePerformance} from '../shared/performance.mjs';
import {expressionCurveSchema,phonemeEditSchema,dynCurveSchema,performanceSchema} from '../shared/contracts/melody.mjs';
import {alignedNotes,singingDependency} from '../src/singing';
import {validateProject} from '../src/model';
// @ts-expect-error backend module
import {qixuanProject,qixuanStatus} from '../server/services/qixuan.mjs';

const voice={id:'qixuan',version:'2.7',label:'test',providerId:'openutau-diffsinger' as const,engineVersion:'eng-1',renderParameters:{runner:'CPU' as const,steps:20,depth:.6}};
const notes=[{beat:0,duration:1,midi:60,velocity:.5,syllable:'海'},{beat:1,duration:2,midi:62,velocity:.5,syllable:'浪'}];

test('phoneme edit contract requires offsetMs or phoneme and bounded indexes',()=>{
 assert.deepEqual(phonemeEditSchema.parse({index:1,offsetMs:-40}),{index:1,offsetMs:-40});
 assert.deepEqual(phonemeEditSchema.parse({index:0,phoneme:'a'}),{index:0,phoneme:'a'});
 assert.throws(()=>phonemeEditSchema.parse({index:0}),'至少一种覆盖');
 assert.throws(()=>phonemeEditSchema.parse({index:16,offsetMs:10}),'音素位置有界');
 assert.throws(()=>phonemeEditSchema.parse({index:0,offsetMs:400}),'偏移毫秒有界');
 assert.throws(()=>phonemeEditSchema.parse({index:0,offsetMs:10,volume:50}),'不接受伪造字段');
});

test('expression curves only expose singer-supported abbrs with descriptor ranges',()=>{
 assert.equal(expressionCurveSchema.parse({abbr:'brec',points:[{x:0,y:-100},{x:900,y:100}]}).abbr,'brec');
 assert.throws(()=>expressionCurveSchema.parse({abbr:'ene',points:[{x:0,y:0},{x:900,y:10}]}),'声库无 energy embed，不假装支持');
 assert.throws(()=>expressionCurveSchema.parse({abbr:'tenc',points:[{x:0,y:0},{x:900,y:10}]}),'声库无 tension embed，不假装支持');
 assert.throws(()=>expressionCurveSchema.parse({abbr:'voic',points:[{x:0,y:-1},{x:900,y:100}]}),'voic 描述符范围 0–100');
 assert.throws(()=>expressionCurveSchema.parse({abbr:'brec',points:[{x:0,y:0},{x:900,y:101}]}),'brec 增量范围 ±100');
 assert.throws(()=>expressionCurveSchema.parse({abbr:'velc',points:[{x:0,y:100},{x:900,y:201}]}),'velc 范围 0–200');
 assert.throws(()=>expressionCurveSchema.parse({abbr:'shfc',points:[{x:0,y:0},{x:900,y:1201}]}),'shfc 范围 ±1200');
 assert.equal(expressionCurveSchema.parse({abbr:'pexp',points:[{x:0,y:100},{x:50,y:60}]}).points.length,2,'合法 pexp 曲线通过');
 assert.throws(()=>expressionCurveSchema.parse({abbr:'genc',points:[{x:0,y:0},{x:0,y:5}]}),'严格递增');
 assert.throws(()=>dynCurveSchema.parse([{x:0,y:-241},{x:10,y:0}]),'DYN 下限 -240');
 assert.throws(()=>dynCurveSchema.parse([{x:0,y:0},{x:10,y:121}]),'DYN 上限 120');
});

test('performance schema validates vibrato fade budget and unique phoneme/curve entries',()=>{
 assert.doesNotThrow(()=>performanceSchema.parse({preset:'natural',mode:'manual',overrides:[{index:0,vibratoIn:60,vibratoOut:40}]}));
 assert.throws(()=>performanceSchema.parse({preset:'natural',mode:'manual',overrides:[{index:0,vibratoIn:80}]}),'淡入 80 + 默认淡出 35 超过 100%');
 assert.throws(()=>performanceSchema.parse({preset:'natural',mode:'manual',overrides:[{index:0,vibratoIn:50,vibratoOut:60}]}),'淡入淡出合计不能超过 100%');
 assert.throws(()=>performanceSchema.parse({preset:'natural',mode:'manual',overrides:[{index:0,phonemes:[{index:1,offsetMs:10},{index:1,phoneme:'a'}]}]}),'同一音素位置只能一条覆盖');
 assert.throws(()=>performanceSchema.parse({preset:'natural',curves:[{abbr:'brec',points:[{x:0,y:0},{x:10,y:1}]},{abbr:'brec',points:[{x:0,y:0},{x:10,y:2}]}]}),'同一曲线只能定义一次');
 assert.throws(()=>performanceSchema.parse({preset:'natural',breathiness:50}),'不接受未支持的效果字段');
 const legacy=performanceSchema.parse({preset:'soft',mode:'manual',overrides:[{index:0,origin:'manual',transitionMs:80,pitch:[{x:-40,y:0},{x:40,y:10}]}]});
 assert.equal(legacy.curves,undefined);assert.equal(legacy.dynCurve,undefined,'v0.3.3 调教数据原样可读，无新字段');
});

test('note vibrato full shape maps to USTX while defaults keep the previous automatic form',()=>{
 const performance=performanceSchema.parse({preset:'natural',mode:'manual',overrides:[{index:1,origin:'manual',vibratoDepth:30,vibratoLength:70,vibratoPeriod:160,vibratoIn:20,vibratoOut:30,vibratoDrift:-15,vibratoVolLink:40}]});
 const v=notePerformance(notes,1,120,performance).vibrato;
 assert.deepEqual(v,{length:70,period:160,depth:30,in:20,out:30,shift:0,drift:-15,vol_link:40});
 const before=notePerformance(notes,1,120,{preset:'natural',mode:'manual'}).vibrato;
 const legacy={length:45,period:185,depth:18,in:25,out:35,shift:0,drift:0};
 assert.deepEqual({length:before.length,period:before.period,depth:before.depth,in:before.in,out:before.out,shift:before.shift,drift:before.drift},legacy,'无新字段时颤音形态与 v0.3.3 一致');
 assert.equal(before.vol_link,0,'默认无音量联动');
 const auto=notePerformance(notes,0,120,{preset:'natural'}).vibrato;
 assert.equal(auto.length,0,'短音符自动无颤音');
});

test('phoneme overrides map milliseconds to ticks, keep replacements and merge legacy consonantMs',()=>{
 const performance=performanceSchema.parse({preset:'natural',mode:'manual',consonantMs:-20,overrides:[{index:0,origin:'manual',phonemes:[{index:2,offsetMs:50},{index:1,phoneme:'ang'},{index:0,offsetMs:-30}]}]});
 const mapped=notePerformance(notes,0,120,performance).phoneme_overrides;
 assert.deepEqual(mapped,[{index:0,offset:-29},{index:1,phoneme:'ang'},{index:2,offset:48}],'按音素索引排序，毫秒按 BPM 换算 tick');
 const legacyOnly=notePerformance(notes,0,120,{preset:'natural',mode:'manual',consonantMs:-20}).phoneme_overrides;
 assert.deepEqual(legacyOnly,[{index:0,offset:-19}],'无显式音素时 consonantMs 行为与 v0.3.3 一致');
 const explicitZero=notePerformance(notes,0,120,performanceSchema.parse({preset:'natural',mode:'manual',consonantMs:-20,overrides:[{index:0,origin:'manual',phonemes:[{index:0,phoneme:'h'}]}]})).phoneme_overrides;
 assert.deepEqual(explicitZero,[{index:0,phoneme:'h'}],'显式 0 位覆盖优先于 consonantMs');
 const zeroOffset=notePerformance(notes,0,120,performanceSchema.parse({preset:'natural',mode:'manual',overrides:[{index:0,origin:'manual',phonemes:[{index:3,offsetMs:0}]}]})).phoneme_overrides;
 assert.deepEqual(zeroOffset,[],'零偏移且无替换不产生覆盖项');
});

test('manual dynCurve replaces automatic dynamics and expression curves reach USTX ticks',()=>{
 const auto=performanceCurves(notes,0,3,{preset:'natural'},120);
 assert.equal(auto.length,1);assert.equal(auto[0].abbr,'dyn');assert.ok(auto[0].xs[0]===0&&auto[0].ys.at(-1)===-18,'自动 DYN 形态不变');
 const performance=performanceSchema.parse({preset:'natural',mode:'manual',dynCurve:[{x:0,y:-30},{x:1000,y:0},{x:1400,y:-60}],curves:[{abbr:'brec',points:[{x:200,y:60},{x:900,y:-20}]},{abbr:'voic',points:[{x:0,y:100},{x:1500,y:55}]}]});
 const curves=performanceCurves(notes,0,3,performance,120);
 assert.equal(curves.length,3);
 assert.deepEqual(curves[0],{abbr:'dyn',xs:[0,960,1344],ys:[-30,0,-60]},'人工 DYN 替换自动曲线，毫秒换算 tick');
 assert.deepEqual(curves[1],{abbr:'brec',xs:[192,864],ys:[60,-20]});
 assert.deepEqual(curves[2],{abbr:'voic',xs:[0,1440],ys:[100,55]});
});

test('new tuning fields precisely invalidate only the edited line dependency',()=>{
 const p=createProject(),l=p.lyrics[0],sibling=p.lyrics[1];
 const before=singingDependency(p,l,voice),siblingBefore=singingDependency(p,sibling,voice);
 const tuned=setPhrasePerformance(p,l.id,{preset:'natural',mode:'manual',overrides:[{index:0,origin:'manual',vibratoLength:60,phonemes:[{index:1,offsetMs:40}]}],curves:[{abbr:'brec',points:[{x:0,y:50},{x:800,y:0}]}]});
 assert.notEqual(singingDependency(tuned,tuned.lyrics[0],voice),before,'本句依赖失效');
 assert.equal(singingDependency(tuned,sibling,voice),siblingBefore,'兄弟句依赖不变');
 assert.ok(JSON.stringify(resolvePerformance(tuned.lyrics[0].performance!)).includes('"brec"'),'表现曲线进入依赖序列化');
 validateProject(JSON.parse(JSON.stringify(tuned)));
});

test('USTX carries vibrato shape, phoneme replacements and suggested expression descriptors',()=>{
 const p=createProject(),l=p.lyrics[0];
 const base={lyricId:l.id,lyrics:l.text,start:l.start,end:l.end,bpm:p.bpm,notes:l.notes,engineVersion:'test'};
 const plain=qixuanProject(base);
 assert.equal('expressions' in plain,false,'无 velc/pexp 曲线时不声明额外描述符');
 const performance=performanceSchema.parse({preset:'natural',mode:'manual',overrides:[{index:0,origin:'manual',vibratoVolLink:35,phonemes:[{index:1,phoneme:'ang'}]}],curves:[{abbr:'velc',points:[{x:0,y:140},{x:1200,y:100}]},{abbr:'pexp',points:[{x:0,y:100},{x:1200,y:30}]}]});
 const u=qixuanProject({...base,performance}) as Record<string,any>;
 assert.equal(u.voice_parts[0].notes[0].vibrato.vol_link,35);
 assert.deepEqual(u.voice_parts[0].notes[0].phoneme_overrides,[{index:1,phoneme:'ang'}]);
 assert.equal(u.expressions.velc.default_value,100);assert.equal(u.expressions.pexp.max,100);
 const abbrs=u.voice_parts[0].curves.map((c:{abbr:string})=>c.abbr);
 assert.deepEqual(abbrs,['dyn','velc','pexp']);
});

test('qixuan status reports capabilities parsed from the installed singer when available',async()=>{
 const voice=await qixuanStatus();
 if(!voice.available)return assert.ok(voice.message,'未安装引擎时明确报告不可用');
 assert.deepEqual(voice.capabilities?.curves,{brec:true,voic:true,genc:true,velc:true,pexp:true,shfc:true,ene:false,tenc:false});
 for(const name of ['ene','tenc','breath','voiceColor','phonemeEnvelope'])assert.ok(voice.capabilities?.unsupported.includes(name),`${name} 明确列为不支持`);
 assert.deepEqual(voice.capabilities?.phonemeOverride,{offset:true,replace:true});
});


test('explicit first phoneme zero defeats phrase offset without changing legacy or unrelated events',()=>{
 for(const bpm of [60,120,160])for(const consonantMs of [-20,12]){
  const base={preset:'natural' as const,mode:'manual' as const,consonantMs};
  const edit=(phonemes:{index:number;offsetMs?:number;phoneme?:string}[])=>performanceSchema.parse({...base,overrides:[{index:0,origin:'manual',phonemes}]});
  const performance=edit([{index:0,offsetMs:0}]),before=structuredClone(performance);
  const result=notePerformance(notes,0,bpm,performance);
  assert.deepEqual(result.phoneme_overrides,[{index:0,offset:0}]);
  assert.deepEqual(performance,before);
  const legacy=notePerformance(notes,0,bpm,base);
  assert.deepEqual(legacy.phoneme_overrides,[{index:0,offset:Math.round(consonantMs*bpm*480/60000)}]);
  assert.deepEqual(result.pitch,legacy.pitch);assert.deepEqual(result.vibrato,legacy.vibrato);
  assert.deepEqual(notePerformance(notes,1,bpm,performance),notePerformance(notes,1,bpm,base));
  assert.deepEqual(performanceCurves(notes,0,3,performance,bpm),performanceCurves(notes,0,3,base,bpm));
  for(const offsetMs of [-30,30])assert.deepEqual(notePerformance(notes,0,bpm,edit([{index:0,offsetMs}])).phoneme_overrides,[{index:0,offset:Math.round(offsetMs*bpm*480/60000)}]);
  assert.deepEqual(notePerformance(notes,0,bpm,edit([{index:0,phoneme:'h'}])).phoneme_overrides,[{index:0,phoneme:'h'}]);
  assert.deepEqual(notePerformance(notes,0,bpm,edit([{index:3,offsetMs:0}])).phoneme_overrides,legacy.phoneme_overrides);
  assert.deepEqual(notePerformance(notes,0,bpm,edit([])).phoneme_overrides,legacy.phoneme_overrides);
 }
 assert.deepEqual(notePerformance(notes,0,60,{preset:'natural',overrides:[{index:0,phonemes:[{index:3,offsetMs:.1}]}]}).phoneme_overrides,[],'rounded zero at other positions retains legacy omission');
 assert.throws(()=>performanceSchema.parse({preset:'natural',overrides:[{index:0,phonemes:[{index:0,offsetMs:0},{index:0,offsetMs:12}]}]}));
});

test('USTX preserves explicit first zero; dependency revision invalidates only zero-edited phrases',()=>{
 const p=createProject(),line=p.lyrics[0];line.performance={preset:'natural',mode:'manual',consonantMs:12};
 const before=singingDependency(p,line,voice),sibling=singingDependency(p,p.lyrics[1],voice),tracks=structuredClone(p.tracks);
 const tuned=setPhrasePerformance(p,line.id,{...line.performance,overrides:[{index:0,origin:'manual',phonemes:[{index:0,offsetMs:0}]}]});
 const performance=tuned.lyrics[0].performance!;
 assert.equal(resolvePerformance(performance).renderRevision,4);
 assert.equal(resolvePerformance(line.performance).renderRevision,2);
 assert.equal(resolvePerformance({preset:'soft',mode:'auto'}).renderRevision,3);
 assert.deepEqual(notePerformance(notes,1,120,{preset:'soft',mode:'auto',overrides:[{index:1,locked:true,phonemes:[{index:0,offsetMs:0}]}]}).phoneme_overrides,[{index:0,offset:0}]);
 const input={lyricId:line.id,lyrics:line.text,start:line.start,end:line.end,bpm:p.bpm,notes:alignedNotes(line),performance};
 const u=qixuanProject(input);
 assert.deepEqual(u.voice_parts[0].notes[0].phoneme_overrides,[{index:0,offset:0}]);
 assert.deepEqual(u.voice_parts[0].notes.slice(1),qixuanProject({...input,performance:line.performance}).voice_parts[0].notes.slice(1));
 assert.notEqual(singingDependency(tuned,tuned.lyrics[0],voice),before);
 assert.equal(singingDependency(tuned,tuned.lyrics[1],voice),sibling);assert.deepEqual(tuned.tracks,tracks);
});
