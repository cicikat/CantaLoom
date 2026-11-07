import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import path from 'node:path';
import {qixuanStatus,renderQixuan} from '../server/services/qixuan.mjs';
import {cacheRoot} from '../server/services/instruments.mjs';

// Real OpenUtau/Qixuan A/B regression for v0.4.0 tuning parameters: every exposed parameter must change the actual rendered audio, and unsupported effects must stay rejected.
// Skips when the engine is not installed; set SONGYU_REAL_TESTS=0 to disable explicitly.
const voice=await qixuanStatus();
const enabled=voice.available&&process.env.SONGYU_REAL_TESTS!=='0';
const take=Math.floor(Math.random()*10000);
// Notes are shifted one semitone up from the p0 real fixture so this baseline can never share a cache key with it (lyricId is not a cache dependency).
const base={lyricId:'p1-real-a',lyrics:'海浪轻轻摇晃',start:4,end:12,bpm:120,
 notes:[{beat:4,duration:1,midi:61,velocity:.5,syllable:'海'},{beat:5,duration:1,midi:63,velocity:.5,syllable:'浪'},{beat:6,duration:2,midi:65,velocity:.5,syllable:'轻'},{beat:8,duration:1,midi:63,velocity:.5,syllable:'轻'},{beat:9,duration:1,midi:61,velocity:.5,syllable:'摇'},{beat:10,duration:2,midi:58,velocity:.5,syllable:'晃'}],
 runner:'CPU',take,engineVersion:voice.available?voice.engineVersion:'x'};
const phrase=performance=>({...base,...(performance?{performance}:{})});
const samples=async key=>{const wav=await readFile(path.join(cacheRoot,key+'.wav'));return new Int16Array(wav.buffer,wav.byteOffset+44,(wav.length-44)/2)};
const diff=(a,b)=>{let sum=0;const n=Math.min(a.length,b.length);for(let i=0;i<n;i++)sum+=Math.abs(a[i]-b[i]);return sum/n};

test('real Qixuan engine renders v0.4.0 tuning parameters into audibly different WAVs',{skip:!enabled&&'需要已安装的绮萱引擎；SONGYU_REAL_TESTS=0 可显式关闭',timeout:2400000},async()=>{
 const a=await renderQixuan(phrase());
 assert.equal(a.cached,false);assert.ok(Array.isArray(a.phonemes)&&a.phonemes.length>0,'响应携带真实音素序列');
 const pa=await samples(a.key);
 const variants={
  brec:{preset:'natural',mode:'manual',curves:[{abbr:'brec',points:[{x:0,y:80},{x:2000,y:-40},{x:3900,y:60}]}]},
  voic:{preset:'natural',mode:'manual',curves:[{abbr:'voic',points:[{x:0,y:100},{x:1500,y:35},{x:3900,y:70}]}]},
  genc:{preset:'natural',mode:'manual',curves:[{abbr:'genc',points:[{x:0,y:45},{x:3900,y:-30}]}]},
  velc:{preset:'natural',mode:'manual',curves:[{abbr:'velc',points:[{x:0,y:150},{x:3900,y:80}]}]},
  pexp:{preset:'natural',mode:'manual',curves:[{abbr:'pexp',points:[{x:0,y:100},{x:2000,y:5},{x:3900,y:60}]}]},
  shfc:{preset:'natural',mode:'manual',curves:[{abbr:'shfc',points:[{x:0,y:0},{x:2000,y:120},{x:3900,y:-60}]}]},
  dynCurve:{preset:'natural',mode:'manual',dynCurve:[{x:0,y:-6},{x:1500,y:-90},{x:3900,y:-12}]},
  vibrato:{preset:'natural',mode:'manual',overrides:[{index:2,origin:'manual',vibratoDepth:55,vibratoLength:85,vibratoPeriod:140,vibratoIn:15,vibratoOut:20,vibratoDrift:20,vibratoVolLink:50}]},
  phonemeOffset:{preset:'natural',mode:'manual',overrides:[{index:0,origin:'manual',phonemes:[{index:1,offsetMs:80}]}]},
  phonemeReplace:{preset:'natural',mode:'manual',overrides:[{index:0,origin:'manual',phonemes:[{index:1,phoneme:'zh/ang'}]}]},
 };
 const seen=new Set([a.key]);
 for(const [name,performance] of Object.entries(variants)){
  const r=await renderQixuan(phrase(performance));
  assert.ok(!seen.has(r.key),`${name} 产生独立缓存键`);seen.add(r.key);
  assert.equal(r.cached,false);assert.ok(r.rms>.0001,`${name} 非静音`);
  const d=diff(pa,await samples(r.key));
  assert.ok(d>.5,`${name} 与基线 WAV 存在真实差异（平均样本差 ${d.toFixed(2)}）`);
  console.log(`variant ${name}: key=${r.key.slice(0,12)} diff=${d.toFixed(2)}`);
 }
 const replaced=await renderQixuan(phrase(variants.phonemeReplace));
 assert.ok(replaced.phonemes.includes('zh/ang'),'替换后的音素进入真实音素序列');
 const velcKey=(await renderQixuan(phrase(variants.velc))).key;
 const velcUstx=await readFile(path.join(cacheRoot,velcKey+'.ustx'),'utf8');
 assert.ok(velcUstx.includes('velc')&&velcUstx.includes('default_value: 100'),'USTX 显式声明 velc 描述符');
 const again=await renderQixuan(phrase());
 assert.equal(again.key,a.key);assert.equal(again.cached,true,'基线缓存稳定命中');
 await assert.rejects(()=>renderQixuan(phrase({preset:'natural',mode:'manual',overrides:[{index:0,origin:'manual',phonemes:[{index:1,phoneme:'not_a_phoneme'}]}]})),/词表/,'非法音素在渲染前明确拒绝');
 const leftovers=(await readdir(cacheRoot)).filter(n=>n.includes('.pending'));
 assert.deepEqual(leftovers,[],'渲染不残留 pending 文件');
});
