import {performanceSchema} from './contracts/melody.mjs';
export const performancePresets={natural:{transitionMs:60,vibratoDepth:18,dynamics:0,consonantMs:0},soft:{transitionMs:95,vibratoDepth:12,dynamics:-35,consonantMs:12},strong:{transitionMs:35,vibratoDepth:30,dynamics:22,consonantMs:-12}};
export function resolvePerformance(input){const p=performanceSchema.parse(input);return {renderRevision:p.mode==='auto'&&p.preset!=='natural'?3:2,...performancePresets[p.preset],...p}}
export function notePerformance(notes,index,bpm,input){
 const n=notes[index],previous=notes[index-1],p=plannedNote(notes,index,bpm,input),connected=previous&&Math.abs(previous.beat+previous.duration-n.beat)<.001;
 // USTX pitch x is milliseconds, y is tenths of a semitone.
 const leap=previous?Math.abs(previous.midi-n.midi):0,legato=connected&&(input.mode!=='auto'||leap<=5);
 const delta=legato?Math.max(-50,Math.min(50,(previous.midi-n.midi)*10)):0;
 return {pitch:{data:[{x:-p.transitionMs,y:delta,shape:'io'},{x:Math.max(10,p.transitionMs*.7),y:0,shape:'io'}],snap_first:!!legato},vibrato:{length:n.duration*60/bpm>=.65?(input.mode==='auto'?Math.min(40,15+(n.duration*60/bpm-.65)*18):45):0,period:185,depth:p.vibratoDepth,in:25,out:35,shift:0,drift:0},phoneme_expressions:[],phoneme_overrides:p.consonantMs&&n.syllable!=='+'?[{index:0,offset:Math.round(p.consonantMs*bpm*480/60000)}]:[]};
}
export function plannedNote(notes,index,bpm,input){
 const base=resolvePerformance(input);if(input.mode!=='auto')return {...base,...input.overrides?.find(n=>n.index===index)};
 const n=notes[index],prev=notes[index-1],seconds=n.duration*60/bpm,gap=prev?n.beat-prev.beat-prev.duration:1,leap=prev?Math.abs(n.midi-prev.midi):0,energy=input.energy??.6;
 const auto={transitionMs:gap>.02?25:leap>5?22:leap===0?30:Math.min(80,seconds*180),vibratoDepth:seconds>.65?Math.min(24,10+energy*12):0,dynamics:Math.round((energy-.5)*24+(n.velocity-.5)*20+(index===0?-5:0)),consonantMs:gap>.1?0:seconds<.22?-4:leap>7?0:-8};
 if(input.preset==='soft'){auto.transitionMs=Math.min(100,auto.transitionMs*1.2);auto.vibratoDepth*=.75;auto.dynamics-=10}else if(input.preset==='strong'){auto.transitionMs*=.8;auto.vibratoDepth=Math.min(28,auto.vibratoDepth*1.15);auto.dynamics+=8}
 for(const name of ['transitionMs','vibratoDepth','dynamics','consonantMs'])if(input[name]!==undefined)auto[name]=input[name];
 return {...base,...auto,...input.overrides?.find(n=>n.index===index)};
}
export function performanceCurves(notes,start,end,input,bpm=120){const points=new Map([[0,resolvePerformance(input).dynamics]]);notes.forEach((n,i)=>{const p=plannedNote(notes,i,bpm,input);points.set(Math.round((n.beat-start)*480),p.dynamics);points.set(Math.round((n.beat+n.duration*.7-start)*480),p.dynamics-(i===notes.length-1?16:5))});points.set(Math.round((end-start)*480),resolvePerformance(input).dynamics-18);const sorted=[...points].sort((a,b)=>a[0]-b[0]);return [{abbr:'dyn',xs:sorted.map(p=>p[0]),ys:sorted.map(p=>p[1])}]}

export function automaticPhrase(text,notes,energy=.6,previous={preset:'natural'}){
 if(previous.locked)return previous;
 const boundaries=new Set();let chars=0;for(const ch of Array.from(text)){if(/[\p{L}\p{N}]/u.test(ch))chars++;else if(/[，。；！？、,.!?;]/.test(ch))boundaries.add(chars)}
 let sung=0;const overrides=[];for(let i=0;i<notes.length;i++){if(notes[i].syllable!=='+'){if(boundaries.has(sung))overrides.push({index:i,origin:'auto',consonantMs:0,dynamics:Math.round((energy-.5)*24)-5});sung++}}
 const manual=(previous.overrides||[]).filter(o=>o.origin!=='auto'||o.locked);return {...previous,mode:'auto',energy,overrides:[...overrides.filter(o=>!manual.some(m=>m.index===o.index)),...manual]};
}
export function performancePlan(p){return {version:1,phrases:p.lyrics.map(l=>({id:l.id,performance:l.performance,notes:l.notes.map((_,i)=>plannedNote(l.notes,i,p.bpm,l.performance||{preset:'natural'})),curves:performanceCurves(l.notes,l.start,l.end,l.performance||{preset:'natural'},p.bpm)}))}}
