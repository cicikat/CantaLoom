import {useState} from 'react';
import {grooveSettingsSchema,type GrooveSettings} from '../../shared/contracts/groove.mjs';
import {record,validateProject,type SongProject} from '../model';

export function GrooveControls({project,onChange,disabled}:{project:SongProject;onChange:(p:SongProject)=>void;disabled:boolean}){
 const [error,setError]=useState('');
 const settings=project.grooveSettings,enabled=!!settings&&Object.values(settings).some(v=>v!==0);
 function update(value?:GrooveSettings){try{const next=structuredClone(project);if(value)next.grooveSettings=grooveSettingsSchema.parse(value);else delete next.grooveSettings;onChange(validateProject(record(next,'调整器乐律动')));setError('')}catch{setError('律动参数无效，当前工程已保留。')}}
 return <details><summary>器乐律动</summary><label><input aria-label="启用器乐律动" type="checkbox" checked={enabled} disabled={disabled} onChange={e=>update(e.target.checked?{swingTicks:60,timingTicks:10,velocityAmount:.05}:undefined)}/>启用器乐律动</label>
 {enabled&&<div className="creation-fields">{([{key:'swingTicks',label:'摇摆',max:120,step:1},{key:'timingTicks',label:'起音变化',max:20,step:1},{key:'velocityAmount',label:'力度变化',max:.2,step:.01}] as const).map(({key,label,max,step})=><label key={key}>{label}<input aria-label={label} type="number" min={0} max={max} step={step} value={settings?.[key]??0} disabled={disabled} onChange={e=>update({...settings!,[key]:e.target.value===''?NaN:Number(e.target.value)})}/></label>)}</div>}
 <p>用于当前作品与下次制作，试听、WAV 和 PV 共用。锁定或手工编辑的轨道保留原演奏，人声不参与。</p>{error&&<p role="alert">{error}</p>}</details>;
}
