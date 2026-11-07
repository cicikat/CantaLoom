import {performanceSchema,pitchCurveSchema} from './contracts/melody.mjs';
export const performancePresets={natural:{transitionMs:60,vibratoDepth:18,dynamics:0,consonantMs:0},soft:{transitionMs:95,vibratoDepth:12,dynamics:-35,consonantMs:12},strong:{transitionMs:35,vibratoDepth:30,dynamics:22,consonantMs:-12}};
export function resolvePerformance(input){const p=performanceSchema.parse(input);return {renderRevision:p.mode==='auto'&&p.preset!=='natural'?3:2,...performancePresets[p.preset],...p}}
export function notePerformance(notes,index,bpm,input){
 const n=notes[index],previous=notes[index-1],p=plannedNote(notes,index,bpm,input),connected=previous&&Math.abs(previous.beat+previous.duration-n.beat)<.001;
 // USTX pitch x is milliseconds, y is tenths of a semitone. A custom per-note curve replaces the automatic transition points for that note only.
 const leap=previous?Math.abs(previous.midi-n.midi):0,legato=connected&&(input.mode!=='auto'||leap<=5);
 const delta=legato?Math.max(-50,Math.min(50,(previous.midi-n.midi)*10)):0;
 const custom=input.overrides?.find(n=>n.index===index)?.pitch,pitch=custom?{data:pitchCurveSchema.parse(custom),snap_first:false}:{data:[{x:-p.transitionMs,y:delta,shape:'io'},{x:Math.max(10,p.transitionMs*.7),y:0,shape:'io'}],snap_first:!!legato};
 // USTX vibrato: length/in/out are % of note length, period ms, depth cents, drift % of depth, vol_link % volume wobble. Defaults keep the pre-v0.4.0 automatic shape.
 const seconds=n.duration*60/bpm,autoLength=seconds>=.65?(input.mode==='auto'?Math.min(40,15+(seconds-.65)*18):45):0;
 const vibrato={length:p.vibratoLength??autoLength,period:p.vibratoPeriod??185,depth:p.vibratoDepth,in:p.vibratoIn??25,out:p.vibratoOut??35,shift:0,drift:p.vibratoDrift??0,vol_link:p.vibratoVolLink??0};
 // Phoneme overrides: explicit per-phoneme edits (v0.4.0); legacy consonantMs still maps to phoneme 0 when no explicit edit targets it.
 const edits=(p.phonemes??[]).map(e=>({index:e.index,...(e.offsetMs?{offset:Math.round(e.offsetMs*bpm*480/60000)}:{}),...(e.phoneme?{phoneme:e.phoneme}:{})})).filter(o=>o.offset||o.phoneme);
 if(p.consonantMs&&n.syllable!=='+'&&!edits.some(o=>o.index===0))edits.unshift({index:0,offset:Math.round(p.consonantMs*bpm*480/60000)});
 return {pitch,vibrato,phoneme_expressions:[],phoneme_overrides:edits.sort((a,b)=>a.index-b.index)};
}
export function plannedNote(notes,index,bpm,input){
 const base=resolvePerformance(input);if(input.mode!=='auto')return {...base,...input.overrides?.find(n=>n.index===index)};
 const n=notes[index],prev=notes[index-1],seconds=n.duration*60/bpm,gap=prev?n.beat-prev.beat-prev.duration:1,leap=prev?Math.abs(n.midi-prev.midi):0,energy=input.energy??.6;
 const auto={transitionMs:gap>.02?25:leap>5?22:leap===0?30:Math.min(80,seconds*180),vibratoDepth:seconds>.65?Math.min(24,10+energy*12):0,dynamics:Math.round((energy-.5)*24+(n.velocity-.5)*20+(index===0?-5:0)),consonantMs:gap>.1?0:seconds<.22?-4:leap>7?0:-8};
 if(input.preset==='soft'){auto.transitionMs=Math.min(100,auto.transitionMs*1.2);auto.vibratoDepth*=.75;auto.dynamics-=10}else if(input.preset==='strong'){auto.transitionMs*=.8;auto.vibratoDepth=Math.min(28,auto.vibratoDepth*1.15);auto.dynamics+=8}
 for(const name of ['transitionMs','vibratoDepth','dynamics','consonantMs'])if(input[name]!==undefined)auto[name]=input[name];
 return {...base,...auto,...input.overrides?.find(n=>n.index===index)};
}
export function performanceCurves(notes,start,end,input,bpm=120){
 // Manual dynCurve replaces the automatic DYN shape; engine-curve x is milliseconds from the phrase start, y integers in the descriptor range of each abbr. Outside the covered ticks OpenUtau uses the expression default.
 const ms=x=>Math.round(x*bpm*480/60000),manual=(points)=>({xs:points.map(p=>ms(p.x)),ys:points.map(p=>Math.round(p.y))});
 let dyn;
 if(input.dynCurve)dyn={abbr:'dyn',...manual(input.dynCurve)};
 else{const points=new Map([[0,resolvePerformance(input).dynamics]]);notes.forEach((n,i)=>{const p=plannedNote(notes,i,bpm,input);points.set(Math.round((n.beat-start)*480),p.dynamics);points.set(Math.round((n.beat+n.duration*.7-start)*480),p.dynamics-(i===notes.length-1?16:5))});points.set(Math.round((end-start)*480),resolvePerformance(input).dynamics-18);const sorted=[...points].sort((a,b)=>a[0]-b[0]);dyn={abbr:'dyn',xs:sorted.map(p=>p[0]),ys:sorted.map(p=>p[1])}}
 return [dyn,...(input.curves??[]).map(c=>({abbr:c.abbr,...manual(c.points)}))];
}

export function automaticPhrase(text,notes,energy=.6,previous={preset:'natural'}){
 if(previous.locked)return previous;
 const boundaries=new Set();let chars=0;for(const ch of Array.from(text)){if(/[\p{L}\p{N}]/u.test(ch))chars++;else if(/[，。；！？、,.!?;]/.test(ch))boundaries.add(chars)}
 let sung=0;const overrides=[];for(let i=0;i<notes.length;i++){if(notes[i].syllable!=='+'){if(boundaries.has(sung))overrides.push({index:i,origin:'auto',consonantMs:0,dynamics:Math.round((energy-.5)*24)-5});sung++}}
 const manual=(previous.overrides||[]).filter(o=>o.origin!=='auto'||o.locked);return {...previous,mode:'auto',energy,overrides:[...overrides.filter(o=>!manual.some(m=>m.index===o.index)),...manual]};
}
export function performancePlan(p){return {version:1,phrases:p.lyrics.map(l=>({id:l.id,performance:l.performance,notes:l.notes.map((_,i)=>plannedNote(l.notes,i,p.bpm,l.performance||{preset:'natural'})),curves:performanceCurves(l.notes,l.start,l.end,l.performance||{preset:'natural'},p.bpm)}))}}
