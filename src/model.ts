import {songPlanSchema,planningSchema,type SongPlan,type Planning} from '../shared/song-plan.mjs';
export type TrackKind = 'drums'|'bass'|'guitar'|'keys'|'melody'|'vocal';
export type Style = '海盐汽水'|'深夜漫游'|'橘子摇滚';
export type SubtitleStyle = 'cinema'|'poster'|'minimal';
export interface Note { id:string; beat:number; duration:number; midi:number; velocity:number; sound?:'kick'|'snare'|'hat'; syllable?:string }
export interface Section { id:string; name:string; start:number; beats:number }
export interface Track { id:string; sectionId:string; kind:TrackKind; version:number; locked:boolean; muted:boolean; notes:Note[]; dependencies:string[]; source:'local-composer'|'demo-vowel'; manuallyEdited?:boolean; }
export interface Lyric { id:string; sectionId:string; text:string; start:number; end:number; notes:Note[]; version:number; locked:boolean; source:'manual'|'local-template'|'llm' }
export interface SongProject { schemaVersion:1; id:string; metadata:{title:string; idea:string; createdAt:string; updatedAt:string}; bpm:number; timeSignature:[4,4]; style:Style; mood:string; sections:Section[]; tracks:Track[]; lyrics:Lyric[]; vocalPreset:'澄音'|'星羽'|'雾歌'; visualScenes:{id:string; sectionId:string; theme:number; source:'procedural'}[]; assetReferences:{id:string; type:string; source:string}[]; versions:{at:string; action:string}[]; subtitleStyle:SubtitleStyle; tapTimes:number[] }
export interface SongProject {songPlan?:SongPlan;planning?:Planning;rhythmCompletion?:boolean;}
export const kinds:TrackKind[]=['drums','bass','guitar','keys','melody','vocal'];
export const trackInfo:Record<TrackKind,{name:string;en:string;color:string;symbol:string}>={drums:{name:'鼓点',en:'DRUMS',color:'#f7b493',symbol:'◉'},bass:{name:'贝斯',en:'BASS',color:'#c5b4ed',symbol:'≋'},guitar:{name:'吉他',en:'GUITAR',color:'#c3dcb5',symbol:'♮'},keys:{name:'和弦',en:'KEYS',color:'#f3d880',symbol:'▤'},melody:{name:'主旋律',en:'MELODY',color:'#aacde2',symbol:'♫'},vocal:{name:'演示人声',en:'VOCAL · DEMO',color:'#e7bfd0',symbol:'♬'}};
export const uid=()=>{if(typeof crypto.randomUUID==='function')return crypto.randomUUID();const b=crypto.getRandomValues(new Uint8Array(16));b[6]=(b[6]&15)|64;b[8]=(b[8]&63)|128;const h=Array.from(b,x=>x.toString(16).padStart(2,'0')).join('');return `${h.slice(0,8)}-${h.slice(8,12)}-${h.slice(12,16)}-${h.slice(16,20)}-${h.slice(20)}`;};
export const beatsToSeconds=(p:SongProject,b:number)=>b*60/p.bpm;
export const totalBeats=(p:SongProject)=>p.sections.reduce((s,x)=>s+x.beats,0);
export const duration=(p:SongProject)=>beatsToSeconds(p,totalBeats(p));
export function record(p:SongProject,action:string){p.metadata.updatedAt=new Date().toISOString();p.versions=[...p.versions.slice(-49),{at:p.metadata.updatedAt,action}];return p;}
export function estimateBpm(taps:number[]){if(taps.length<4)throw Error('请先连续敲击至少 4 次');const intervals=taps.slice(1).map((x,i)=>x-taps[i]);if(intervals.some(x=>x<250||x>1500))throw Error('请以稳定节奏敲击，每次间隔 0.25–1.5 秒');const sorted=[...intervals].sort((a,b)=>a-b);return Math.round(60000/sorted[Math.floor(sorted.length/2)]);}
export function quantizeTaps(taps:number[],bpm:number){const first=taps[0]??0;return [...new Set(taps.map(t=>Math.round((t-first)/1000*bpm/60*4)%16))].sort((a,b)=>a-b);}
export function validateProject(data:unknown):SongProject {
 const p=data as SongProject;
 if(!p||p.schemaVersion!==1||typeof p.id!=='string'||!p.metadata||typeof p.metadata.title!=='string'||p.metadata.title.length>200||typeof p.metadata.idea!=='string'||!Number.isFinite(p.bpm)||p.bpm<40||p.bpm>240||!['海盐汽水','深夜漫游','橘子摇滚'].includes(p.style)||!['澄音','星羽','雾歌'].includes(p.vocalPreset)||!['cinema','poster','minimal'].includes(p.subtitleStyle)||!Array.isArray(p.sections)||p.sections.length!==4||!Array.isArray(p.tracks)||p.tracks.length>40||!Array.isArray(p.lyrics)||p.lyrics.length>32||!Array.isArray(p.visualScenes)||p.visualScenes.length!==4||!Array.isArray(p.versions)||!Array.isArray(p.tapTimes)||!Array.isArray(p.assetReferences))throw Error('不是有效的声屿 v1 工程');
 let end=0;const ids=new Set<string>();const checkId=(id:string)=>{if(typeof id!=='string'||ids.has(id))throw Error('工程含重复或无效 ID');ids.add(id)};
 p.sections.forEach(s=>{checkId(s.id);if(s.start!==end||!Number.isInteger(s.beats)||s.beats<4||s.beats>64||typeof s.name!=='string')throw Error('段落时间轴无效');end+=s.beats;});
 if(duration(p)>35||duration(p)<15)throw Error('仅支持 15–35 秒短篇工程');
 if(p.songPlan!==undefined)songPlanSchema.parse(p.songPlan);
 if(p.planning!==undefined)planningSchema.parse(p.planning);
 const validNotes=(notes:Note[],start:number,stop:number)=>{if(!Array.isArray(notes)||notes.length>512)throw Error('音符数量无效');notes.forEach(n=>{checkId(n.id);if(!Number.isFinite(n.beat)||n.beat<start||n.beat>=stop||!Number.isFinite(n.duration)||n.duration<=0||n.beat+n.duration>stop+.001||!Number.isInteger(n.midi)||n.midi<0||n.midi>127||!Number.isFinite(n.velocity)||n.velocity<0||n.velocity>1||n.sound&&!['kick','snare','hat'].includes(n.sound))throw Error('音符数据无效');});};
 p.tracks.forEach(t=>{checkId(t.id);const s=p.sections.find(s=>s.id===t.sectionId);if(!s||!kinds.includes(t.kind)||!Number.isInteger(t.version)||typeof t.locked!=='boolean'||typeof t.muted!=='boolean')throw Error('音轨数据无效');validNotes(t.notes,s.start,s.start+s.beats)});
 p.lyrics.forEach(l=>{checkId(l.id);const s=p.sections.find(s=>s.id===l.sectionId);if(!s||typeof l.text!=='string'||l.text.length>100||!Number.isFinite(l.start)||!Number.isFinite(l.end)||l.start<s.start||l.end>s.start+s.beats||l.start>=l.end)throw Error('歌词时间轴无效');validNotes(l.notes,l.start,l.end)});
 p.visualScenes.forEach(v=>{checkId(v.id);if(!p.sections.some(s=>s.id===v.sectionId)||!Number.isInteger(v.theme)||v.theme<0||v.theme>3)throw Error('画面数据无效')});return p;
}
