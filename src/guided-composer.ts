import type {SongProject,Track,Note,Lyric} from './model';
import {uid,quantizeTaps} from './model';
import {effectivePlan} from './song-plan';
import type {SongPlan} from '../shared/song-plan.mjs';

const tonicOffset={C:0,D:2,E:4,F:5,G:7,A:9,B:11};
export function scaleMidi(plan:SongPlan,index:number){
 const degrees=plan.key.mode==='minor'?[0,2,3,5,7,8,10]:[0,2,4,5,7,9,11];
 return 48+tonicOffset[plan.key.tonic]+12*Math.floor(index/7)+degrees[((index%7)+7)%7];
}
export function chordAt(plan:SongPlan,beat:number){const degree=plan.chordProgression[Math.floor(beat/4)%4]-1;return [0,2,4].map(n=>scaleMidi(plan,degree+n));}
function contour(plan:SongPlan,position:number){return plan.melodyContour==='rising'?position:plan.melodyContour==='falling'?1-position:plan.melodyContour==='arch'?1-Math.abs(position*2-1):.5;}
function pitch(plan:SongPlan,position:number,beat:number,variation=0){
 const span={narrow:3,medium:6,wide:10}[plan.melodyRange],index=7+Math.round(3+(contour(plan,position)-.5)*span+variation),desired=scaleMidi(plan,index);
 // Strong beats land on chord tones; other notes remain inside the planned key.
 if(Math.abs(beat-Math.round(beat/2)*2)<.001){const candidates=chordAt(plan,beat).flatMap(n=>[n,n+12,n+24]);return candidates.reduce((a,b)=>Math.abs(a-desired)<=Math.abs(b-desired)?a:b);}
 return desired;
}
export function sectionEnergy(p:SongProject,sectionId:string){const i=p.sections.findIndex(s=>s.id===sectionId);return effectivePlan(p).sectionEnergy[(['intro','verse','chorus','outro'] as const)[i]];}

export function generateGuided(p:SongProject,t:Track,random:()=>number):Note[]{
 const plan=effectivePlan(p),s=p.sections.find(x=>x.id===t.sectionId)!,energy=sectionEnergy(p,s.id),notes:Note[]=[];
 const strength=(.55+plan.intensity*.45)*(.45+energy*.55);
 const add=(at:number,midi:number,duration:number,velocity:number,sound?:Note['sound'])=>{if(at>=s.beats)return;notes.push({id:uid(),beat:s.start+at,midi,duration:Math.min(duration,s.beats-at),velocity:Math.min(1,velocity*strength),...(sound?{sound}:{})});};
 for(let bar=0;bar<s.beats/4;bar++){
  const offset=bar*4,chord=chordAt(plan,s.start+offset),root=chord[0];
  if(t.kind==='drums'){
   const tapped=p.tapTimes.length>=4?quantizeTaps(p.tapTimes,p.bpm):undefined;
   const kicks=tapped??(energy<.4?[0]:plan.drumDensity==='busy'?[0,6,8,11]:[0,8]);
   kicks.forEach(step=>add(offset+step/4,36,.22,t.version%2?.82:.68,'kick'));
   if(!tapped||p.rhythmCompletion!==false){
    (energy<.4?[12]:[4,12]).forEach(step=>add(offset+step/4,38,.16,.58,'snare'));
    const spacing=({sparse:8,steady:2,busy:1}[plan.drumDensity])*(energy<.5?2:1);
    for(let step=0;step<16;step+=Math.min(16,spacing))add(offset+step/4,42,.07,step%4===0?.24:.17,'hat');
    if(plan.drumDensity==='busy'&&energy>.65&&random()>.35)add(offset+3.75,38,.09,.32,'snare');
   }
  }
  if(t.kind==='bass')for(const at of energy<.4?[0,2]:[0,1.5,2,3.5])add(offset+at,root-12+(at===2&&t.version%2===0||random()>.8?7:0),plan.emotion==='calm'?.8:.4,.55);
  if(t.kind==='keys')chord.forEach((n,i)=>add(offset,n+(i===0&&t.version%2===0?12:0),plan.emotion==='driving'?2.8:3.7,.23));
  if(t.kind==='guitar'){const spacing=energy<.4?1:.5;for(let step=0;step<4;step+=spacing)if(step===0||random()>(1-energy)*.4)chord.forEach((n,i)=>add(offset+step+(step>0&&t.version%2===0?.2:0)+i*.015,n+12,plan.emotion==='driving'?.23:.5,.19));}
  if(t.kind==='melody'){
   const spacing=plan.intensity<.4?1:plan.intensity>.75?.25:.5;
   for(let at=0;at<4;at+=spacing){const position=(offset+at)/Math.max(1,s.beats-spacing);add(offset+at,pitch(plan,position,s.start+offset+at,at%1!==0?(random()-.5)*.4:0),spacing*(plan.emotion==='calm'||plan.emotion==='melancholic'?.9:.65)*(t.version%2?1:.8),.34);}
  }
 }
 return notes;
}

export function guidedLyricNotes(l:Lyric,p:SongProject,preset:string,version:number):Note[]{
 const plan=effectivePlan(p),chars=Array.from(l.text).filter(c=>!/[\s，。！？、,.!?]/.test(c));
 const section=p.sections.find(s=>s.id===l.sectionId)!,step=(l.end-l.start)/Math.max(1,chars.length),energy=sectionEnergy(p,l.sectionId);
 return chars.map((c,i)=>{const beat=l.start+i*step;return {id:uid(),beat,duration:step*.82,midi:pitch(plan,(beat-section.start)/Math.max(1,section.beats-step),beat,(version%3-1)*.35)+(preset==='雾歌'?-12:0),velocity:.28*(.6+plan.intensity*.4)*(.6+energy*.4),syllable:c}});
}

// Do not infer a key from arbitrary manual notes or reharmonize locked melodies.
// A protected pitched event freezes its whole pitched section; drums do not.
export function protectedSections(p:SongProject){return new Set([
 ...p.tracks.filter(t=>t.kind!=='drums'&&t.notes.length>0&&(t.locked||t.manuallyEdited)).map(t=>t.sectionId),
 ...p.lyrics.filter(l=>l.locked&&l.notes.length>0).map(l=>l.sectionId),
]);}
