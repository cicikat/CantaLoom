import {useState} from 'react';
import {toJSONSchema} from 'zod';
import {performanceSchema,curveRanges,type ExpressionAbbr,type PhonemeEdit} from '../../shared/contracts/melody.mjs';
import {qixuanResultSchema,type QixuanStatus} from '../../shared/contracts/index.mjs';
import {setAdvancedNoteExpression,setExpressionCurve,vibratoControls,expressionCurves,tuningError,type NoteExpression} from '../hooks/performance-edit';
import {PerformanceCurveEditor} from './PerformanceCurveEditor';
import type {SongProject} from '../model';

const schema=toJSONSchema(performanceSchema).properties?.overrides;
const item=typeof schema==='object'&&'items' in schema?schema.items:undefined;
const bounds=item&&typeof item==='object'&&'properties' in item?item.properties:undefined;
function VibratoForm({value,disabled,onSave}:{value?:NoteExpression;disabled:boolean;onSave:(p:Partial<NoteExpression>)=>void}){
 const [draft,setDraft]=useState<Record<string,string>>(()=>Object.fromEntries(vibratoControls.map(({key})=>[key,value?.[key]===undefined?'':String(value[key])])));
 return <form onSubmit={e=>{e.preventDefault();onSave(Object.fromEntries(vibratoControls.map(({key})=>[key,draft[key].trim()?Number(draft[key]):undefined])))}}><fieldset disabled={disabled}><div className="expression-fields">{vibratoControls.map(({key,label,unit})=>{const raw=bounds?.[key],s=typeof raw==='object'?raw:undefined;return <label key={key}>{label}{unit&&`（${unit}）`}<input aria-label={label} type="number" step="any" min={s?.minimum} max={s?.maximum} value={draft[key]} placeholder="跟随自动形态" onChange={e=>setDraft({...draft,[key]:e.target.value})}/></label>})}</div><p>留空恢复自动形态；淡入与淡出（默认 25% / 35%）合计不得超过 100%。</p><button type="submit">保存颤音形态</button></fieldset></form>;
}
function PhonemeForm({value,disabled,offset,replace,onSave}:{value?:PhonemeEdit[];disabled:boolean;offset:boolean;replace:boolean;onSave:(p:PhonemeEdit[]|undefined)=>void}){
 const [rows,setRows]=useState(()=>value?.map(p=>({index:String(p.index),offset:p.offsetMs===undefined?'':String(p.offsetMs),phoneme:p.phoneme??''}))??[]),[error,setError]=useState('');
 function patch(i:number,p:Partial<typeof rows[number]>){setRows(rows.map((r,j)=>j===i?{...r,...p}:r))}
 function save(){if(rows.some(r=>!r.index.trim()||!r.offset.trim()&&!r.phoneme.trim())){setError('每条覆盖需要位置，以及时序或发音。');return}onSave(rows.length?rows.map(r=>({index:Number(r.index),...(r.offset.trim()?{offsetMs:Number(r.offset)}:{}),...(r.phoneme.trim()?{phoneme:r.phoneme.trim()}:{})})):undefined);setError('')}
 return <section aria-label="逐音素覆盖"><p>位置是选中音符内的音素序号（从 0 起），每音符最多 8 条。下方整句音素表没有音符对应信息，请核对发音后填写；替换发音须含声库语言前缀，例如 zh/ang，服务端会校验词表。</p><fieldset disabled={disabled||!offset&&!replace}>{rows.map((r,i)=><div className="phoneme-row" key={i}><label>音素位置<input aria-label={`音素${i+1}位置`} type="number" min="0" max="15" step="1" value={r.index} onChange={e=>patch(i,{index:e.target.value})}/></label><label>时序（毫秒）<input aria-label={`音素${i+1}时序`} type="number" min="-300" max="300" step="any" disabled={!offset} value={r.offset} onChange={e=>patch(i,{offset:e.target.value})}/></label><label>替换发音<input aria-label={`音素${i+1}发音`} maxLength={20} disabled={!replace} value={r.phoneme} onChange={e=>patch(i,{phoneme:e.target.value})}/></label><button type="button" aria-label={`删除音素${i+1}覆盖`} onClick={()=>setRows(rows.filter((_,j)=>j!==i))}>删除</button></div>)}<div className="expression-actions"><button type="button" disabled={rows.length>=8} onClick={()=>setRows([...rows,{index:'',offset:'',phoneme:''}])}>添加音素覆盖</button><button type="button" onClick={save}>保存音素覆盖</button></div></fieldset>{error&&<p role="alert">{error}</p>}</section>;
}
export function AdvancedPerformanceControls({project:p,lineId,index,voice,disabled,onChange}:{project:SongProject;lineId:string;index:number;voice?:QixuanStatus;disabled:boolean;onChange:(p:SongProject)=>void}){
 const line=p.lyrics.find(l=>l.id===lineId)!,performance=line.performance??{preset:'natural' as const},override=performance.overrides?.find(o=>o.index===index),[status,setStatus]=useState('');
 const [abbr,setAbbr]=useState<ExpressionAbbr|'dyn'>('dyn'),caps=voice?.available?voice.capabilities:undefined;
 const available=!!voice?.available&&p.vocalMode==='external',noteDisabled=disabled||!available||!!override?.locked||!line.notes[index];
 const report=qixuanResultSchema.safeParse(p.vocalAssets?.[lineId]),phonemes=report.success?report.data.phonemes:undefined;
 const currentCurve=abbr==='dyn'?performance.dynCurve:performance.curves?.find(c=>c.abbr===abbr)?.points;
 function apply(fn:()=>SongProject){try{onChange(fn());setStatus('高级调教已保存，只需重新演唱这一句。')}catch(e){setStatus(tuningError(e))}}
 return <details className="expression-advanced advanced-performance"><summary>音高曲线、颤音与音素</summary>
  {!available&&<p>请连接绮萱服务并使用逐句歌声；高级调教沿用绮萱单句重唱。</p>}
  <details><summary>音符音高曲线</summary><PerformanceCurveEditor key={`pitch-${line.notes[index]?.id}-${JSON.stringify(override?.pitch)}`} label="音高曲线" points={override?.pitch} pitch disabled={noteDisabled} onSave={pitch=>apply(()=>setAdvancedNoteExpression(p,lineId,index,{pitch}))}/></details>
  <details><summary>逐音符颤音形态</summary><VibratoForm key={JSON.stringify(override)} value={override} disabled={noteDisabled} onSave={patch=>apply(()=>setAdvancedNoteExpression(p,lineId,index,patch))}/></details>
  <details><summary>逐音素时序与发音</summary>{!caps&&<p>服务未报告音素能力，暂不开放编辑；已有覆盖会保留。</p>}
   <PhonemeForm key={JSON.stringify(override?.phonemes)} value={override?.phonemes} disabled={noteDisabled} offset={!!caps?.phonemeOverride.offset} replace={!!caps?.phonemeOverride.replace} onSave={phonemes=>apply(()=>setAdvancedNoteExpression(p,lineId,index,{phonemes}))}/>
   <p>最近一次渲染的整句音素（不提供逐音符对应）：{phonemes?.length?phonemes.join(' · '):'尚无响应，请先演唱这一句；不根据汉字猜测音素。'}</p>
  </details>
  <details><summary>整句表现与力度曲线</summary><label>表现曲线<select aria-label="表现曲线" value={abbr} onChange={e=>setAbbr(e.target.value as typeof abbr)}><option value="dyn">力度 / 句尾收音（0.1 dB）</option>{(Object.entries(expressionCurves) as [ExpressionAbbr,string][]).map(([id,label])=><option key={id} value={id} disabled={!caps?.curves[id]}>{label}{!caps?.curves[id]?'（未报告支持）':''}</option>)}</select></label>
   <p>数值范围：{abbr==='dyn'?'−240–120（0.1 dB）':curveRanges[abbr].join('–')}。不支持的效果不开放；已有曲线保留。</p>
   <PerformanceCurveEditor key={abbr+JSON.stringify(currentCurve)} label={abbr==='dyn'?'力度曲线':`${expressionCurves[abbr]}曲线`} points={currentCurve} disabled={disabled||!available||abbr!=='dyn'&&!caps?.curves[abbr]} onSave={points=>apply(()=>setExpressionCurve(p,lineId,abbr,points?.map(({x,y})=>({x,y}))))}/>
  </details>
  {!!caps?.unsupported.length&&<p>当前声库不支持：{caps.unsupported.join('、')}。</p>}
  <p role="status">{status}</p>
 </details>;
}
