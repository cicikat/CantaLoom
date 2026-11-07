export function analyzePCM(data:Float32Array){let sum=0,peak=0,difference=0,clipped=0;for(let i=0;i<data.length;i++){const x=data[i];sum+=x*x;peak=Math.max(peak,Math.abs(x));if(Math.abs(x)>=.999)clipped++;if(i)difference+=(x-data[i-1])**2}return {rms:Math.sqrt(sum/Math.max(1,data.length)),peak,highFrequencyRatio:difference/Math.max(1e-9,sum),clipped}}
export function mixParameters(data:Float32Array){const m=analyzePCM(data);return {...m,gain:Math.min(2.2,Math.max(.45,.07/Math.max(.01,m.rms))),highpass:m.highFrequencyRatio>.6?75:95,trebleDb:m.highFrequencyRatio>.5?-3:-.5,threshold:m.peak>.6?-22:-16,ratio:m.peak/Math.max(.001,m.rms)>12?2.6:1.8}}
export function vocalBus(ctx:OfflineAudioContext,master:AudioNode,data:Float32Array,reverb=.08,gain=1){
 const params=mixParameters(data),input=ctx.createGain(),hp=ctx.createBiquadFilter(),treble=ctx.createBiquadFilter(),comp=ctx.createDynamicsCompressor();input.gain.value=params.gain*gain;hp.type='highpass';hp.frequency.value=params.highpass;treble.type='highshelf';treble.frequency.value=6000;treble.gain.value=params.trebleDb;comp.threshold.value=params.threshold;comp.ratio.value=params.ratio;comp.attack.value=.015;comp.release.value=.18;input.connect(hp).connect(treble).connect(comp).connect(master);
 if(reverb>0){const convolution=ctx.createConvolver(),impulse=ctx.createBuffer(2,Math.ceil(ctx.sampleRate*.65),ctx.sampleRate);for(let c=0;c<2;c++){let seed=123+c;const channel=impulse.getChannelData(c);for(let i=0;i<channel.length;i++){seed=(Math.imul(seed,1664525)+1013904223)|0;channel[i]=(seed/2147483648)*Math.exp(-i/(ctx.sampleRate*.13))*.25}}convolution.buffer=impulse;const wet=ctx.createGain();wet.gain.value=Math.min(.25,Math.max(0,reverb));comp.connect(convolution).connect(wet).connect(master)}return input;
}
// Raised-cosine edge fades for separately rendered phrase WAVs. Fades stay inside the engine padding (0.2 s head/tail), so the sung body is untouched and spliced phrases cannot click at the seams.
export function phraseEdgeFades(data:Float32Array,sampleRate:number,fadeInSeconds=.05,fadeOutSeconds=.15){
 const head=Math.min(Math.floor(data.length/2),Math.round(sampleRate*fadeInSeconds)),tail=Math.min(Math.floor(data.length/2),Math.round(sampleRate*fadeOutSeconds));
 for(let i=0;i<head;i++)data[i]*=.5-.5*Math.cos(Math.PI*i/head);
 for(let i=0;i<tail;i++)data[data.length-1-i]*=.5-.5*Math.cos(Math.PI*i/tail);
}
export const trackPan={drums:0,bass:0,guitar:-.3,keys:.28,melody:.12,vocal:0};
