import {useEffect,useRef,useState} from 'react';
import {api,type ExportReport} from '../api/client';
import type {LoudnessReport} from '../../shared/contracts/index.mjs';
import {downloadArtifact,prepareInstrumentArtifacts,vocalArtifacts,type RenderArtifact} from '../features/export/files';
import type {SongProject} from '../model';
import './artifacts.css';
const value=(n:number|null,unit:string)=>n===null?'无有限测量值':`${n.toFixed(1)} ${unit}`;
function Metrics({report}:{report:LoudnessReport}){return <span>响度 {value(report.integratedLufs,'LUFS')} · 真峰值 {value(report.truePeakDbtp,'dBTP')}</span>}
export function ExportLoudnessReport({report}:{report?:ExportReport}){
 if(!report)return null;
 return <section className="export-report" aria-label="MP4 响度报告"><h3>本次导出响度</h3>{report.status==='measured'&&report.loudness?<><p>混音输入：<Metrics report={report.loudness.input}/></p><p>成片 AAC 实测：<Metrics report={report.loudness.output}/></p><p>服务端目标：<Metrics report={report.loudness.target}/> · LRA {report.loudness.target.lra}</p><p>以成片实测为准；目标值不代表严格达标。</p></>:<p>{report.status==='mock'?'MOCK JSON 回执，未运行 FFmpeg；没有成片响度实测。':report.status==='invalid'?'MP4 已下载；服务返回的响度报告格式无效，未展示数值。':'MP4 已下载；服务未提供响度报告。'}</p>}</section>;
}
function ArtifactRow({item,disabled}:{item:RenderArtifact;disabled:boolean}){
 const [busy,setBusy]=useState(false),[status,setStatus]=useState(''),[report,setReport]=useState<LoudnessReport>();
 async function run(measure=false){setBusy(true);setStatus('');try{if(measure)setReport(await api.loudness(item.file));else await downloadArtifact(item)}catch(e){setStatus((e as Error).message);if(measure)setReport(undefined)}finally{setBusy(false)}}
 return <li><span>{item.label} · {item.type.toUpperCase()}</span><div className="artifact-actions"><button type="button" disabled={disabled||busy} onClick={()=>void run()}>下载 {item.type.toUpperCase()}</button>{item.type==='wav'&&<button type="button" disabled={disabled||busy} onClick={()=>void run(true)}>测量响度</button>}</div>{report&&<p>{api.mock?'MOCK 固定数值，非实测：':''}<Metrics report={report}/></p>}{status&&<p role="status">{status}；工程保留，可重新准备或稍后重试。</p>}</li>;
}
export function ArtifactDownloads({project:p,busy}:{project:SongProject;busy:boolean}){
 const [instruments,setInstruments]=useState<{project:SongProject;files:RenderArtifact[]}>(),[working,setWorking]=useState(false),[status,setStatus]=useState('');
 const latest=useRef(p),mounted=useRef(true);latest.current=p;
 useEffect(()=>{mounted.current=true;return()=>{mounted.current=false}},[]);
 const files=[...vocalArtifacts(p),...(instruments?.project===p?instruments.files:[])];
 async function prepare(){if(working)return;setWorking(true);setStatus('');const source=p;try{const files=await prepareInstrumentArtifacts(source);if(!mounted.current)return;if(latest.current!==source){setStatus('准备期间工程已变化，请为当前工程重新准备。');return}setInstruments({project:source,files});setStatus(files.length?'器乐分轨已准备，可逐个下载。':'当前没有可渲染的器乐音符。')}catch(e){if(mounted.current)setStatus((e as Error).message)}finally{if(mounted.current)setWorking(false)}}
 return <details className="artifact-downloads"><summary>分轨文件与响度</summary><p>{api.mock?'MOCK 文件/固定响度夹具，不能用于真实 DAW 或听感验收。':'下载服务端缓存原文件；换电脑或缓存清理后可能需要重新生成。'} MIDI 按器乐轨道下载，USTX 按演唱句下载；没有整曲 MIDI 或 ZIP。</p><button type="button" disabled={busy||working||p.instrumentMode!=='fluidsynth'} onClick={()=>void prepare()}>{working?'准备器乐分轨…':'准备器乐分轨（FluidSynth）'}</button>{p.instrumentMode!=='fluidsynth'&&<p>当前为浏览器合成伴奏，没有对应的服务端 MIDI/WAV 缓存；仍可导出上方混音 WAV。切换音源请使用作品设置。</p>}<p>人声只列当前依赖有效的演唱；修改调教后请先重唱。测量依赖本机 FFmpeg。</p><ul>{files.map(a=><ArtifactRow key={`${a.label}-${a.file}`} item={a} disabled={busy||working}/>)}</ul>{!files.length&&<p>暂无可下载的分轨文件。</p>}<p role="status">{status}</p></details>;
}
