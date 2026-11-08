import {realAcceptance} from './support/tier.mjs';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {freeArrangement} from '../shared/free-score.mjs';
import {midiFile} from '../shared/midi.mjs';
import {instrumentInput} from '../shared/contracts/index.mjs';
import {InstrumentRenderer,cacheRoot} from '../server/services/instruments.mjs';

const groove={projectId:'stable-project',trackId:'stable-track',version:1,swingTicks:60,timingTicks:15,velocityAmount:.08};
const notes=[0,.5,1,1.5,2,2.5,3,3.5].map(beat=>({beat,duration:.25,midi:60,velocity:.5}));
const track={kind:'keys',notes};
function arrangement(energy=.7,density='steady',extra={},t={}){
 const p={id:'p',bpm:120,tapTimes:[],sections:[{id:'s',start:0,beats:8}],songPlan:{key:{tonic:'C',mode:'major'},chordProgression:[1,6,4,5],drumDensity:density,sectionEnergy:{intro:energy}},lyrics:[],...extra};
 let id=0;return freeArrangement(p,{id:'t',kind:'drums',sectionId:'s',version:1,notes:[],...t},()=>String(id++));
}
// Decode actual SMF bytes, independently of the performance helper.
function events(bytes){
 const b=Buffer.from(bytes),result=[];let pos=14;
 while(pos<b.length){assert.equal(b.toString('ascii',pos,pos+4),'MTrk');const end=pos+8+b.readUInt32BE(pos+4);pos+=8;let tick=0;
  const variable=()=>{let n=0,x;do{x=b[pos++];n=(n<<7)|(x&127)}while(x&128);return n};
  while(pos<end){tick+=variable();const status=b[pos++];if(status===255){pos++;const length=variable();pos+=length;continue}const kind=status&240,pitch=b[pos++];if(kind===192)continue;const velocity=b[pos++];if(kind===144)result.push({tick,pitch,velocity})}
 }return result;
}

test('free drums use backbeats, final-bar energy fills, layered hats and deterministic patterns',()=>{
 const low=arrangement(.2),high=arrangement(.9,'busy');assert.deepEqual(high,arrangement(.9,'busy'));
 for(const beat of [1,3,5,7])assert.ok(low.some(n=>n.beat===beat&&n.sound==='snare'));
 assert.ok(high.filter(n=>n.sound==='snare'&&n.beat>=6).length>low.filter(n=>n.sound==='snare'&&n.beat>=6).length);
 assert.ok(high.filter(n=>n.sound==='hat').length>low.filter(n=>n.sound==='hat').length);
 assert.ok(new Set(high.filter(n=>n.sound==='hat').map(n=>Math.round(n.velocity*127))).size>=3);
 assert.ok(low.some(n=>n.velocity<.25));assert.ok(high.every(n=>n.velocity>0&&n.velocity<=.92&&n.beat+n.duration<=8));
 assert.notDeepEqual(midiFile({bpm:120,tracks:[{kind:'drums',notes:low}]}),midiFile({bpm:120,tracks:[{kind:'drums',notes:high}]}));
});

test('free TAP kicks and completion-off survive density changes; protected tracks are untouched',()=>{
 const taps={tapTimes:[100,350,850,1100]};
 const kicks=a=>a.filter(n=>n.sound==='kick').map(n=>n.beat);
 assert.deepEqual(kicks(arrangement(.2,'sparse',taps)),kicks(arrangement(.9,'busy',taps)));
 assert.deepEqual(kicks(arrangement(.9,'busy',taps)),[0,.5,1.5,2,4,4.5,5.5,6]);
 const only=arrangement(.9,'busy',{...taps,rhythmCompletion:false});assert.ok(only.every(n=>n.sound==='kick'));
 for(const protection of [{locked:true},{manuallyEdited:true},{notes:[{...notes[0],locked:true}]}]){
  const t={notes:[{...notes[0],id:'manual'}],...protection};const before=structuredClone(t);assert.deepEqual(arrangement(.9,'busy',{},t),t.notes);assert.deepEqual(t,before);
 }
});

