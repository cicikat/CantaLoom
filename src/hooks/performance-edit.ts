import {performanceSchema,type Performance,type ExpressionAbbr,type CurvePoint} from '../../shared/contracts/melody.mjs';
import {setPhrasePerformance} from '../melody';
import {lineLocked} from '../features/singing/qixuan';
import {record,validateProject,type SongProject} from '../model';
import {ZodError} from 'zod';

export function tuningError(error:unknown){
 if(error instanceof ZodError)return error.issues.map(i=>i.code==='custom'?i.message:'参数不在允许范围内，请检查数值、曲线点顺序和音素位置。').filter((v,i,a)=>a.indexOf(v)===i).join(' ');
 return error instanceof Error?error.message:'无法应用调教，请检查输入。';
}

export const expressionControls=[
 {key:'transitionMs',label:'音高过渡',unit:'毫秒'},
 {key:'vibratoDepth',label:'颤音深度',unit:''},
 {key:'dynamics',label:'演唱力度',unit:''},
 {key:'consonantMs',label:'辅音时机',unit:'毫秒'},
] as const;
export type ExpressionControl=typeof expressionControls[number]['key'];
export type ControlFields=Partial<Record<ExpressionControl,string>>;
export function parseControlFields(fields:ControlFields){
 const values:Partial<Record<ExpressionControl,number>>={};
 for(const {key} of expressionControls)if(fields[key]?.trim())values[key]=Number(fields[key]);
 // The shared contract owns numeric limits, including non-finite input rejection.
 return performanceSchema.parse({preset:'natural',...values});
}
export function setNoteExpression(p:SongProject,id:string,index:number,fields:ControlFields,locked=false){
 const line=p.lyrics.find(l=>l.id===id);
 if(!line?.notes[index])throw Error('请先选择这句中的音符');
 const current=line.performance??{preset:'natural'},old=current.overrides?.find(o=>o.index===index);
 if(old?.locked)throw Error('请先解锁这个音符的表达');
 const {preset:_,...controls}=parseControlFields(fields);
 const overrides=(current.overrides??[]).filter(o=>o.index!==index);
 overrides.push({...old,index,origin:'manual',...controls,locked});
 // Blank values restore this note's inheritance, while preserving any saved pitch curve.
 for(const {key} of expressionControls)if(controls[key]===undefined)delete overrides.at(-1)![key];
 return setPhrasePerformance(p,id,{...current,overrides:overrides.sort((a,b)=>a.index-b.index)});
}
export type NoteExpression=NonNullable<Performance['overrides']>[number];
export const vibratoControls=[
 {key:'vibratoLength',label:'颤音长度',unit:'%'},
 {key:'vibratoPeriod',label:'颤音周期',unit:'毫秒'},
 {key:'vibratoIn',label:'颤音淡入',unit:'%'},
 {key:'vibratoOut',label:'颤音淡出',unit:'%'},
 {key:'vibratoDrift',label:'颤音漂移',unit:''},
 {key:'vibratoVolLink',label:'颤音音量联动',unit:''},
] as const;
export const expressionCurves:Record<ExpressionAbbr,string>={brec:'气声',voic:'发声',genc:'声线位移',velc:'发音速度',pexp:'音高表现力',shfc:'音高偏移'};
// Patch only the selected controls. Other advanced fields and sibling overrides survive.
export function setAdvancedNoteExpression(p:SongProject,id:string,index:number,patch:Partial<Omit<NoteExpression,'index'|'origin'|'locked'>>){
 const line=p.lyrics.find(l=>l.id===id);
 if(!line?.notes[index])throw Error('请先选择这句中的音符');
 const current=line.performance??{preset:'natural'},old=current.overrides?.find(o=>o.index===index);
 if(old?.locked)throw Error('请先解锁这个音符的表达');
 const next={...old,...patch,index,origin:'manual' as const};
 for(const key of Object.keys(patch) as (keyof typeof patch)[])if(patch[key]===undefined)delete next[key];
 return setPhrasePerformance(p,id,{...current,overrides:[...(current.overrides??[]).filter(o=>o.index!==index),next].sort((a,b)=>a.index-b.index)});
}
export function setExpressionCurve(p:SongProject,id:string,abbr:ExpressionAbbr|'dyn',points:CurvePoint[]|undefined){
 const current=p.lyrics.find(l=>l.id===id)?.performance??{preset:'natural'};
 if(abbr==='dyn')return setPhrasePerformance(p,id,{...current,dynCurve:points});
 const curves=(current.curves??[]).filter(c=>c.abbr!==abbr);
 if(points)curves.push({abbr,points});
 return setPhrasePerformance(p,id,{...current,curves});
}
export function toggleExpressionLock(p:SongProject,id:string,index?:number){
 const line=p.lyrics.find(l=>l.id===id);
 if(!line||lineLocked(p,id))throw Error('请先解锁这句或人声音轨');
 if(index!==undefined&&line.performance?.locked)throw Error('请先解锁这句的表达');
 const next=structuredClone(p),target=next.lyrics.find(l=>l.id===id)!;
 target.performance??={preset:'natural'};
 if(index===undefined)target.performance.locked=!target.performance.locked;
 else{
  const override=target.performance.overrides?.find(o=>o.index===index);
  if(!override)throw Error('请先保存这个音符的人工覆盖');
  override.locked=!override.locked;
 }
 return validateProject(record(next,'切换演唱表达锁定'));
}
