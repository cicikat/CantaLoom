import {productionJobSchema,productionInputSchema,type ProductionJob,type ProductionInput} from '../../shared/contracts/production.mjs';
import type {GrooveSettings} from '../../shared/contracts/groove.mjs';
import {grooveSettingsSchema} from '../../shared/contracts/groove.mjs';
import {validateMelody} from '../../shared/melody.mjs';
import {validateProject} from '../model';
import {currentVocalAsset} from '../external-audio';
import {hasMockData} from '../api/provenance';

export function productionInput(intent:string,lyrics:string,bpm:string,targetSeconds:number,grooveSettings?:GrooveSettings):ProductionInput {
 const lines=lyrics.split(/\r?\n/).filter(line=>line.trim());
 const result=productionInputSchema.safeParse({intent,...(lines.length?{lyrics:lines}:{}),...(bpm!==''?{bpm:Number(bpm)}:{}),targetSeconds,...(grooveSettings&&Object.values(grooveSettings).some(v=>v!==0)?{grooveSettings}:{})});
 if(!result.success)throw Error('请填写 1–500 字主题；歌词支持 1–8 行、每行最多 100 字，速度为 60–160 BPM。');
 return result.data;
}

// Check the completed result without rebuilding its score or replacing its audio assets.
export function productionProject(raw:ProductionJob,input:ProductionInput,mock:boolean){
 const job=productionJobSchema.parse(raw);
 if(job.state!=='succeeded'||job.stage!=='ready-for-mix')throw Error('制作尚未完成，当前工程已保留。');
 const p=validateProject(job.project);
 if(JSON.stringify(p.grooveSettings===undefined?null:grooveSettingsSchema.parse(p.grooveSettings))!==JSON.stringify(input.grooveSettings===undefined?null:grooveSettingsSchema.parse(input.grooveSettings)))throw Error('制作律动设置与本次输入不符，当前工程已保留。');
 if(p.mode!=='free'||p.style!=='自由创作'||!p.songPlan||!p.melodyDraft||!p.planning||p.lyrics.length<1||p.lyrics.length>8||p.vocalMode!=='external')throw Error('制作结果不完整，当前工程已保留。');
 if(mock!==hasMockData(p)||mock!==!!job.mock)throw Error('制作结果来源不符，当前工程已保留。');
 if(p.metadata.idea!==input.intent||input.bpm!==undefined&&p.bpm!==input.bpm||input.lyrics&&(JSON.stringify(p.lyrics.map(l=>l.text))!==JSON.stringify(input.lyrics)||p.lyrics.some(l=>l.source!=='manual')))throw Error('制作结果与本次输入不符，当前工程已保留。');
 const seconds=p.sections.reduce((n,s)=>n+s.beats,0)*60/p.bpm;
 if(seconds<20||seconds>30||p.lyrics.some(l=>!l.notes.length))throw Error('制作时间轴或旋律不完整，当前工程已保留。');
 validateMelody({intent:input.intent,bpm:p.bpm,songPlan:p.songPlan,phrases:p.lyrics.map(l=>({id:l.id,text:l.text,start:l.start,end:l.end,notes:[]}))},p.melodyDraft);
 for(const [i,line] of p.lyrics.entries()){
  if(JSON.stringify(line.notes)!==JSON.stringify(p.melodyDraft.phrases[i].notes)||!p.tracks.some(t=>t.kind==='vocal'&&t.sectionId===line.sectionId&&t.notes.length))throw Error('制作谱面不一致，当前工程已保留。');
  currentVocalAsset(p,line);
 }
 return p;
}
