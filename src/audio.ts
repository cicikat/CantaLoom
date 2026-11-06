import {vocalBus,trackPan,mixParameters} from './audio-mix';
import {api} from './api/client';
import {type SongProject,type TrackKind,type Note,duration,beatsToSeconds} from './model';
import {instrumentAudio,currentVocalAsset} from './external-audio';
export interface VocalProvider {id:string; label:string; isDemo:boolean; schedule(ctx:BaseAudioContext,destination:AudioNode,note:Note,start:number,length:number,preset:string):void}
function envelope(ctx:BaseAudioContext,dest:AudioNode,start:number,length:number,volume:number){const g=ctx.createGain();g.gain.setValueAtTime(0,start);g.gain.linearRampToValueAtTime(volume,start+.012);g.gain.exponentialRampToValueAtTime(Math.max(.001,volume*.6),start+length*.65);g.gain.linearRampToValueAtTime(0,start+length);g.connect(dest);return g;}
const freq=(m:number)=>440*2**((m-69)/12);
export const demoVocal:VocalProvider={id:'vowel-formant-demo',label:'元音合成演示 · 不发歌词音',isDemo:true,schedule(ctx,dest,n,start,length,preset){
 const f=freq(n.midi);const real=new Float32Array(32),imag=new Float32Array(32);const formants=preset==='星羽'?[850,1500,2900]:preset==='雾歌'?[450,1000,2400]:[700,1200,2600];
 for(let h=1;h<32;h++)imag[h]=(.12+formants.reduce((v,formant)=>v+Math.exp(-(((h*f-formant)/250)**2)),0))/h;
 const o=ctx.createOscillator();o.setPeriodicWave(ctx.createPeriodicWave(real,imag));o.frequency.value=f;
 const lfo=ctx.createOscillator(),depth=ctx.createGain();lfo.frequency.value=5.2;depth.gain.value=4;lfo.connect(depth).connect(o.detune);o.connect(envelope(ctx,dest,start,length,n.velocity*.65));o.start(start);o.stop(start+length);lfo.start(start);lfo.stop(start+length);
}};
function schedule(ctx:BaseAudioContext,dest:AudioNode,n:Note,kind:TrackKind,start:number,length:number,preset:string){
 if(kind==='vocal'){demoVocal.schedule(ctx,dest,n,start,length,preset);return;}
 if(kind==='drums'){
  if(n.sound==='kick'){const o=ctx.createOscillator();o.frequency.setValueAtTime(140,start);o.frequency.exponentialRampToValueAtTime(40,start+.15);o.connect(envelope(ctx,dest,start,.2,n.velocity*.7));o.start(start);o.stop(start+.21);}
  else {const seconds=n.sound==='snare'?.15:.055;const buffer=ctx.createBuffer(1,Math.ceil(ctx.sampleRate*seconds),ctx.sampleRate),data=buffer.getChannelData(0);let seed=97+Math.round(n.beat*113);for(let i=0;i<data.length;i++){seed=(Math.imul(seed,1664525)+1013904223)|0;data[i]=(seed>>>0)/2147483648-1;}const source=ctx.createBufferSource(),filter=ctx.createBiquadFilter();source.buffer=buffer;filter.type='highpass';filter.frequency.value=n.sound==='snare'?1500:6500;source.connect(filter).connect(envelope(ctx,dest,start,seconds,n.velocity*.6));source.start(start);source.stop(start+seconds);}
  return;
 }
 const o=ctx.createOscillator(),filter=ctx.createBiquadFilter();o.type=kind==='bass'?'triangle':kind==='guitar'?'sawtooth':'sine';o.frequency.value=freq(n.midi);filter.type='lowpass';filter.frequency.value=kind==='guitar'?1350:kind==='bass'?650:3500;o.connect(filter).connect(envelope(ctx,dest,start,length,n.velocity*(kind==='bass'?.6:.45)));o.start(start);o.stop(start+length);
}
export async function renderAudio(p:SongProject,options:{trackId?:string;lyricId?:string;stem?:'vocal-dry'|'vocal-processed'|'instrumental'|'mix'}={}){
 let from=0,to=duration(p);const lyric=p.lyrics.find(l=>l.id===options.lyricId);const track=p.tracks.find(t=>t.id===options.trackId);
 if(lyric){from=beatsToSeconds(p,lyric.start);to=beatsToSeconds(p,lyric.end)}else if(track){const s=p.sections.find(s=>s.id===track.sectionId)!;from=beatsToSeconds(p,s.start);to=beatsToSeconds(p,s.start+s.beats)}
 if(lyric&&p.vocalMode==='external'){const asset=currentVocalAsset(p,lyric);from=asset.startSeconds;to=from+asset.durationSeconds}
 const relevantAssets=(lyric?[lyric]:p.lyrics.filter(l=>p.tracks.some(t=>t.kind==='vocal'&&!t.muted&&t.sectionId===l.sectionId&&(!options.trackId||t.id===options.trackId)))).map(l=>p.vocalAssets?.[l.id]).filter(a=>a?.providerId==='openutau-diffsinger');
 if(p.vocalMode==='external'&&relevantAssets.length){const voice=await api.qixuan();if(!voice.available||relevantAssets.some(a=>a!.engineVersion!==voice.engineVersion))throw Error('歌声引擎版本已改变，请重新演唱受影响的句子');}
 const ctx=new OfflineAudioContext(2,Math.ceil((to-from)*24000),24000);const master=ctx.createGain();const processed=(p.mixSettings?.enabled??p.mode==='free')&&options.stem!=='vocal-dry';master.gain.value=options.stem==='vocal-dry'?1:.8;const compressor=ctx.createDynamicsCompressor();compressor.threshold.value=-12;compressor.ratio.value=5;if(options.stem==='vocal-dry')master.connect(ctx.destination);else master.connect(compressor).connect(ctx.destination);
 const addWav=async(url:string,start:number,kind:TrackKind)=>{const buffer=await ctx.decodeAudioData(await api.audio(url));const source=ctx.createBufferSource();source.buffer=buffer;if(processed&&kind==='vocal')source.connect(vocalBus(ctx,master,buffer.getChannelData(0),p.mixSettings?.reverb??.08,p.mixSettings?.vocalGain??1));else if(processed){const gain=ctx.createGain(),pan=ctx.createStereoPanner();const balance=mixParameters(buffer.getChannelData(0));gain.gain.value=Math.min(1.4,balance.gain)*(p.mixSettings?.bandGain??1)*(kind==='bass'?.8:.65);pan.pan.value=trackPan[kind];source.connect(gain).connect(pan).connect(master)}else source.connect(master);source.start(Math.max(0,start-from),Math.max(0,from-start));};
 const addLyric=async(l:SongProject['lyrics'][number])=>{if(p.vocalMode==='external'){const a=currentVocalAsset(p,l);await addWav(a.audioUrl,a.startSeconds,'vocal')}else l.notes.forEach(n=>schedule(ctx,master,n,'vocal',beatsToSeconds(p,n.beat)-from,beatsToSeconds(p,n.duration),p.vocalPreset))};
 if(lyric)await addLyric(lyric);
 else for(const t of p.tracks.filter(t=>!t.muted&&(!options.trackId||t.id===options.trackId)&&(!options.stem||options.stem==='mix'||(options.stem==='instrumental'?t.kind!=='vocal':t.kind==='vocal')))){
  if(t.kind==='vocal'&&p.vocalMode==='external'){for(const l of p.lyrics.filter(l=>l.sectionId===t.sectionId))await addLyric(l)}
  else if(t.kind!=='vocal'&&p.instrumentMode==='fluidsynth'){if(t.notes.length){const a=await instrumentAudio(p,t);await addWav(a.audioUrl,0,t.kind)}}
  else t.notes.forEach(n=>schedule(ctx,master,n,t.kind,beatsToSeconds(p,n.beat)-from,beatsToSeconds(p,n.duration),p.vocalPreset));
 }
 const buffer=await ctx.startRendering();if(processed){let peak=0;for(let c=0;c<buffer.numberOfChannels;c++)for(const sample of buffer.getChannelData(c))peak=Math.max(peak,Math.abs(sample));if(peak>.98)for(let c=0;c<buffer.numberOfChannels;c++){const data=buffer.getChannelData(c);for(let i=0;i<data.length;i++)data[i]*=.98/peak}}return {buffer,from};
}
export class AudioEngine {
 context:AudioContext|undefined;source:AudioBufferSourceNode|undefined;started=0;offset=0;length=0;playing=false;generation=0;
 async unlock(){this.context??=new AudioContext();await this.context.resume()}
 async play(p:SongProject,offset=0,options:{trackId?:string;lyricId?:string}={}){this.stop();const gen=++this.generation;await this.unlock();const result=await renderAudio(p,options);if(gen!==this.generation)return;const source=this.context!.createBufferSource();source.buffer=result.buffer;source.connect(this.context!.destination);const seek=Math.min(offset,result.buffer.duration-.001);this.source=source;this.started=this.context!.currentTime;this.offset=result.from+seek;this.length=result.from+result.buffer.duration;this.playing=true;source.onended=()=>{if(this.source===source)this.playing=false};source.start(0,seek);}
 get time(){return this.playing?Math.min(this.length,this.offset+this.context!.currentTime-this.started):this.offset}
 stop(){this.generation++;const time=this.time;this.source?.stop();this.source=undefined;this.playing=false;this.offset=time;return time;}
 async tap(){await this.unlock();schedule(this.context!,this.context!.destination,{id:'tap',beat:0,duration:.1,midi:36,velocity:.55,sound:'kick'},'drums',this.context!.currentTime,.1,'澄音');}
}
export function wavBlob(buffer:AudioBuffer){const channels=2,length=buffer.length;const raw=new ArrayBuffer(44+length*channels*2),view=new DataView(raw);const string=(at:number,s:string)=>{for(let i=0;i<s.length;i++)view.setUint8(at+i,s.charCodeAt(i))};string(0,'RIFF');view.setUint32(4,raw.byteLength-8,true);string(8,'WAVE');string(12,'fmt ');view.setUint32(16,16,true);view.setUint16(20,1,true);view.setUint16(22,channels,true);view.setUint32(24,buffer.sampleRate,true);view.setUint32(28,buffer.sampleRate*4,true);view.setUint16(32,4,true);view.setUint16(34,16,true);string(36,'data');view.setUint32(40,length*4,true);for(let c=0;c<channels;c++){const data=buffer.getChannelData(c);for(let i=0;i<length;i++)view.setInt16(44+(i*2+c)*2,Math.round(Math.max(-1,Math.min(1,data[i]))*32767),true)}return new Blob([raw],{type:'audio/wav'});}
