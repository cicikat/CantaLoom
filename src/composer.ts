import {type SongProject,type Track,type TrackKind,type Note,type Lyric,type Style,uid,kinds,record} from './model';
import {generateGuided,guidedLyricNotes} from './guided-composer';
import {localSongPlan} from './song-plan';
function rng(seed:number){return ()=>{seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return ((t^t>>>14)>>>0)/4294967296}}
const scale=[60,62,64,67,69,72,74,76];
export interface Composer {generate(p:SongProject,t:Track):Note[]}
export const localComposer:Composer={generate(p,t){
 const s=p.sections.find(x=>x.id===t.sectionId)!;let hash=0;for(const c of t.id)hash=(hash*31+c.charCodeAt(0))|0;const random=rng(hash+t.version*701);const notes:Note[]=[];
 const add=(beat:number,midi:number,duration:number,velocity=.65,sound?:Note['sound'])=>notes.push({id:uid(),beat:s.start+beat,midi,duration:Math.min(duration,s.beats-beat),velocity,...(sound?{sound}:{})});
 if(p.songPlan)return generateGuided(p,t,random);
 const minor=p.style==='深夜漫游';const rock=p.style==='橘子摇滚';
 for(let b=0;b<s.beats/4;b++){
  const offset=b*4;const chordIndex=(b+p.sections.indexOf(s))%4;const root=(minor?[45,53,48,55]:[48,45,53,55])[chordIndex];const third=(minor?[3,4,4,4]:[4,3,4,4])[chordIndex];
  if(t.kind==='drums') {for(let step=0;step<16;step++){const at=offset+step/4;if(step===0||step===8||step===(t.version%2?11:10)&&random()>.35)add(at,36,.22,.82,'kick');if(step===4||step===12)add(at,38,.16,.58,'snare');if(step%(rock?1:2)===0||random()>.91)add(at,42,.07,step%4===0?.24:.17,'hat');}}
  if(t.kind==='bass'){for(const step of [0,1.5,2,3.5])add(offset+step,root-12+(random()>.72?7:0),.4,.55);}
  if(t.kind==='guitar'){for(let step=0;step<8;step++)if(random()>.23){const at=offset+step*.5;[0,third,7].forEach((x,i)=>add(at+i*.015,root+12+x,.35+random()*.18,.15));}}
  if(t.kind==='keys'){[0,third,7].forEach(x=>add(offset,root+x,3.7,.2));}
  if(t.kind==='melody'){for(let step=0;step<8;step++)if(random()>.36){const chordTones=[root+12,root+12+third,root+19,root+24];add(offset+step*.5,step%4===0?chordTones[Math.floor(random()*chordTones.length)]:scale[Math.floor(random()*scale.length)],.3+random()*.16,.3);}}
 }
 return notes;
}};
export interface LyricsWriter {write(idea:string,style:Style):string[]}
export const localLyrics:LyricsWriter={write(idea,style){const key=idea.replace(/[，。！？、\s]/g,'').slice(0,9);return style==='深夜漫游'?[`${key||'夜色'}落在窗边`,'月亮把心事轻轻翻页','沿着星光走得慢一点','等一个温柔的明天']:style==='橘子摇滚'?[`${key||'夏天'}撞进耳边`,'把胆怯留给昨天','跟着心跳再向前','我们就是耀眼的光线']:[`${key||'海风'}写进信笺`,'汽水的气泡飞过指尖','把这片蔚蓝唱给你听','让小小心愿靠近海面'];}};
export function lyricNotes(l:Lyric,preset:string,version=l.version,project?:SongProject):Note[]{if(project?.songPlan)return guidedLyricNotes(l,project,preset,version);const chars=Array.from(l.text).filter(c=>!/[\s，。！？、,.!?]/.test(c));const count=Math.max(1,chars.length),step=(l.end-l.start)/count;return chars.map((c,i)=>({id:uid(),beat:l.start+i*step,duration:step*.82,midi:[64,67,69,72,69,67,64,62][(i+version)%8]+(preset==='雾歌'?-12:preset==='星羽'?2:0),velocity:.28,syllable:c}));}
export function syncVocal(p:SongProject,sectionId:string){const t=p.tracks.find(t=>t.sectionId===sectionId&&t.kind==='vocal');if(t&&!t.locked){t.notes=p.lyrics.filter(l=>l.sectionId===sectionId).flatMap(l=>l.notes.map(n=>({...n,id:uid()})));t.version++;}}
export function regenerate(p:SongProject,id:string){const next=structuredClone(p);const t=next.tracks.find(t=>t.id===id);if(!t||t.locked)return p;t.version++;t.manuallyEdited=false;t.notes=t.kind==='vocal'?next.lyrics.filter(l=>l.sectionId===t.sectionId).flatMap(l=>{if(!l.locked){l.version++;l.notes=lyricNotes(l,next.vocalPreset,l.version,next)}return l.notes.map(n=>({...n,id:uid()}))}):localComposer.generate(next,t);return record(next,`重新生成 ${t.kind} v${t.version}`);}
export function createProject(bpm=96,style:Style='海盐汽水',idea='海风吹过夏天的轻快歌'):SongProject{
 const bars=Math.max(4,Math.round(bpm/10));const sizes=[1,Math.floor((bars-2)/2),Math.ceil((bars-2)/2),1];let start=0;
 const sections=sizes.map((bars,i)=>{const s={id:uid(),name:['Intro','Verse','Chorus','Outro'][i],start,beats:bars*4};start+=s.beats;return s});
 const p:SongProject={schemaVersion:1,id:uid(),metadata:{title:'把夏天唱成一座岛',idea,createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()},bpm,timeSignature:[4,4],style,mood:'轻盈 · 明亮 · 有一点浪漫',sections,tracks:[],lyrics:[],vocalPreset:'澄音',visualScenes:sections.map((s,i)=>({id:uid(),sectionId:s.id,theme:i,source:'procedural'})),assetReferences:[{id:uid(),type:'visual',source:'original procedural canvas'},{id:uid(),type:'audio',source:'Web Audio synthesis; no samples'}],versions:[],subtitleStyle:'cinema',tapTimes:[]};
 p.songPlan=localSongPlan(idea,style);p.planning={source:'local-rules',appliedAt:new Date().toISOString(),compatibility:[]};
 p.tracks=sections.flatMap(s=>kinds.map((kind:TrackKind)=>{const t:Track={id:uid(),sectionId:s.id,kind,version:1,locked:false,muted:false,notes:[],dependencies:kind==='vocal'?['lyrics','vocalPreset']:['bpm',s.id],source:kind==='vocal'?'demo-vowel':'local-composer'};t.notes=localComposer.generate(p,t);return t}));
 const texts=localLyrics.write('把夏天折进一封信里',style);texts[0]='把夏天折进一封信里';
 [sections[1],sections[2]].forEach((s,i)=>{for(let j=0;j<2;j++){const l:Lyric={id:uid(),sectionId:s.id,text:texts[i*2+j],start:s.start+j*s.beats/2,end:s.start+(j+1)*s.beats/2,notes:[],version:1,locked:false,source:'local-template'};l.notes=lyricNotes(l,p.vocalPreset,l.version,p);p.lyrics.push(l)}syncVocal(p,s.id)});return p;
}
export function applyRhythm(p:SongProject,taps:number[],bpm:number,complete=true){const next=structuredClone(p);const locked=next.tracks.some(t=>t.locked);if(bpm!==p.bpm&&locked)throw Error('工程有锁定音轨，请先解锁再改变全曲速度');if(bpm!==p.bpm){
 // Stretch existing sections to a ~24-second arrangement. Preserve IDs, pitches,
 // manual words and versions; only timing changes with the new global tempo.
 const bars=Math.max(4,Math.round(bpm/10)),sizes=[1,Math.floor((bars-2)/2),Math.ceil((bars-2)/2),1];let start=0;
 next.sections.forEach((s,i)=>{const oldStart=s.start,oldBeats=s.beats,newBeats=sizes[i]*4,ratio=newBeats/oldBeats;
  next.tracks.filter(t=>t.sectionId===s.id).forEach(t=>{t.notes.forEach(n=>{n.beat=start+(n.beat-oldStart)*ratio;n.duration*=ratio});t.version++});
  next.lyrics.filter(l=>l.sectionId===s.id).forEach(l=>{l.start=start+(l.start-oldStart)*ratio;l.end=start+(l.end-oldStart)*ratio;l.notes.forEach(n=>{n.beat=start+(n.beat-oldStart)*ratio;n.duration*=ratio});l.version++});s.start=start;s.beats=newBeats;start+=newBeats;
 });next.bpm=bpm;}
 next.rhythmCompletion=complete;next.tapTimes=[...taps];const slots=[...new Set(taps.map(x=>Math.round((x-taps[0])/1000*bpm/60*4)%16))];next.tracks.filter(t=>t.kind==='drums'&&!t.locked).forEach(t=>{const s=next.sections.find(s=>s.id===t.sectionId)!;t.version++;const generated=localComposer.generate(next,t);t.notes=complete?generated.filter(n=>n.sound!=='kick'):[];for(let bar=0;bar<s.beats/4;bar++)for(const slot of slots)t.notes.push({id:uid(),beat:s.start+bar*4+slot/4,duration:.2,midi:36,velocity:.8,sound:'kick'});});return record(next,'量化真实敲击并生成鼓点');}
