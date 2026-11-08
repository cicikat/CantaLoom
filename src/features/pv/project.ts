import {z} from 'zod';
import {pvProjectSchema,pvResultSchema,pvFingerprint,validatePvBinding,type PvProject,type PvResult} from '../../../shared/contracts/pv.mjs';
import type {SongProject} from '../../model';

export interface StoredPv {project:PvProject;result:PvResult}
const storedSchema=z.object({project:pvProjectSchema,result:pvResultSchema}).strict();
export function validateStoredPv(value:unknown):StoredPv {
 const stored=storedSchema.parse(value);validatePvBinding(stored.project,stored.result.pvDesign);return stored;
}
// Only public creative data, never audio/cache/config or the complete SongProject.
export function pvSnapshot(p:SongProject):PvProject {
 const pulses=new Map<number,number>();
 for(const track of p.tracks)if(track.kind==='drums'&&!track.muted)for(const n of track.notes)pulses.set(n.beat,Math.max(pulses.get(n.beat)??0,n.velocity));
 return pvProjectSchema.parse({id:p.id,title:p.metadata.title,idea:p.metadata.idea,mood:p.mood,bpm:p.bpm,
  sections:p.sections.map((s,i)=>({id:s.id,start:s.start,beats:s.beats,energy:p.songPlan?.sectionEnergy[(['intro','verse','chorus','outro'] as const)[i]]??.6})),
  lyrics:p.lyrics.filter(l=>l.text.length>0).map(l=>({id:l.id,text:l.text,start:l.start,end:l.end})),
  pulses:[...pulses].sort((a,b)=>a[0]-b[0]).slice(0,96).map(([beat,strength])=>({beat,strength}))});
}
export function singingCredit(p:SongProject):'demo'|'qixuan'|'external' {return p.vocalMode==='external'?(p.lyrics.every(l=>p.vocalAssets?.[l.id]?.voiceId==='qixuan')?'qixuan':'external'):'demo'}
export async function currentPv(p:SongProject,mock:boolean){
 if(!p.pvVisual)throw Error('请先生成 AI 视觉设计，或选择 Canvas 画面。');
 const stored=validateStoredPv(p.pvVisual);
 if(mock!==(stored.result.mock===true))throw Error('视觉设计来源与当前模式不符，请重新生成或选择 Canvas。');
 const project=pvSnapshot(p),fingerprint=await pvFingerprint(project);
 if(fingerprint!==stored.result.inputFingerprint||await pvFingerprint(stored.project)!==fingerprint)throw Error('视觉设计已失效，请重新生成或选择 Canvas。');
 validatePvBinding(project,stored.result.pvDesign);return {project,result:stored.result};
}
