import {useEffect,useRef,useState} from 'react';
import type {useStudio} from '../hooks/useStudio';
import {api} from '../api/client';
const stages:Record<string,string>={queued:'等待制作',checking:'检查引擎',composing:'开始作曲',planning:'规划歌曲',melody:'谱写旋律',validated:'校验乐谱',instruments:'制作伴奏',singing:'逐句演唱','ready-for-mix':'音轨已就绪'};
const themes=[{name:'🌊 海盐汽水',idea:'海风吹过夏天的轻快歌',style:'海盐汽水'},{name:'🌙 深夜宇宙',idea:'凌晨两点写给月亮的信，安静而温柔',style:'深夜漫游'},{name:'🍋 柠檬摇滚',idea:'骑着单车追赶日落，明亮的吉他与鼓点',style:'橘子摇滚'},{name:'☁ 棉花糖梦',idea:'漂浮在棉花糖云朵里的柔软梦境',style:'海盐汽水'}] as const;
export function PatchlabCreation({studio:s,onLocal}:{studio:ReturnType<typeof useStudio>;onLocal:()=>void}){
 const p=s.production,job=p.view.job,running=p.view.phase==='running',menu=useRef<HTMLDetailsElement>(null);
 useEffect(()=>{const close=(e:PointerEvent)=>{if(menu.current&&!menu.current.contains(e.target as Node))menu.current.open=false};document.addEventListener('pointerdown',close);return()=>document.removeEventListener('pointerdown',close)},[]);
 const [open,setOpen]=useState(false);
 // The settings drawer is pinned to the viewport. While it is open the page itself must not scroll, because any scroll on
 // the hero starts the chapter transition; wheel/touch/keys only move the drawer's own content.
 useEffect(()=>{
  if(!open)return;
  const panel=menu.current?.querySelector<HTMLElement>('.creation-panel');
  const canScroll=(target:EventTarget|null,direction:number)=>{
   if(!panel||!(target instanceof Node)||!panel.contains(target))return false;
   for(let node:Element|null=target instanceof Element?target:target.parentElement;node;node=node.parentElement){
    if(node instanceof HTMLElement&&(node===panel||/(auto|scroll)/.test(getComputedStyle(node).overflowY))&&node.scrollHeight>node.clientHeight+1&&(direction>0?node.scrollTop+node.clientHeight<node.scrollHeight-1:node.scrollTop>1))return true;
    if(node===panel)break;
   }
   return false;
  };
  let touchY:number|null=null;
  const wheel=(e:WheelEvent)=>{if(!canScroll(e.target,Math.sign(e.deltaY)))e.preventDefault()};
  const touchStart=(e:TouchEvent)=>{touchY=e.touches.length===1?e.touches[0].clientY:null};
  const touchMove=(e:TouchEvent)=>{if(touchY===null||e.touches.length!==1)return;const delta=touchY-e.touches[0].clientY;if(Math.abs(delta)>1&&!canScroll(e.target,Math.sign(delta))&&e.cancelable)e.preventDefault()};
  const key=(e:KeyboardEvent)=>{if(e.target instanceof Element&&e.target.closest('input,textarea,select,[contenteditable=true]'))return;if(['ArrowDown','ArrowUp','PageDown','PageUp','Home','End',' '].includes(e.key)&&!canScroll(e.target,['ArrowUp','PageUp','Home'].includes(e.key)||(e.key===' '&&e.shiftKey)?-1:1))e.preventDefault()};
  const opts={capture:true,passive:false};
  addEventListener('wheel',wheel,opts);addEventListener('touchstart',touchStart,{capture:true,passive:true});addEventListener('touchmove',touchMove,opts);addEventListener('keydown',key,true);
  return()=>{removeEventListener('wheel',wheel,opts);removeEventListener('touchstart',touchStart,{capture:true});removeEventListener('touchmove',touchMove,opts);removeEventListener('keydown',key,true)};
 },[open]);
 const closeMenu=()=>{if(!menu.current)return;menu.current.open=false;menu.current.querySelector('summary')?.focus()};
 function theme(value:string){p.setIntent(value);s.setIdea(value)}
 return <div className="patchlab-creation">
  <form onSubmit={e=>{e.preventDefault();if(s.busy||running)return;if(!s.readiness.canProduce){if(menu.current){menu.current.open=true;menu.current.querySelector('summary')?.focus()}return}void p.start()}}>
   <div className="idea"><span className="idea-settings-space" aria-hidden="true"/><input id="idea" aria-label="自由创作主题" maxLength={500} value={p.intent} onChange={e=>theme(e.target.value)} placeholder="做一首海风吹过夏天的轻快歌" required/><button id="generate" className="btn" aria-label="制作新作品" title={!s.readiness.canProduce?'查看制作准备与本地创作选项':undefined} disabled={!!s.busy||running||!p.intent.trim()}>{running?'制作中…':'✦ 一键开工'}</button></div>
   <div className="quick">{themes.map(t=><button key={t.name} type="button" className={p.intent===t.idea?'on':''} onClick={()=>{theme(t.idea);s.setStyle(t.style)}}>{t.name}</button>)}</div>
  </form>
  <details ref={menu} className="creation-options compact-menu" onToggle={e=>setOpen(e.currentTarget.open)} onKeyDown={e=>{if(e.key==='Escape'){e.currentTarget.open=false;e.currentTarget.querySelector('summary')?.focus()}}}><summary aria-label="创作设置" title="歌词、速度与制作设置">✎</summary><div className="creation-panel menu-panel" role="dialog" aria-label="创作设置面板"><div className="creation-head"><h3>创作设置</h3><button type="button" className="minibtn" onClick={closeMenu}>完成</button></div><label>自己的歌词 <small>可选 · 1–8 行，原样保留</small><textarea aria-label="自由创作歌词" rows={4} value={p.lyrics} onChange={e=>p.setLyrics(e.target.value)} placeholder="一行一句，留空时为你写词"/></label><div className="creation-fields"><label>速度 <input aria-label="自由创作速度" type="number" min={60} max={160} placeholder="自动" value={p.bpm} onChange={e=>p.setBpm(e.target.value)}/></label><label>时长 <select aria-label="自由创作时长" value={p.targetSeconds} onChange={e=>p.setTargetSeconds(Number(e.target.value))}>{[20,25,30].map(v=><option key={v} value={v}>{v} 秒左右</option>)}</select></label></div>
   {!api.mock&&!s.readiness.canProduce&&<div className="creation-setup" role="status" aria-label="制作前准备"><b>{s.readiness.checking?'检查制作环境…':'自动制作还需准备'}</b><div><button className="minibtn" onClick={()=>{menu.current!.open=false;onLocal()}}>先玩音乐积木</button><a href={import.meta.env.DEV?'http://127.0.0.1:3001/admin':'/admin'} target="_blank" rel="noreferrer">打开本机设置</a><button className="minibtn" disabled={s.readiness.checking} onClick={()=>void s.readiness.refresh()}>重新检查</button></div>{!s.readiness.checking&&<ul>{s.readiness.problems.map(problem=><li key={problem}>{problem}</li>)}</ul>}</div>}
   <div className="lyric-sync"><button className="minibtn" disabled={!!s.busy||running||!p.lyrics.trim()} onClick={s.syncLyrics}>同步歌词到当前作品</button> <button className="text-button" disabled={!!s.busy||running} onClick={()=>p.setLyrics(s.p.lyrics.map(l=>l.text).join('\n'))}>用当前歌词填写</button><p>同步后便利贴和 MV 一起更新；保持当前句数。{s.p.mode==='free'?'自由作品保留旋律，唱字数需与原句一致；改动句需重新演唱。':'点击「本地搭建积木」也会带上这里的歌词。'}</p></div>
   <button className="minibtn" disabled={!!s.busy||s.p.mode==='free'||!s.idea.trim()} onClick={()=>void s.develop(true)}>本地搭建积木</button><p className="honesty">{s.llmLabel}</p><small>制作新作品会替换当前工程，请先导出需要保留的作品。</small>
  </div></details>
  {p.view.phase!=='idle'&&<aside className="production-note" aria-label="制作状态" aria-live="polite"><p className={p.view.phase==='failed'?'production-error':''} role={p.view.phase==='failed'?'alert':undefined}>{job&&<b>{api.mock?'MOCK 测试阶段：':''}{stages[job.stage]||job.stage}{job.stage==='singing'&&job.completedPhrases!==undefined?` · ${job.completedPhrases} 句`:''} · </b>}{p.view.message}</p>{running&&<button className="text-button" onClick={p.cancel}>停止等待，保留当前工程</button>}{p.retryable&&<button className="minibtn" disabled={!!s.busy} onClick={()=>void p.retry()}>重试缺失的演唱</button>}{p.view.phase==='ready'&&<button className="text-button" disabled={!!s.busy} onClick={()=>s.playing?s.stop():void s.play()}>{s.playing?'暂停这首作品':'试听这首作品'}</button>}</aside>}
  {s.planError&&<p className="production-error" role="alert">{s.planError}<button className="minibtn" disabled={!!s.busy} onClick={()=>void s.develop(true)}>使用本地规则生成</button></p>}
 </div>;
}
