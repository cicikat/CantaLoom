import {performanceSchema,type Performance} from '../../shared/contracts/melody.mjs';
import {setPhrasePerformance} from '../melody';
import {lineLocked} from '../features/singing/qixuan';
import {record,validateProject,type SongProject} from '../model';

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
