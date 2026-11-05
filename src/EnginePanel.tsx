import {api} from './api/client';
import {useEffect,useRef,useState} from 'react';
import {type SongProject,kinds} from './model';
import {midiFile,gmPrograms} from '../shared/midi.mjs';
import {openUtauProject,diffSingerInput,singingDependency,type SingingVoice} from './singing';
import {importSinging,assetVoice} from './external-audio';
import {download} from './visual';
import {stringify as yamlStringify} from 'yaml';
export function EnginePanel({project:p,onChange}:{project:SongProject;onChange:(p:SongProject)=>void}){
 const [status,setStatus]=useState('检查中'),[fonts,setFonts]=useState<string[]>([]),[message,setMessage]=useState(''),[voiceId,setVoiceId]=useState(''),[version,setVersion]=useState(''),[provider,setProvider]=useState<SingingVoice['providerId']>('openutau-exchange');
 const latest=useRef(p);latest.current=p;
 useEffect(()=>{api.engines().then(s=>{setFonts(s.instruments.soundfonts);setStatus(s.instruments.ready?(s.instruments.version||'FluidSynth 已就绪'):s.instruments.installed?'缺少 SF2/SF3':'FluidSynth 未安装')}).catch(()=>setStatus('本地音源服务不可用'))},[]);
 function edit(fn:(next:SongProject)=>void){const next=structuredClone(p);fn(next);onChange(next)}
 function save(data:unknown,name:string){download(new Blob([name.endsWith('.ustx')?yamlStringify(data):JSON.stringify(data,null,2)],{type:name.endsWith('.ustx')?'application/yaml':'application/json'}),name)}
 async function ds(id:string){try{const dictionary=await api.dictionary();save(diffSingerInput(p,p.lyrics.find(l=>l.id===id)!,dictionary),`songyu-${id}.ds`)}catch(e){setMessage((e as Error).message)}}
 async function upload(id:string,file?:File){if(!file)return;try{if(!voiceId.trim()||!version.trim())throw Error('先填写实际声库名称和版本');setMessage('校验并导入音频…');const line=p.lyrics.find(l=>l.id===id)!;const voice={id:voiceId.trim(),version:version.trim(),label:voiceId.trim(),providerId:provider};const asset=await importSinging(p,line,file,voice);const now=latest.current;const current=now.lyrics.find(l=>l.id===id);if(!current||singingDependency(now,current,voice)!==asset.dependency)throw Error('导入期间歌词或旋律已改变，请重新导入');const next=structuredClone(now);next.vocalAssets={...next.vocalAssets,[id]:asset};onChange(next);setMessage(api.mock?'MOCK 导入交互完成，使用测试音':'已导入真实 WAV；选择外部人声后用于试听与全部导出')}catch(e){setMessage((e as Error).message)}}
 return <details className="engine-panel"><summary>本地音乐引擎 · {p.instrumentMode==='fluidsynth'?`FluidSynth / ${p.soundfont||fonts[0]||'无音源'}`:'Web Audio 合成器'} · {api.mock?'MOCK 测试音':p.vocalMode==='external'?'外部真实人声':'元音演示'}</summary>
 <p>{status} · 统一 24000 Hz 时间轴</p><div className="engine-controls">
 <label>乐器音源 <select aria-label="乐器音源" value={p.instrumentMode||'synth'} onChange={e=>edit(n=>{n.instrumentMode=e.target.value as 'synth'|'fluidsynth'})}><option value="synth">Web Audio 合成器</option><option value="fluidsynth">{api.mock?'MOCK 器乐测试音':'FluidSynth 真实采样音源'}</option></select></label>
 <label>SoundFont <select aria-label="SoundFont" value={p.soundfont||fonts[0]||''} onChange={e=>edit(n=>{n.soundfont=e.target.value})}>{fonts.map(f=><option key={f}>{f}</option>)}</select></label>
 {kinds.filter(k=>k!=='vocal'&&k!=='drums').map(k=><label key={k}>{k} GM (0–127) <input aria-label={`${k} GM`} type="number" min="0" max="127" value={p.instrumentPrograms?.[k]??gmPrograms[k]} onChange={e=>{const v=Number(e.target.value);if(Number.isInteger(v)&&v>=0&&v<=127)edit(n=>{n.instrumentPrograms={...n.instrumentPrograms,[k]:v}})}}/></label>)}
 <button onClick={()=>{try{const tracks=kinds.map(kind=>({kind,program:p.instrumentPrograms?.[kind],notes:p.tracks.filter(t=>t.kind===kind&&!t.muted).flatMap(t=>t.notes)}));download(new Blob([midiFile({bpm:p.bpm,tracks,endBeat:p.sections.at(-1)!.start+p.sections.at(-1)!.beats})],{type:'audio/midi'}),'songyu.mid')}catch(e){setMessage((e as Error).message)}}}>导出标准 MIDI</button>
 <button onClick={()=>{try{save(openUtauProject(p),'songyu.ustx')}catch(e){setMessage((e as Error).message)}}}>导出 OpenUtau USTX</button>
 <label>人声模式 <select aria-label="人声模式" value={p.vocalMode||'demo'} onChange={e=>edit(n=>{n.vocalMode=e.target.value as 'demo'|'external'})}><option value="demo">元音合成演示</option><option value="external">{api.mock?'MOCK 人声测试音':'外部真实歌声 WAV'}</option></select></label>
 <label>实际声库 <input aria-label="实际声库" placeholder="不指定默认歌姬" value={voiceId} onChange={e=>setVoiceId(e.target.value)}/></label><label>声库版本 <input aria-label="声库版本" value={version} onChange={e=>setVersion(e.target.value)}/></label>
 <label>歌声引擎 <select value={provider} onChange={e=>setProvider(e.target.value as SingingVoice['providerId'])}><option value="openutau-exchange">OpenUtau 文件交换</option><option value="diffsinger">DiffSinger</option></select></label></div>
 <p>USTX 在 OpenUtau 选定声库后导出单句 WAV；WAV 从本句起点开始，保留休止并与本句总时长一致。DS 使用服务端配置的声库音素词典，需先运行 variance 再运行 acoustic。</p>
 {p.lyrics.map((l,i)=>{const asset=p.vocalAssets?.[l.id];const valid=asset&&asset.dependency===singingDependency(p,l,assetVoice(asset));return <div className="engine-line" key={l.id}><span>第 {i+1} 句 · {asset?`${valid?'有效':'已过期'} / ${asset.providerId} / ${asset.voiceId} ${asset.voiceVersion}`:'尚未导入真实人声'}</span><button onClick={()=>void ds(l.id)}>导出本句 DS</button><button onClick={()=>{try{save(openUtauProject(p,[l]),`songyu-${i+1}.ustx`)}catch(e){setMessage((e as Error).message)}}}>本句 USTX</button><label>导入本句 WAV <input aria-label={`导入第${i+1}句 WAV`} type="file" accept=".wav" disabled={l.locked||p.tracks.some(t=>t.sectionId===l.sectionId&&t.kind==='vocal'&&t.locked)} onChange={e=>void upload(l.id,e.target.files?.[0])}/></label></div>})}<p role="status">{message}</p></details>;
}
