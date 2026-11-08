import {realAcceptance} from './support/tier.mjs';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile,readdir,access} from 'node:fs/promises';
import path from 'node:path';
import {qixuanStatus,renderQixuan} from '../server/services/qixuan.mjs';
import {cacheRoot} from '../server/services/instruments.mjs';

// Real OpenUtau/Qixuan regression: actual inference, cache precision and atomic files.
// Opt in with SONGYU_TEST_TIER=acceptance; missing engines skip, SONGYU_REAL_TESTS=0 disables.
const voice=realAcceptance?await qixuanStatus():{available:false};
const enabled=realAcceptance&&voice.available;
// A fresh take per run keeps the first render uncached even on repeat executions; take is a cache dependency by design.
const take=Math.floor(Math.random()*10000);
const phrase=(midiShift=0,performance)=>({lyricId:'p0-real-a',lyrics:'海浪轻轻摇晃',start:4,end:12,bpm:120,
 notes:[{beat:4,duration:1,midi:60+midiShift,velocity:.5,syllable:'海'},{beat:5,duration:1,midi:62+midiShift,velocity:.5,syllable:'浪'},{beat:6,duration:2,midi:64+midiShift,velocity:.5,syllable:'轻'},{beat:8,duration:1,midi:62+midiShift,velocity:.5,syllable:'轻'},{beat:9,duration:1,midi:60+midiShift,velocity:.5,syllable:'摇'},{beat:10,duration:2,midi:57+midiShift,velocity:.5,syllable:'晃'}],
 runner:'CPU',take,engineVersion:voice.available?voice.engineVersion:'x',...(performance?{performance}:{})});

test('real Qixuan engine renders phrase WAV with padding, precise cache invalidation and atomic cache files',{skip:!enabled&&'需要已安装的绮萱引擎；设置 SONGYU_TEST_TIER=acceptance 启用，SONGYU_REAL_TESTS=0 可关闭',timeout:1500000},async()=>{
 const a=await renderQixuan(phrase());
 assert.equal(a.cached,false);assert.equal(a.isDemo,false);
 assert.ok(Math.abs(a.startSeconds-(4*60/120-.2))<.001,'startSeconds 对应时间轴起点减去前置 padding');
 assert.ok(Math.abs(a.durationSeconds-(8*60/120+.4))<.02,'长度为单句时长加前后各 0.2 秒 padding');
 assert.ok(a.rms>.0001,'真实渲染非静音');
 await access(path.join(cacheRoot,a.key+'.json'));
 const again=await renderQixuan(phrase());
 assert.equal(again.cached,true);assert.equal(again.key,a.key,'相同依赖命中既有缓存');
 const b=await renderQixuan(phrase(2));
 assert.notEqual(b.key,a.key,'音高修改使本句缓存失效');
 const [wa,wb]=await Promise.all([readFile(path.join(cacheRoot,a.key+'.wav')),readFile(path.join(cacheRoot,b.key+'.wav'))]);
 assert.ok(wa.length>1000&&wb.length>1000);assert.notDeepEqual(wb,wa,'新旧 WAV 是真实不同的音频');
 const curve={preset:'natural',mode:'manual',overrides:[{index:0,origin:'manual',pitch:[{x:-60,y:-80,shape:'io'},{x:40,y:0,shape:'io'},{x:300,y:50,shape:'l'}]}]};
 const c=await renderQixuan(phrase(0,curve));
 assert.notEqual(c.key,a.key);assert.notEqual(c.key,b.key,'Pitch 曲线作为独立依赖产生新缓存');
 const wc=await readFile(path.join(cacheRoot,c.key+'.wav'));assert.notDeepEqual(wc,wa,'Pitch 曲线改变真实音频');
 const sibling=()=>({...phrase(),lyricId:'p0-real-b',lyrics:'星光落在窗台'});
 const s1=await renderQixuan(sibling()),s2=await renderQixuan(sibling());
 assert.equal(s2.key,s1.key);assert.equal(s2.cached,true,'兄弟句缓存稳定');
 const leftovers=(await readdir(cacheRoot)).filter(n=>n.includes('.pending'));
 assert.deepEqual(leftovers,[],'渲染不残留 pending 文件');
});
