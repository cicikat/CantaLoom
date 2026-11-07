import {automaticPhrase} from './performance.mjs';
const tonicOffset={C:0,D:2,E:4,F:5,G:7,A:9,B:11};
export function scaleMidi(plan,index){
 const degrees=plan.key.mode==='minor'?[0,2,3,5,7,8,10]:[0,2,4,5,7,9,11];
 return 48+tonicOffset[plan.key.tonic]+12*Math.floor(index/7)+degrees[((index%7)+7)%7];
}
export function chordAt(plan,beat){const degree=plan.chordProgression[Math.floor(beat/4)%4]-1;return [0,2,4].map(n=>scaleMidi(plan,degree+n));}

export function freeArrangement(p,t,id){
 const s=p.sections.find(s=>s.id===t.sectionId),plan=p.songPlan,energy=plan.sectionEnergy[['intro','verse','chorus','outro'][p.sections.indexOf(s)]],notes=[];
 const add=(beat,midi,length,velocity,sound)=>{if(beat<s.start+s.beats)notes.push({id:id(),beat,midi,duration:Math.min(length,s.start+s.beats-beat),velocity:Math.min(1,velocity*(.5+energy*.5)),...(sound?{sound}:{})})};
 for(let beat=s.start;beat<s.start+s.beats;beat+=4){const chord=chordAt(plan,beat),singing=p.lyrics.some(l=>l.start<beat+4&&l.end>beat),gap=!p.lyrics.some(l=>l.notes.some(n=>n.beat<beat+2&&n.beat+n.duration>beat));
  if(t.kind==='bass'){add(beat,chord[0]-12,1.6,.45);if(energy>.5)add(beat+2,chord[0]-12,1,.38)}
  if(t.kind==='keys'&&(gap||energy>.35))chord.forEach(n=>add(beat,n,3.4,singing?.12:.23));
  if(t.kind==='guitar'&&energy>.5)for(const offset of [1.5,3])chord.forEach((n,i)=>add(beat+offset+i*.015,n+12,.3,singing?.08:.15));
  // Do not double the singer with an unrelated continuous scale exercise.
  if(t.kind==='melody'&&!singing){const motif=[chord[2]+12,chord[2]+12,chord[1]+12];[0,1,2.5].forEach((offset,i)=>add(beat+offset,motif[i],[.5,1,.75][i],.18))}
  if(t.kind==='drums'){add(beat,36,.2,.6,'kick');if(energy>.4)add(beat+2,36,.2,.48,'kick');add(beat+3,38,.15,.32,'snare');const step=plan.drumDensity==='sparse'?2:plan.drumDensity==='busy'&&energy>.65?.5:1;for(let at=0;at<4;at+=step)add(beat+at,42,.06,.13,'hat')}
 }return notes;
}

export function buildFreeScore(result,id){
 const now=new Date().toISOString(),p={schemaVersion:1,mode:'free',id:id(),creationRequestId:result.requestId,metadata:{title:result.plan.title,idea:result.input.intent,createdAt:now,updatedAt:now},bpm:result.plan.bpm,timeSignature:[4,4],style:'自由创作',mood:result.plan.mood,sections:result.sections,songPlan:result.plan.songPlan,planning:{source:result.mock?'local-rules':'llm',...(result.mock?{mock:true}:{}),model:result.model,appliedAt:now,compatibility:[]},lyrics:[],tracks:[],vocalPreset:'澄音',visualScenes:result.sections.map(s=>({id:id(),sectionId:s.id,theme:0,source:'procedural'})),assetReferences:[],versions:[],subtitleStyle:'cinema',tapTimes:[],melodyDraft:result.draft,mixSettings:{enabled:true,reverb:.08}};
 p.lyrics=result.draft.phrases.map(l=>{const section=p.sections.find(s=>l.start>=s.start&&l.end<=s.start+s.beats);if(!section)throw Error('乐句跨段');return {...l,sectionId:section.id,version:1,locked:!!l.locked,source:result.input.lyrics?'manual':result.mock?'local-template':'llm',performance:l.performance||{preset:'natural',mode:'auto',energy:p.songPlan.sectionEnergy[['intro','verse','chorus','outro'][p.sections.indexOf(section)]]}}});
 for(const l of p.lyrics)l.performance=automaticPhrase(l.text,l.notes,l.performance.energy,l.performance);
 p.tracks=p.sections.flatMap(s=>['drums','bass','guitar','keys','melody','vocal'].map(kind=>{const t={id:id(),sectionId:s.id,kind,version:1,locked:false,muted:false,dependencies:['songPlan',s.id],source:kind==='vocal'?'demo-vowel':'local-composer',notes:[]};t.notes=kind==='vocal'?p.lyrics.filter(l=>l.sectionId===s.id).flatMap(l=>l.notes.map(n=>({...n,id:id()}))):freeArrangement(p,t,id);return t}));return p;
}
