import {grooveRandom} from './groove.mjs';

// Free-mode 4/4 drums. add accepts absolute beats. Recorded kicks are never supplemented.
export function drumPattern(p,t,section,energy,add){
 const density=p.songPlan.drumDensity;
 const random=grooveRandom([p.id,t.id,t.version,energy,density]);
 const taps=p.tapTimes??[];
 const recorded=taps.length>=4;
 const slots=recorded?[...new Set(taps.map(at=>Math.round((at-taps[0])/1000*p.bpm/60*4)%16))]:undefined;
 const strength=.25+.75*energy;
 const hit=(beat,midi,duration,velocity,sound)=>add(beat,midi,duration,Math.min(.92,velocity*strength),sound);
 const end=section.start+section.beats;
 for(let bar=section.start;bar<end;bar+=4){
  const kick=slots??(energy<.35?[0]:energy<.7?[0,8]:[0,6,8,11]);
  for(const slot of kick)hit(bar+slot/4,36,.2,recorded?.8:slot===0?.85:.66,'kick');
  if(recorded&&p.rhythmCompletion===false)continue;
  for(const offset of [1,3])hit(bar+offset,38,.15,.68,'snare');
  const step=density==='sparse'||energy<.35?1:density==='busy'&&energy>=.7?.25:.5;
  for(let offset=0;offset<4;offset+=step){
   const accent=offset%1===0?.38:offset%.5===0?.23:.14;
   hit(bar+offset,42,.06,accent*(.94+random()*.12),'hat');
  }
  // One restrained pickup at low energy; progressively denser final-bar snare fill.
  if(bar+4>=end){
   const offsets=energy<.35?[3.5]:energy<.7?[2.5,3.5]:[2.5,2.75,3.25,3.5,3.75];
   for(const offset of offsets)hit(bar+offset,38,.09,(.3+random()*.16)*(offset>=3.5?1.15:1),'snare');
  }
 }
}
