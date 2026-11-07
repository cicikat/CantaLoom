import {useState} from 'react';
import {toJSONSchema} from 'zod';
import {performanceSchema,type Performance} from '../../shared/contracts/melody.mjs';
import {performancePresets} from '../../shared/performance.mjs';
import {autoTuneProject,restorePerformance,setPhrasePerformance} from '../melody';
import {lineLocked} from '../features/singing/qixuan';
import {expressionControls,parseControlFields,setNoteExpression,toggleExpressionLock,type ControlFields} from '../hooks/performance-edit';
import type {SongProject,Lyric} from '../model';
import './expression-mix.css';
const controlSchema=toJSONSchema(performanceSchema).properties;

function Fields({fields,onChange,preset,disabled=false}:{fields:ControlFields;onChange:(v:ControlFields)=>void;preset:Performance['preset'];disabled?:boolean}){
 return <div className="expression-fields">{expressionControls.map(({key,label,unit})=>{
  const raw=controlSchema?.[key],schema=typeof raw==='object'?raw:undefined;
  return <label key={key}>{label}{unit&&`（${unit}）`}<input type="number" min={schema?.minimum} max={schema?.maximum} step="any" disabled={disabled} value={fields[key]??''} placeholder={`继承 / ${performancePresets[preset][key]}`} onChange={e=>onChange({...fields,[key]:e.target.value})}/></label>;
 })}</div>;
}
const initialFields=(input:Partial<Record<typeof expressionControls[number]['key'],string|number>>)=>Object.fromEntries(expressionControls.map(({key})=>[key,input[key]===undefined?'':String(input[key])]));

function PhraseForm({line,onApply,disabled}:{line:Lyric;onApply:(input:Performance)=>void;disabled:boolean}){
 const [draft,setDraft]=useState<Performance>(line.performance??{preset:'natural'}),[fields,setFields]=useState<ControlFields>(()=>initialFields(line.performance??{}));
 return <form onSubmit={e=>{e.preventDefault();const {preset:_,...values}=parseControlFields(fields);const next={...draft};for(const {key} of expressionControls)delete next[key];onApply({...next,...values})}}>
  <fieldset disabled={disabled}><div className="expression-options"><label>演唱风格 <select aria-label="演唱风格" value={draft.preset} onChange={e=>{setDraft({...draft,preset:e.target.value as Performance['preset']});setFields({})}}><option value="natural">自然</option><option value="soft">轻柔</option><option value="strong">强烈</option></select></label><label>调教方式 <select aria-label="调教方式" value={draft.mode??'manual'} onChange={e=>setDraft({...draft,mode:e.target.value as Performance['mode']})}><option value="auto">自动</option><option value="manual">手动</option></select></label></div>
  <details className="expression-advanced"><summary>高级调教</summary><Fields fields={fields} onChange={setFields} preset={draft.preset}/><p>留空跟随预设或自动分析；填入数值则优先使用。颤音只在长音出现。</p></details>
  <button type="submit">应用这句调教</button></fieldset>
 </form>;
}
function NoteForm({line,index,onApply,onClear,disabled}:{line:Lyric;index:number;onApply:(fields:ControlFields)=>void;onClear:()=>void;disabled:boolean}){
 const override=line.performance?.overrides?.find(o=>o.index===index),[fields,setFields]=useState<ControlFields>(()=>initialFields(override??{}));
 return <form onSubmit={e=>{e.preventDefault();onApply(fields)}}><fieldset disabled={disabled}><Fields fields={fields} onChange={setFields} preset={line.performance?.preset??'natural'}/><div className="expression-actions"><button type="submit">保存音符表达</button><button type="button" disabled={!override} onClick={onClear}>清除音符覆盖</button></div></fieldset></form>;
}
export function PerformanceControls({project:p,lineId,onChange,busy}:{project:SongProject;lineId:string;onChange:(p:SongProject)=>void;busy:boolean}){
 const line=p.lyrics.find(l=>l.id===lineId)!,[status,setStatus]=useState(''),[noteId,setNoteId]=useState('');
 const index=Math.max(0,line.notes.findIndex(n=>n.id===noteId)),override=line.performance?.overrides?.find(o=>o.index===index);
 const protectedLine=lineLocked(p,lineId),disabled=busy||protectedLine||!!line.performance?.locked||p.vocalMode!=='external',key=JSON.stringify(line.performance);
 function apply(fn:()=>SongProject,message='调教已保存，只需重新演唱这一句。'){try{onChange(fn());setStatus(message)}catch(e){setStatus((e as Error).message)}}
 return <details className="expression-panel"><summary>演唱调教</summary>
  {p.vocalMode!=='external'&&<p>请先生成或导入逐句歌声；元音演示不支持这些演唱参数。</p>}
  <PhraseForm key={key} line={line} disabled={disabled} onApply={input=>apply(()=>setPhrasePerformance(p,lineId,input))}/>
  <div className="expression-actions"><button type="button" disabled={disabled} onClick={()=>apply(()=>autoTuneProject(p,lineId))}>自动调教这一句</button><button type="button" disabled={disabled||!p.performanceHistory?.[lineId]?.length} onClick={()=>apply(()=>restorePerformance(p,lineId),'已恢复上一版调教，请确认演唱是否需要更新。')}>恢复上一版调教（{p.performanceHistory?.[lineId]?.length??0}/3）</button><button type="button" aria-pressed={!!line.performance?.locked} disabled={busy||protectedLine||p.vocalMode!=='external'} onClick={()=>apply(()=>toggleExpressionLock(p,lineId),line.performance?.locked?'已解锁这句表达。':'已锁定这句表达，自动调教会跳过它。')}>{line.performance?.locked?'解锁表达':'锁定表达'}</button></div>
  <details className="expression-advanced"><summary>逐音符人工覆盖</summary><label>调教音符 <select aria-label="调教音符" value={line.notes[index]?.id??''} disabled={!line.notes.length} onChange={e=>setNoteId(e.target.value)}>{line.notes.map((n,i)=><option key={n.id} value={n.id}>{i+1} · {n.syllable==='+'?'延音':n.syllable}</option>)}</select></label><NoteForm key={key+line.notes[index]?.id} line={line} index={index} disabled={disabled||!!override?.locked||!line.notes.length} onApply={fields=>apply(()=>setNoteExpression(p,lineId,index,fields))} onClear={()=>apply(()=>setPhrasePerformance(p,lineId,{...line.performance!,overrides:line.performance!.overrides!.filter(o=>o.index!==index)}))}/><button type="button" disabled={disabled||!override} aria-pressed={!!override?.locked} onClick={()=>apply(()=>toggleExpressionLock(p,lineId,index),override?.locked?'已解锁音符表达。':'已锁定音符表达，自动调教会保留它。')}>{override?.locked?'解锁音符表达':'锁定音符表达'}</button><p>只改选中音符。留空跟随整句设置；已保存的 Pitch 曲线会保留。</p></details>
  <p role="status">{status}</p>
 </details>;
}
