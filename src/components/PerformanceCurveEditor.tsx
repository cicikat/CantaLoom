import {useState} from 'react';
import type {CurvePoint,PitchPoint} from '../../shared/contracts/melody.mjs';

// Text drafts keep empty/invalid edits local until the shared Schema accepts the whole curve.
type DraftPoint={x:string;y:string;shape:PitchPoint['shape']};
export function PerformanceCurveEditor({label,points,pitch=false,disabled,onSave}:{label:string;points?:CurvePoint[];pitch?:boolean;disabled:boolean;onSave:(points:PitchPoint[]|undefined)=>void}){
 const [draft,setDraft]=useState<DraftPoint[]>(()=>points?.map(p=>({x:String(p.x),y:String(p.y),shape:('shape' in p?p.shape:'io') as PitchPoint['shape']}))??[]),[error,setError]=useState('');
 const numeric=draft.map(p=>({x:Number(p.x),y:Number(p.y),shape:p.shape})),valid=draft.length>=2&&draft.every(p=>p.x.trim()&&p.y.trim())&&numeric.every(p=>Number.isFinite(p.x)&&Number.isFinite(p.y));
 function save(){try{if(draft.length&&!valid)throw Error('请填写至少两个完整的曲线点。');onSave(draft.length?numeric:undefined);setError('')}catch(e){setError((e as Error).message)}}
 function change(i:number,patch:Partial<DraftPoint>){setDraft(draft.map((p,j)=>j===i?{...p,...patch}:p))}
 const xs=numeric.map(p=>p.x),ys=numeric.map(p=>p.y),xmin=Math.min(...xs),xspan=Math.max(...xs)-xmin||1,ymin=Math.min(0,...ys),yspan=Math.max(0,...ys)-ymin||1;
 return <section className="curve-editor" aria-label={label}>
  <p>{pitch?'时间从这个音符起点计算；音高值 10 代表升高一个半音。':'时间从这句起点计算；曲线覆盖范围外使用引擎默认值。'}保存空表可恢复自动。</p>
  {valid&&<svg className="curve-preview" viewBox="0 0 300 90" role="img" aria-label={`${label}控制点预览`}><polyline points={numeric.map(p=>`${10+(p.x-xmin)/xspan*280},${80-(p.y-ymin)/yspan*70}`).join(' ')}/></svg>}
  <fieldset disabled={disabled}><div className="curve-points">{draft.map((p,i)=><div className="curve-point" key={i}>
   <label>时间（毫秒）<input aria-label={`${label}点${i+1}时间`} type="number" step="any" value={p.x} onChange={e=>change(i,{x:e.target.value})}/></label>
   <label>{pitch?'音高（0.1 半音）':'数值'}<input aria-label={`${label}点${i+1}数值`} type="number" step="1" value={p.y} onChange={e=>change(i,{y:e.target.value})}/></label>
   {pitch&&<label>过渡形状<select aria-label={`${label}点${i+1}形状`} value={p.shape} onChange={e=>change(i,{shape:e.target.value as PitchPoint['shape']})}><option value="io">平滑</option><option value="i">渐入</option><option value="o">渐出</option><option value="l">直线</option></select></label>}
   <button type="button" aria-label={`删除${label}点${i+1}`} onClick={()=>setDraft(draft.filter((_,j)=>i!==j))}>删除点</button>
  </div>)}</div><div className="expression-actions"><button type="button" disabled={draft.length>=64} onClick={()=>setDraft([...draft,{x:String(draft.length?Number(draft.at(-1)!.x)+100:0),y:'0',shape:'io'}])}>添加{label}点</button><button type="button" onClick={save}>保存{label}</button><button type="button" onClick={()=>{onSave(undefined);setError('')}}>恢复{label}自动值</button></div></fieldset>
  {error&&<p role="alert">{error}</p>}
 </section>;
}