test('MIDI applies integer swing and seeded humanization without mutating beats or protected input',()=>{
 const input={bpm:120,tracks:[structuredClone(track)],endBeat:4};const original=structuredClone(input),base=midiFile(input);
 const swing=midiFile({...input,tracks:[{...track,groove:{...groove,timingTicks:0,velocityAmount:0}}]});
 assert.deepEqual(events(swing).map(n=>n.tick),[0,300,480,780,960,1260,1440,1740]);
 const performed={...input,tracks:[{...track,groove}]};const first=midiFile(performed);assert.deepEqual(first,midiFile(performed));assert.notDeepEqual(first,swing);assert.deepEqual(input,original);
 const e=events(first);assert.ok(e.some((n,i)=>n.velocity!==events(base)[i].velocity));assert.ok(e.every((n,i)=>Math.abs(n.tick-events(swing)[i].tick)<=15));
 for(const change of [{version:2},{projectId:'another'},{trackId:'other'},{swingTicks:0}])assert.notDeepEqual(first,midiFile({...input,tracks:[{...track,groove:{...groove,...change}}]}));
 for(const protection of [{locked:true},{manuallyEdited:true},{notes:notes.map(n=>({...n,locked:true}))}])assert.deepEqual(base,midiFile({...input,tracks:[{...track,groove,...protection}]}));
 assert.deepEqual(base,midiFile({...input,tracks:[{...track,groove:{...groove,swingTicks:0,timingTicks:0,velocityAmount:0}}]}));
 const drums={kind:'drums',notes};assert.deepEqual(midiFile({bpm:120,tracks:[drums]}),midiFile({bpm:120,tracks:[{...drums,groove:{...groove,swingTicks:0}}]}));
 assert.throws(()=>instrumentInput.parse({bpm:120,...track,endBeat:4,groove:{...groove,timingTicks:21}}));
 assert.throws(()=>midiFile({...input,tracks:[{...track,groove:{...groove,swingTicks:.5}}]}));
});

test('real FluidSynth groove and energy change PCM and keys while repeat requests hit identical caches',async t=>{
 if(!realAcceptance)return t.skip('需要 SONGYU_TEST_TIER=acceptance；快速回归不调用外部引擎');
 const renderer=new InstrumentRenderer();if(!(await renderer.status()).ready)return t.skip('FluidSynth/SoundFont unavailable');
 await mkdir('temp/task20',{recursive:true});
 const inputs=[{bpm:120,...track,endBeat:4},{bpm:120,...track,endBeat:4,groove},... [.2,.9].map(energy=>({bpm:120,kind:'drums',notes:arrangement(energy,'busy'),endBeat:8}))];
 for(const protection of [{locked:true},{manuallyEdited:true},{notes:notes.map(n=>({...n,locked:true}))}]){
  const protectedInput={bpm:120,...track,endBeat:4,...protection};
  const plain=await renderer.render(protectedInput),withGroove=await renderer.render({...protectedInput,groove});assert.equal(plain.key,withGroove.key);assert.equal(withGroove.cached,true);
 }
 const results=[];
 for(const [i,input] of inputs.entries()){
  const before=structuredClone(input),first=await renderer.render(input),again=await renderer.render(input);assert.equal(again.cached,true);assert.equal(first.key,again.key);assert.deepEqual(input,before);
  const wav=await readFile(path.join(cacheRoot,first.key+'.wav'));assert.deepEqual(wav,await readFile(path.join(cacheRoot,again.key+'.wav')));await writeFile(`temp/task20/variant-${i}.wav`,wav);results.push({key:first.key,wav});
 }
 for(const [a,b] of [[0,1],[2,3]]){assert.notEqual(results[a].key,results[b].key);const pcm=x=>x.subarray(x.indexOf(Buffer.from('data'))+8);assert.notDeepEqual(pcm(results[a].wav),pcm(results[b].wav));}
 t.diagnostic(JSON.stringify({keys:results.map(r=>r.key),artifacts:'temp/task20/variant-0..3.wav'}));
});
