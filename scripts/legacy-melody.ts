// Frozen v0.2.1 baseline for audio comparison only; never used by the app.
import {type SongProject,type Lyric,uid} from '../src/model';
import {effectivePlan} from '../src/song-plan';
import {scaleMidi,chordAt} from '../src/guided-composer';
export function legacyMechanicalNotes(l:Lyric,p:SongProject){
 const plan=effectivePlan(p),section=p.sections.find(s=>s.id===l.sectionId)!,chars=Array.from(l.text).filter(c=>!/[\s，。！？、,.!?]/.test(c)),step=(l.end-l.start)/Math.max(1,chars.length),i=p.sections.indexOf(section),energy=plan.sectionEnergy[(['intro','verse','chorus','outro'] as const)[i]];
 return chars.map((c,i)=>{const beat=l.start+i*step,position=(beat-section.start)/Math.max(1,section.beats-step),contour=plan.melodyContour==='rising'?position:plan.melodyContour==='falling'?1-position:plan.melodyContour==='arch'?1-Math.abs(position*2-1):.5,span={narrow:3,medium:6,wide:10}[plan.melodyRange],desired=scaleMidi(plan,7+Math.round(3+(contour-.5)*span+(l.version%3-1)*.35));let midi=desired;
  if(Math.abs(beat-Math.round(beat/2)*2)<.001)midi=chordAt(plan,beat).flatMap(n=>[n,n+12,n+24]).reduce((a,b)=>Math.abs(a-desired)<=Math.abs(b-desired)?a:b);
  return {id:uid(),beat,duration:step*.82,midi:midi+(p.vocalPreset==='雾歌'?-12:0),velocity:.28*(.6+plan.intensity*.4)*(.6+energy*.4),syllable:c};
 });
}
