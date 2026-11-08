import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {parse} from 'yaml';
import {createHash} from 'node:crypto';
import {qixuanInput} from '../shared/contracts/index.mjs';
import {realAcceptance} from './support/tier.mjs';
import {qixuanStatus,renderQixuan} from '../server/services/qixuan.mjs';
import {cacheRoot} from '../server/services/instruments.mjs';

test('real Qixuan explicit zero: USTX precedence, WAV comparison and repeated cache', {timeout:1800000},async t=>{
 if(!realAcceptance)return t.skip('external acceptance disabled');
 const voice=await qixuanStatus();if(!voice.available)return t.skip(voice.message);
 const base={lyricId:'task32-real',lyrics:'海浪',start:0,end:4,bpm:120,runner:'CPU',take:32,engineVersion:voice.engineVersion,notes:[{beat:0,duration:2,midi:62,velocity:.5,syllable:'海'},{beat:2,duration:2,midi:64,velocity:.5,syllable:'浪'}]};
 const legacy={preset:'natural',mode:'manual',consonantMs:12};
 const zero={...legacy,overrides:[{index:0,origin:'manual',phonemes:[{index:0,offsetMs:0}]}]};
 const reference={...legacy,overrides:[{index:0,origin:'manual',consonantMs:0}]};
 const results=[];await mkdir('temp/task32',{recursive:true});
 for(const [name,performance] of Object.entries({legacy,zero,reference})){
  const result=await renderQixuan({...base,performance});
  const {lyricId,...dependencies}=qixuanInput.parse({...base,performance});
  const expectedKey=createHash('sha256').update(JSON.stringify({dependencies,voiceVersion:voice.version,parameters:voice.parameters,revision:name==='zero'?6:4})).digest('hex');
  assert.equal(result.key,expectedKey,'only explicit zero uses the corrected cache revision');assert.ok(result.rms>.00001);assert.equal(result.isDemo,false);
  const ustx=await readFile(result.sourceProject,'utf8'),project=parse(ustx),notes=project.voice_parts[0].notes;
  assert.deepEqual(notes[0].phoneme_overrides,name==='zero'?[{index:0,offset:0}]:name==='legacy'?[{index:0,offset:12}]:[]);
  assert.deepEqual(notes[1].phoneme_overrides,[{index:0,offset:12}]);
  const wav=await readFile(path.join(cacheRoot,result.key+'.wav'));
  await writeFile(`temp/task32/${name}.ustx`,ustx);await writeFile(`temp/task32/${name}.wav`,wav);results.push({name,result,wav});
 }
 const [a,b,c]=results;assert.notEqual(a.result.key,b.result.key);assert.notDeepEqual(a.wav,b.wav);
 const repeat=await renderQixuan({...base,performance:zero});assert.equal(repeat.key,b.result.key);assert.equal(repeat.cached,true);assert.deepEqual(await readFile(path.join(cacheRoot,repeat.key+'.wav')),b.wav);
 const pcm=bytes=>{const offset=bytes.indexOf(Buffer.from('data'))+8;return new Int16Array(bytes.buffer,bytes.byteOffset+offset,(bytes.length-offset)/2)};
 const meanDifference=(x,y)=>{const a=pcm(x),b=pcm(y);let sum=0;for(let i=0;i<Math.min(a.length,b.length);i++)sum+=Math.abs(a[i]-b[i]);return sum/Math.min(a.length,b.length)};
 const report={variants:results.map(({name,result})=>({name,key:result.key,cached:result.cached,rms:result.rms})),legacyZeroMeanDifference:meanDifference(a.wav,b.wav),zeroReferenceMeanDifference:meanDifference(b.wav,c.wav),boundary:'USTX precedence and WAV comparison; no direct phoneme onset measurement or human listening acceptance'};
 await writeFile('temp/task32/result.json',JSON.stringify(report,null,2));t.diagnostic(JSON.stringify(report));
});
