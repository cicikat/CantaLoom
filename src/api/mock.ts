import {pinyin} from 'pinyin-pro';
import * as c from '../../shared/contracts/index.mjs';
import {createMockFreeRoutes,type MockProductionScenario} from './mock-free';

// Fixed plan, regardless of user idea: a UI fixture, never model inference.
const voice={available:true,id:'qixuan',version:'2.7.0',providerId:'openutau-diffsinger',label:'MOCK 测试声库（测试音，不是歌声）',engineVersion:'mock-fixture-v1',parameters:{steps:20,depth:.6},runners:['CPU','DirectML'],capabilities:{curves:{brec:true,voic:true,genc:true,velc:true,pexp:true,shfc:true,ene:false,tenc:false},phonemeOverride:{offset:true,replace:true},unsupported:['ene','tenc','voiceColor','phonemeEnvelope']},mock:true} as const;
const seen=new Set<string>();
async function audioKey(seconds:number,seed:string){const hash=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(seed));return Math.round(seconds*1000).toString(16).padStart(8,'0')+Array.from(new Uint8Array(hash),v=>v.toString(16).padStart(2,'0')).join('').slice(8)}
// Valid PCM generated locally for interaction tests. Duration encoded in key survives reload.
function wav(path:string){const key=c.audioFileSchema.parse(path.split('/').at(-1)).slice(0,-4),seconds=Math.min(35,Math.max(.1,parseInt(key.slice(0,8),16)/1000));const count=Math.ceil(seconds*24000),buffer=new ArrayBuffer(44+count*2),v=new DataView(buffer);const str=(at:number,s:string)=>[...s].forEach((ch,i)=>v.setUint8(at+i,ch.charCodeAt(0)));str(0,'RIFF');v.setUint32(4,buffer.byteLength-8,true);str(8,'WAVE');str(12,'fmt ');v.setUint32(16,16,true);v.setUint16(20,1,true);v.setUint16(22,1,true);v.setUint32(24,24000,true);v.setUint32(28,48000,true);v.setUint16(32,2,true);v.setUint16(34,16,true);str(36,'data');v.setUint32(40,count*2,true);const freq=220+parseInt(key.slice(8,10),16);for(let i=0;i<count;i++)v.setInt16(44+i*2,Math.sin(i*2*Math.PI*freq/24000)*1600*Math.min(1,i/240,(count-i)/240),true);return buffer}
const media=new Map<string,string>();
export function mockMediaUrl(path:string){if(!media.has(path))media.set(path,URL.createObjectURL(new Blob([wav(path)],{type:'audio/wav'})));return media.get(path)!}
export function createMockRequest(scenario:MockProductionScenario='success'):typeof fetch {
 const freeRoutes=createMockFreeRoutes(audioKey,scenario);
 return async(input,init)=>{
 const path=new URL(String(input),'http://mock.local').pathname;
 await new Promise<void>((resolve,reject)=>{if(init?.signal?.aborted)return reject(new DOMException('Aborted','AbortError'));const done=()=>{init?.signal?.removeEventListener('abort',abort);resolve()};const timer=setTimeout(done,150);const abort=()=>{clearTimeout(timer);reject(new DOMException('Aborted','AbortError'))};init?.signal?.addEventListener('abort',abort,{once:true})});
 const body=init?.body?JSON.parse(String(init.body)):undefined;
 const free=await freeRoutes(path,init?.method??'GET',body);if(free)return free;
 if(path==='/api/health')return Response.json({llm:true,llmStatus:'unverified',ffmpeg:true,vocal:'mock-test-tone',images:'procedural',mock:true});
 if(path==='/api/plan')return Response.json({title:'MOCK 固定测试作品',mood:'MOCK 明亮夹具',lyrics:['测试第一句歌词','测试第二句歌词','测试第三句歌词','测试第四句歌词'],songPlan:{key:{tonic:'C',mode:'major'},emotion:'bright',intensity:.6,chordProgression:[1,5,6,4],drumDensity:'steady',melodyContour:'arch',melodyRange:'medium',sectionEnergy:{intro:.4,verse:.6,chorus:.8,outro:.4},reasons:[{decision:'key',reason:'MOCK 固定测试数据，未调用 LLM。'}]},source:'llm',model:'mock-fixture-no-inference',mock:true});
 if(path==='/api/engines')return Response.json({instruments:{installed:true,ready:true,version:'MOCK 测试音源',soundfonts:['MOCK-test.sf2']},singing:'MOCK 测试数据，不依赖本地引擎',mock:true});
 if(path==='/api/singing/qixuan')return Response.json(voice);
 if(path==='/api/singing/dictionary'){const dict:Record<string,string>={};for(let code=0x4e00;code<=0x9fff;code++){const py=pinyin(String.fromCharCode(code),{toneType:'none',type:'array'})[0].replaceAll('ü','v');dict[py]='SP'}return Response.json(dict)}
 if(path==='/api/instruments/render'){const p=c.instrumentInput.parse(body),key=await audioKey(p.endBeat*60/p.bpm,JSON.stringify(p)),cached=seen.has(key);seen.add(key);return Response.json({audioUrl:`/api/audio/${key}.wav`,key,providerId:'fluidsynth',soundfont:'MOCK-test.sf2',sampleRate:48000,startSeconds:0,cached,mock:true})}
 if(path==='/api/singing/qixuan/render'){const p=c.qixuanInput.parse(body),key=await audioKey((p.end-p.start)*60/p.bpm+.4,JSON.stringify(p)),cached=seen.has(key);seen.add(key);return Response.json({audioUrl:`/api/audio/${key}.wav`,key,voiceId:voice.id,voiceVersion:voice.version,providerId:voice.providerId,engineVersion:voice.engineVersion,renderParameters:{runner:p.runner,...voice.parameters},take:p.take,phonemes:['MOCK/SP','MOCK/a'],isDemo:true,cached,startSeconds:p.start*60/p.bpm,durationSeconds:(p.end-p.start)*60/p.bpm+.4,createdAt:'2026-01-01T00:00:00.000Z',mock:true})}
 if(path==='/api/singing/import'){c.importInput.parse(body);const bytes=Uint8Array.from(atob(body.wav),(v:string)=>v.charCodeAt(0));const duration=new DataView(bytes.buffer).getUint32(40,true)/new DataView(bytes.buffer).getUint32(28,true);const key=await audioKey(duration,body.wav);return Response.json({audioUrl:`/api/audio/${key}.wav`,key,mock:true})}
 if(path.startsWith('/api/audio/'))return new Response(wav(path),{headers:{'Content-Type':'audio/wav'}});
 const artifact=path.match(/^\/api\/artifacts\/([^/]+)(\/loudness)?$/);
 if(artifact){
  const file=artifact[1];if(!c.artifactFileSchema.safeParse(file).success||artifact[2]&&!c.audioFileSchema.safeParse(file).success)return Response.json({error:'MOCK 产物文件名无效'},{status:400});
  if(artifact[2])return Response.json({integratedLufs:-20,truePeakDbtp:-3,mock:true});
  if(file.endsWith('.wav'))return new Response(wav(file),{headers:{'Content-Type':'audio/wav'}});
  if(file.endsWith('.ustx'))return new Response('# MOCK fixture; not a real sung project\nname: MOCK test artifact\ntracks: []\nvoice_parts: []\n',{headers:{'Content-Type':'application/octet-stream'}});
  // Minimal MIDI fixture (empty track), deliberately never represented as a real arrangement.
  return new Response(new Uint8Array([77,84,104,100,0,0,0,6,0,0,0,1,1,224,77,84,114,107,0,0,0,4,0,255,47,0]),{headers:{'Content-Type':'audio/midi'}});
 }
 if(path==='/api/export'){const p=c.exportInput.parse(body);return Response.json({mock:true,state:'succeeded',message:'MOCK 导出交互完成；没有运行 FFmpeg，没有生成 MP4',title:p.title,duration:p.duration})}
 // Closed fallback: Mock mode must never contact engines or administration.
 return Response.json({error:'MOCK 未定义该接口：'+path},{status:404});
 };
}
export const mockRequest=createMockRequest();
