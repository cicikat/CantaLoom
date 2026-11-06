import {useId} from 'react';
import {Headphones,LoaderCircle,Music2} from 'lucide-react';
import type {useProduction} from '../hooks/useProduction';
import {api} from '../api/client';
import './free-creation.css';

const stages:Record<string,string>={queued:'已提交，等待制作',checking:'检查音乐引擎',composing:'开始作曲',planning:'规划歌曲',melody:'谱写旋律',validated:'校验乐谱',instruments:'制作伴奏',singing:'制作逐句演唱','ready-for-mix':'音轨已就绪'};
export function FreeCreation({production:p,busy,preparing,playing,onListen}:{production:ReturnType<typeof useProduction>;busy:boolean;preparing:boolean;playing:boolean;onListen:()=>void}){
 const id=useId(),running=p.view.phase==='running',job=p.view.job;
 return <section className="free-creation" aria-labelledby={`${id}-heading`}>
  <div className="free-creation-heading"><div><span className="free-creation-symbol" aria-hidden="true">♫</span><h2 id={`${id}-heading`}>把这段心情，做成歌。</h2><p>写下想要的感觉，或带上自己的歌词。我们先做一首 20–30 秒的小作品。</p></div><span className="demo-badge">{api.mock?'MOCK 测试创作':'自由创作'}</span></div>
  <div className="free-creation-layout"><form onSubmit={e=>{e.preventDefault();if(!busy)void p.start()}}>
   <label htmlFor={`${id}-intent`}>你想做一首怎样的歌？</label><textarea id={`${id}-intent`} aria-label="自由创作主题" rows={2} maxLength={500} value={p.intent} onChange={e=>p.setIntent(e.target.value)} placeholder="例如：雨停后独自走回家，前半段安静，最后带一点释然" required/>
   <label htmlFor={`${id}-lyrics`}>自己的歌词 <small>可选，1–8 行，每行最多 100 字</small></label><textarea id={`${id}-lyrics`} aria-label="自由创作歌词" rows={4} value={p.lyrics} onChange={e=>p.setLyrics(e.target.value)} placeholder={'一行一句，原样保留你的字词\n留空时为你写词'}/>
   <div className="free-creation-options"><label>速度 <input aria-label="自由创作速度" type="number" min={60} max={160} step={1} placeholder="自动" value={p.bpm} onChange={e=>p.setBpm(e.target.value)}/></label><label>目标时长 <select aria-label="自由创作时长" value={p.targetSeconds} onChange={e=>p.setTargetSeconds(Number(e.target.value))}>{[20,25,30].map(v=><option key={v} value={v}>{v} 秒左右</option>)}</select></label></div>
   <div className="free-creation-actions"><button className="button dark" type="submit" disabled={busy||running||!p.intent.trim()}>{running?<LoaderCircle size={16} className="spin"/>:<Music2 size={16}/>} {running?'正在制作':'制作新作品'}</button><small>成功后替换当前工程；需要保留的作品请先导出。</small></div>
  </form><aside className="production-note" aria-label="制作状态" aria-live="polite" aria-atomic="true">
   <h3>{running?'正在把灵感变成声音':p.view.phase==='ready'?'这次的作品准备好了':'你的制作便签'}</h3>
   {job&&<p className="production-stage">{api.mock?'MOCK 测试阶段：':''}{stages[job.stage]||'等待制作状态'}{job.completedPhrases!==undefined&&job.stage==='singing'&&` · 已完成 ${job.completedPhrases} 句`}</p>}
   {p.view.phase==='failed'?<p className="production-error" role="alert">{p.view.message}</p>:<p>{p.view.message||'制作期间保留当前工程，完成后再一次应用。'}</p>}
   {running&&<button type="button" className="text-button" onClick={p.cancel}>停止等待，保留当前工程</button>}
   {p.retryable&&<button type="button" className="button light small" disabled={busy} onClick={()=>void p.retry()}>重试缺失的演唱</button>}
   {p.view.phase==='ready'&&<button type="button" className="button light" disabled={busy} onClick={onListen}>{preparing?<LoaderCircle size={16} className="spin"/>:<Headphones size={16}/>} {preparing?'正在准备试听':playing?'暂停这首作品':'试听这首作品'}</button>}
   <small>{api.mock?'当前为固定测试数据与测试音，未调用模型。':'首次演唱可能需要较长时间。停止等待不会中止后台已受理的制作。'}</small>
  </aside></div>
 </section>;
}
