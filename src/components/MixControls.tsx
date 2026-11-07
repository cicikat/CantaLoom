import {useState} from 'react';
import {mixSettingsSchema} from '../../shared/contracts/production.mjs';
import {record,validateProject,type SongProject} from '../model';
import './expression-mix.css';
export type PreviewStem='vocal-dry'|'vocal-processed'|'instrumental'|'mix';
export function MixControls({project:p,onChange,onPreview,onStop,busy,playing}:{project:SongProject;onChange:(p:SongProject)=>void;onPreview:(stem:PreviewStem)=>void;onStop:()=>void;busy:boolean;playing:boolean}){
 const [stem,setStem]=useState<PreviewStem>('mix'),[error,setError]=useState('');
 const enabled=p.mixSettings?.enabled??p.mode==='free',external=p.vocalMode==='external',band=p.instrumentMode==='fluidsynth';
 function update(patch:Partial<NonNullable<SongProject['mixSettings']>>){try{const settings=mixSettingsSchema.parse({enabled,...p.mixSettings,...patch}),next=structuredClone(p);next.mixSettings=settings;onChange(validateProject(record(next,'调整全曲混音')));setError('')}catch{setError('混音数值无效，当前设置已保留。')}}
 return <details className="mix-panel"><summary>混音与分轨试听</summary><label className="mix-enabled"><input type="checkbox" checked={enabled} disabled={busy} onChange={e=>update({enabled:e.target.checked})}/> 启用混音处理</label>
  <div className="mix-fields"><label>人声音量 <output>{Math.round((p.mixSettings?.vocalGain??1)*100)}%</output><input aria-label="人声音量" type="range" min="0" max="200" step="1" value={(p.mixSettings?.vocalGain??1)*100} disabled={busy||!enabled||!external} onChange={e=>update({vocalGain:Number(e.target.value)/100})}/></label><label>伴奏音量 <output>{Math.round((p.mixSettings?.bandGain??1)*100)}%</output><input aria-label="伴奏音量" type="range" min="0" max="200" step="1" value={(p.mixSettings?.bandGain??1)*100} disabled={busy||!enabled||!band} onChange={e=>update({bandGain:Number(e.target.value)/100})}/></label><label>人声混响 <output>{(p.mixSettings?.reverb??.08).toFixed(2)}</output><input aria-label="人声混响" type="range" min="0" max="0.25" step="0.01" value={p.mixSettings?.reverb??.08} disabled={busy||!enabled||!external} onChange={e=>update({reverb:Number(e.target.value)})}/></label></div>
  {!band&&<p>当前浏览器伴奏暂不支持音量调整；使用 FluidSynth 伴奏时可调。</p>}{!external&&<p>人声音量和混响用于已生成或导入的逐句歌声。</p>}
  <div className="expression-actions"><label>试听内容 <select aria-label="试听内容" value={stem} disabled={busy} onChange={e=>{onStop();setStem(e.target.value as PreviewStem)}}><option value="mix">完整混音</option><option value="vocal-dry">干人声</option><option value="vocal-processed">处理后人声</option><option value="instrumental">伴奏</option></select></label><button type="button" disabled={busy} onClick={()=>onPreview(stem)}>试听所选分轨</button><button type="button" disabled={!playing} onClick={onStop}>停止分轨试听</button></div>
  <p>调整后重新试听；WAV 和 PV 使用同一套混音设置。干人声跳过混音处理。</p><p role="status">{error}</p>
 </details>;
}
