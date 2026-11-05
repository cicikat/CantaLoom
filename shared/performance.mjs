import {performanceSchema} from './contracts/melody.mjs';
export const performancePresets={natural:{transitionMs:60,vibratoDepth:18,dynamics:0,consonantMs:0},soft:{transitionMs:95,vibratoDepth:12,dynamics:-35,consonantMs:12},strong:{transitionMs:35,vibratoDepth:30,dynamics:22,consonantMs:-12}};
export function resolvePerformance(input){const p=performanceSchema.parse(input);return {...performancePresets[p.preset],...p}}
export function notePerformance(notes,index,bpm,input){
 const n=notes[index],previous=notes[index-1],p=resolvePerformance(input),connected=previous&&Math.abs(previous.beat+previous.duration-n.beat)<.001;
 // USTX pitch x is milliseconds, y is tenths of a semitone.
 const delta=connected?Math.max(-70,Math.min(70,(previous.midi-n.midi)*10)):0;
 return {pitch:{data:[{x:-p.transitionMs,y:delta,shape:'io'},{x:Math.max(10,p.transitionMs*.7),y:0,shape:'io'}],snap_first:!!connected},vibrato:{length:n.duration*60/bpm>=.65?45:0,period:185,depth:p.vibratoDepth,in:20,out:25,shift:0,drift:0},phoneme_expressions:[],phoneme_overrides:p.consonantMs?[{index:0,offset:Math.round(p.consonantMs*bpm*480/60000)}]:[]};
}
export function performanceCurves(notes,start,end,input){const p=resolvePerformance(input);return [{abbr:'dyn',xs:[0,...notes.flatMap(n=>[Math.round((n.beat-start)*480),Math.round((n.beat+n.duration*.7-start)*480)]),Math.round((end-start)*480)],ys:[p.dynamics,...notes.flatMap(n=>[Math.round(p.dynamics+(n.velocity-.5)*30),p.dynamics-8]),p.dynamics-15]}]}
