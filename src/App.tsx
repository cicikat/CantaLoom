import {useEffect,useRef,useState,type CSSProperties} from 'react';
import {flushSync} from 'react-dom';
import {useStudio} from './hooks/useStudio';
import {useVocalStyle} from './hooks/useVocalStyle';
import {api} from './api/client';
import {trackInfo,beatsToSeconds,type SubtitleStyle} from './model';
import {keyLabel,planIntent} from './song-plan';
import {Landscape} from './components/Landscape';
import {PianoRoll} from './components/PianoRoll';
import {QixuanPanel} from './QixuanPanel';
import {EnginePanel} from './EnginePanel';
import {PatchlabCreation} from './components/PatchlabCreation';
import {MixControls} from './components/MixControls';
import {HeroTitle} from './components/HeroTitle';
import {BenchAct,MvAct,chapterScrollTop} from './components/ChapterActs';
import {boardPulse} from './components/board-pulse';
import {ArtifactDownloads,ExportLoudnessReport} from './components/ArtifactDownloads';

type BenchView='board'|'to-lyrics'|'lyrics'|'from-lyrics'|'to-board';
const BENCH_SLIDE_MS=560;
const reducedMotion=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;
const clock=(t:number)=>`${Math.floor(t/60).toString().padStart(2,'0')}:${Math.floor(t%60).toString().padStart(2,'0')}`;
export default function App(){
 const s=useStudio(),vocalStyle=useVocalStyle(s),{p,production,playing,time,selected,length}=s;
 const busy=s.busy||(vocalStyle.working?'切换风格并重新演唱…':'');
 const external=p.vocalMode==='external'||p.mode==='free';
 const vocalStyles=[{name:'自然',preset:'natural'},{name:'轻柔',preset:'soft'},{name:'强烈',preset:'strong'}] as const;
 const uniformPreset=p.lyrics.length&&p.lyrics.every(l=>(l.performance?.preset??'natural')===(p.lyrics[0].performance?.preset??'natural'))?(p.lyrics[0].performance?.preset??'natural'):undefined;
 const [editor,setEditor]=useState<string>(),[voiceOpen,setVoiceOpen]=useState(false),[nav,setNav]=useState('compose');
 const dragged=useRef<string|undefined>(undefined),exportRef=useRef<HTMLDialogElement>(null),exportTrigger=useRef<HTMLElement|null>(null),projectMenu=useRef<HTMLDetailsElement>(null);
 useEffect(()=>{setEditor(undefined)},[p.id]);
 useEffect(()=>{const close=(e:PointerEvent)=>{if(projectMenu.current&&!projectMenu.current.contains(e.target as Node))projectMenu.current.open=false};document.addEventListener('pointerdown',close);return()=>document.removeEventListener('pointerdown',close)},[]);
 const tracks=p.tracks.filter(t=>t.sectionId===selected.id),beat=time*p.bpm/60;
 useEffect(()=>{if(s.exportOpen)exportRef.current?.showModal();else exportRef.current?.close()},[s.exportOpen]);
 // Chapter 2 has two side-by-side pages; the lyric page is not in the scroll flow until it is opened.
 const [bench,setBench]=useState<BenchView>('board'),lyricsBack=useRef<HTMLButtonElement>(null),lyricsOpen=useRef<HTMLButtonElement>(null);
 useEffect(()=>{
  if(bench==='from-lyrics'){let f=requestAnimationFrame(()=>{f=requestAnimationFrame(()=>setBench('to-board'))});return()=>cancelAnimationFrame(f)}
  if(bench==='to-lyrics'||bench==='to-board'){const t=setTimeout(()=>setBench(bench==='to-lyrics'?'lyrics':'board'),BENCH_SLIDE_MS);return()=>clearTimeout(t)}
 },[bench]);
 function slideBench(view:BenchView,target:string,focus:HTMLButtonElement|null){const still=reducedMotion();flushSync(()=>setBench(still?(view==='to-lyrics'?'lyrics':'board'):view));scrollTo({top:chapterScrollTop(target),behavior:still?'instant':'smooth'});focus?.focus({preventScroll:true})}
 function openLyrics(){setVoiceOpen(true);slideBench('to-lyrics','lyrics',lyricsBack.current)}
 function closeLyrics(){setEditor(undefined);slideBench('from-lyrics','board',lyricsOpen.current)}
 function go(id:string){if(projectMenu.current)projectMenu.current.open=false;production.invalidate('已切换创作区域，上次制作结果不会覆盖当前工程。');setEditor(undefined);setNav(id);flushSync(()=>setBench('board'));scrollTo({top:chapterScrollTop(id),behavior:'smooth'})}
 function openExport(){exportTrigger.current=projectMenu.current?.querySelector('summary')??document.activeElement as HTMLElement;if(projectMenu.current)projectMenu.current.open=false;s.setExportOpen(true)}
 function openEditor(id:string){production.invalidate();setEditor(id);setVoiceOpen(true);setTimeout(()=>document.getElementById('phrase-editor')?.scrollIntoView({behavior:'smooth',block:'start'}),0)}
 function moveTrack(id:string,to:string){if(id===to)return;s.mutate('调整积木顺序',next=>{const from=next.tracks.findIndex(t=>t.id===id),target=next.tracks.findIndex(t=>t.id===to);if(from<0||target<0||next.tracks[from].sectionId!==next.tracks[target].sectionId)return;const [track]=next.tracks.splice(from,1);next.tracks.splice(target,0,track)})}
 function toggleLock(id:string){s.mutate('切换音轨锁定',next=>{const track=next.tracks.find(t=>t.id===id)!;track.locked=!track.locked})}
 const playButton=(id?:string)=><button className="minibtn" id={id} aria-label={playing?'暂停全曲':'播放全曲'} disabled={!!busy} onClick={()=>playing?s.stop():void s.play()}>{busy==='准备音频'?'准备声音…':playing?'Ⅱ PAUSE':'▶ PLAY'}</button>;
 return <div className="page">
  <header className="nav"><a className="logo" href="#compose" onClick={e=>{e.preventDefault();go('compose')}} aria-label="LOOP! 首页"><span className="logomark">♫</span><span>LOOP!<small>MUSIC PLAYGROUND</small></span></a><nav className="nav-links" aria-label="创作区域"><button className={nav==='compose'?'on':''} onClick={()=>go('compose')}>创作</button><button className={nav==='board'?'on':''} onClick={()=>go('board')}>音乐积木</button><button id="navpv" className={nav==='pv'?'on':''} onClick={()=>go('pv')}>PV ✦</button></nav><details ref={projectMenu} className="project-controls compact-menu" onKeyDown={e=>{if(e.key==='Escape'){e.currentTarget.open=false;e.currentTarget.querySelector('summary')?.focus()}}}><summary aria-label="作品设置"><span className="desktop-label">保存 / 导出</span><span className="mobile-label">⋯</span>{api.mock&&<span className="mock-label" role="note">MOCK</span>}</summary><div className="project-panel menu-panel"><p className="workspace-meta">{p.metadata.title} · {p.bpm} BPM · {keyLabel(s.plan)}<small>{s.saved}</small></p><div className="project-actions"><button className="minibtn" onClick={s.manualSave}>保存工程</button><button className="minibtn" onClick={openExport}>导出作品</button></div>    <details className="plan-details"><summary>这首歌的创作配方</summary><p>{s.llmLabel} · {keyLabel(s.plan)}</p>{planIntent(s.plan).map(item=><p key={item.decision}><b>{item.summary}</b> {item.reason}</p>)}<div className="compatibility-note">{p.planning?.compatibility.map(note=><p key={note}>{note}</p>)}</div><button className="minibtn" disabled={!!busy||p.mode==='free'||!s.idea.trim()} onClick={()=>void s.develop()}>生成积木方案</button></details>   <label className="tap-complete"><input type="checkbox" checked={s.complete} onChange={e=>s.setComplete(e.target.checked)}/> 节奏录入时补上踩镲与军鼓</label><div className="advanced-tools"><EnginePanel project={p} onChange={next=>s.recordChange(next,'调整本地引擎或导入歌声')}/>{!api.mock&&<a href={import.meta.env.DEV?'http://127.0.0.1:3001/admin':'/admin'} target="_blank" rel="noreferrer">打开本机设置 ↗</a>}</div></div></details></header>
  <main>
   <section className="hero" id="compose"><div className="hero-copy"><span className="eyebrow">✦ 给不会编曲的人造一个音乐游乐场</span><HeroTitle tap="敲一下。" pop="变成一首歌！"/><p className="intro">一句话、一段节奏，甚至一个奇怪的念头。让 AI 搭好音乐积木，喜欢哪块就留下，不喜欢就换掉。</p><PatchlabCreation studio={{...s,busy}} onLocal={()=>go('board')}/></div><div className="hero-right"><div className="sticker top">A LITTLE IDEA ♫</div><span className="starburst">✳</span><div className="bigcard"><div className="sun"/><div className="wave"/><div className="wave second"/><div className="boat">⛵</div><span className="record" id="songLabel">{p.metadata.title}</span></div><div className="sticker bottom">MAKE SOME NOISE! ↗</div><span className="spark">✦</span></div></section>

   <BenchAct/>
   <div className="act-pin bench-pin"><div className="chapter-blocks"><div className="bench-slider"><div className="bench-track" data-view={bench}>
   <div className="bench-pane board-pane">
   <section className="sections" id="board"><div className="stepheader"><div><span className="number">STEP 01 / DRAG · DROP · PLAY</span><h2>你的音乐积木 🧩</h2></div><small>点方块改节奏 · 单轨重生 · 锁定喜欢的部分<br/>电脑可以拖动轨道排序，手机可以用 ↑↓ 移动</small></div><div className="layout"><div className="board"><div className="boardtop"><b>▦ LOOP BOARD <select aria-label="歌曲段落" className="section-select" value={selected.id} onChange={e=>{const section=p.sections.find(x=>x.id===e.target.value)!;s.setSection(section.id);s.seek(beatsToSeconds(p,section.start))}}>{p.sections.map(section=><option value={section.id} key={section.id}>{section.name}</option>)}</select></b><div className="boardactions">{playButton('play')}<button className="minibtn" id="random" aria-label="重做未锁定积木" disabled={!!busy||p.mode==='free'} onClick={s.regenerateAll}>✦ 补全积木</button></div></div>


    <div id="tracks">{tracks.map((t,index)=>{const info=trackInfo[t.kind],name=t.kind==='vocal'?(p.vocalMode==='external'?'歌声':'元音人声'):info.name;return <div key={t.id} className={`track ${t.muted?'off':''}`} data-track={t.id} draggable onDragStart={e=>{dragged.current=t.id;e.dataTransfer.effectAllowed='move';e.dataTransfer.setData('text/plain',t.id)}} onDragEnd={()=>{dragged.current=undefined}} onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();if(dragged.current)moveTrack(dragged.current,t.id);dragged.current=undefined}} style={{'--cell':info.color} as CSSProperties}>
     <div className="tracktitle"><button className="trackicon" title="单轨试听" aria-label={`试听${name}`} disabled={!!busy||t.muted||!t.notes.length} onClick={()=>void s.play({trackId:t.id})} style={{background:info.color}}>{{drums:'🥁',bass:'🎸',guitar:'🎼',keys:'▤',melody:'🎹',vocal:'🎤'}[t.kind]}</button><span className="trackname"><b>{name}</b><small>{info.en} · v{t.version}</small></span></div><div className="stepgrid">{Array.from({length:16},(_,step)=>{const on=t.notes.some(n=>Math.floor(((n.beat-selected.start)%4)*4+.00001)===step),pulse=playing&&!t.muted&&beat>=selected.start&&beat<selected.start+selected.beats?boardPulse(t.notes,step,selected.start,beat):0;return <button key={step} className={`beat ${on?'on':''} ${pulse>0?'current':''}`} style={{'--pulse':`${pulse}px`} as CSSProperties} aria-label={`${name} 第${step+1}格`} aria-pressed={on} disabled={t.locked||!!busy||p.mode==='free'||t.kind==='vocal'} onClick={()=>s.toggleStep(t,step)}/>})}</div><div className="trackactions"><button aria-label={`上移${name}`} disabled={index===0} onClick={()=>moveTrack(t.id,tracks[index-1].id)}>↑</button><button aria-label={`下移${name}`} disabled={index===tracks.length-1} onClick={()=>moveTrack(t.id,tracks[index+1].id)}>↓</button><button aria-label={`静音${name}`} aria-pressed={t.muted} onClick={()=>s.mutate('切换静音',next=>{next.tracks.find(x=>x.id===t.id)!.muted=!t.muted})}>{t.muted?'○':'◉'}</button><button aria-label={`锁定${name}`} aria-pressed={t.locked} className={t.locked?'active':''} onClick={()=>toggleLock(t.id)}>{t.locked?'🔒':'♧'}</button><button aria-label={`重新生成${name}`} disabled={t.locked||t.notes.some(n=>n.locked)||!!busy||p.mode==='free'} onClick={()=>s.regenerateTrack(t)}>↻</button></div>
    </div>})}</div><div className="boardfoot"><strong>◉ 每一层都能单独操作</strong><div className="board-playhead"><span>{clock(time)}</span><input type="range" aria-label="播放进度" min={0} max={length} step={.05} value={Math.min(time,length)} onChange={e=>s.seek(Number(e.target.value))}/><span>{clock(length)}</span></div></div></div>
    <div className="studio-side"><section className="tapcard"><div className="tag">✳ EXPERIMENT NO. 01 / YOUR RHYTHM<button className="quiet-icon" aria-label="重置敲击" title="重新敲" onClick={()=>{s.setTaps([]);s.lastTap.current=0}}>↻</button></div><h3>你来敲，AI 来接！</h3><p>在这个大按钮上连续敲 4–8 下，把你的真实节奏变成鼓点。</p><div className="tappanel"><button id="tap" className="tap-square" aria-label="敲击节奏" onPointerDown={e=>{e.preventDefault();s.tap()}} onKeyDown={e=>{if((e.key===' '||e.key==='Enter')&&!e.repeat){e.preventDefault();s.tap()}}}>✋</button><div className="tap-info"><div className="bpmbig" id="bpm">{s.tapBpm??p.bpm} <small>BPM</small></div><span className="tap-count">{s.taps.length}/8 YOUR GROOVE</span><div className="tap-dots" id="tapDots">{Array.from({length:8},(_,i)=><span key={i} style={{opacity:i<s.taps.length?1:.25}}/>)}</div><button id="applyRhythm" className="minibtn" disabled={!s.tapBpm||!!busy||p.mode==='free'} onClick={s.apply}>↳ 变成鼓点</button></div></div></section>
    <section className="voicecard"><div className="tag">♪ EXPERIMENT NO. 02 / VOCAL</div><h3>今天使用什么演唱风格？</h3><div className="voice-options">{(external?vocalStyles.map(v=>v.name):['澄音','星羽','雾歌']).map((name,i)=><button key={name} aria-pressed={external?uniformPreset===vocalStyles[i].preset:p.vocalPreset===name} className={(external?uniformPreset===vocalStyles[i].preset:p.vocalPreset===name)?'on':''} disabled={!!busy||production.view.phase==='running'} onClick={()=>external?void vocalStyle.select(vocalStyles[i].preset):s.changePreset((['澄音','星羽','雾歌'] as const)[i])}><span className="face">{['🌊','☀️','🌙'][i]}</span>{name}</button>)}</div>{vocalStyle.error&&<p className="production-error" role="alert">{vocalStyle.error}</p>}<p className="voice-description">{external?'切换后自动重唱未锁定句；保留逐音符设置。':api.mock?'MOCK 元音测试音':'元音演示音色，不会读出中文'}<button ref={lyricsOpen} className="text-button" aria-label="打开逐句演唱" onClick={openLyrics}>打开逐句演唱 ↗</button></p></section></div></div>

   </section>
   </div>
   <div className="bench-pane lyrics-pane">
   <section className="sections lyrics-section" id="lyrics"><div className="lyrics-toolbar"><button ref={lyricsBack} className="minibtn lyrics-back" onClick={closeLyrics}>← 回到音乐积木</button>{playButton()}</div><div className="stepheader"><div><span className="number">STEP 02 / WORD BY WORD</span><h2>歌词也能像便利贴一样改！</h2></div><small>想改哪一句？点那张卡就行。<br/>其他歌词和演唱会保留。</small></div><div className="lyricrows" id="lyricRows">{p.lyrics.map((line,i)=><article className="lyric" key={line.id}><div className="lyric-heading"><small>LYRIC STICKER / {String(i+1).padStart(2,'0')} ✦</small><div className="lyric-shortcuts"><button className="quiet-icon" aria-label={`试听第${i+1}句`} title="试听这一句" disabled={!!busy||!line.notes.length} onClick={()=>void s.play({lyricId:line.id})}>▶</button>{p.mode!=='free'&&<button className="quiet-icon" aria-label={`锁定第${i+1}句`} title={line.locked?'解锁这一句':'锁定这一句'} disabled={s.lyricLocked(line.sectionId)} aria-pressed={line.locked} onClick={()=>s.mutate('切换乐句锁定',next=>{next.lyrics.find(l=>l.id===line.id)!.locked=!line.locked})}>{line.locked?'🔒':'♧'}</button>}</div></div><label className="sr-only" htmlFor={`lyric-${line.id}`}>第{i+1}句歌词</label><textarea id={`lyric-${line.id}`} value={line.text} rows={1} maxLength={p.mode==='free'?100:40} disabled={p.mode==='free'||line.locked||s.lyricLocked(line.sectionId)} onChange={e=>s.editLyric(line.id,e.target.value)}/>{p.mode==='free'?<button aria-label={`编辑第${i+1}句旋律`} onClick={()=>openEditor(line.id)}>✎ 编辑旋律</button>:<><button disabled={!!busy||line.locked||s.lyricLocked(line.sectionId)||line.notes.some(n=>n.locked)} onClick={()=>s.rewriteMelody(line.id)}>↻ 只改这句旋律</button></>}</article>)}</div>

    {editor&&p.mode==='free'&&<div id="phrase-editor"><button className="minibtn editor-close" onClick={()=>setEditor(undefined)}>收起旋律编辑</button><PianoRoll project={p} selectedLineId={editor} onChange={s.change} onPreview={id=>void s.play({lyricId:id})} busy={!!busy}/></div>}
    <details className="singing-details" open={voiceOpen} onToggle={e=>setVoiceOpen(e.currentTarget.open)}><summary>逐句演唱与重唱</summary>{voiceOpen&&<QixuanPanel project={p} onChange={next=>s.recordChange(next,'制作逐句演唱')} onPreview={id=>void s.play({lyricId:id})} busy={!!busy}/>}</details>
    <MixControls project={p} onChange={s.change} onPreview={stem=>void s.play({stem})} onStop={s.stop} busy={!!busy} playing={playing}/>
   </section>
   </div>
   </div></div></div></div>

   <MvAct/>
   <div className="act-pin mv-pin"><section className="chapter-mv" id="pv" aria-label="歌词 PV">
    <div className="mv-marquee" aria-hidden="true"><div>{[0,1].map(k=><span key={k}>★ NOW SHOWING ★ 你的第一支歌词 MV ★ LYRIC VIDEO ★ 字幕跟着音乐走 ★ NOW SHOWING ★ 你的第一支歌词 MV ★ LYRIC VIDEO ★ 字幕跟着音乐走 </span>)}</div></div>
    <div className="mv-inner">
     <header className="mv-head"><span className="mv-kicker">CHAPTER 03 · 🎬 LYRIC VIDEO</span><h2>好啦，给这首歌<br/>加个 <em>MV！</em></h2><p>歌词字幕逐句出现 · 音乐与画面同步</p></header>
     <div className="mv-stage">
      <div className="mv-film"><span className="mv-sticker" aria-hidden="true">● REC</span><div className="mv-screen"><Landscape project={p} time={time}/></div></div>
      <div className="mv-bar"><button id="pvplay" className="mv-play" disabled={!!busy} onClick={()=>playing?s.stop():void s.play()}>{playing?'Ⅱ 暂停放映':'▶ 播放音乐与字幕'}</button><span className="mv-time">{clock(time)} / {clock(length)}</span><input type="range" aria-label="PV 进度" min={0} max={length} step={.05} value={Math.min(time,length)} onChange={e=>s.seek(Number(e.target.value))}/></div>
     </div>
     <div className="mv-options">
      <p className="mv-options-title">原创程序化画面 · 同步字幕</p>
      <div className="mv-option-row"><label>字幕样式 <select aria-label="字幕样式" value={p.subtitleStyle} onChange={e=>s.mutate('调整字幕样式',next=>{next.subtitleStyle=e.target.value as SubtitleStyle})}><option value="cinema">电影</option><option value="poster">海报</option><option value="minimal">简约</option></select></label><button className="minibtn" onClick={()=>s.mutate('替换画面配色',next=>{next.visualScenes=next.visualScenes.map(v=>({...v,theme:(v.theme+1)%4}))})}>换一组画面色彩</button></div>
      <button className="btn mv-export" disabled={!!busy||(!api.mock&&!s.health.ffmpeg)} onClick={()=>void s.exportPV()}>{api.mock?'模拟导出 MP4':'导出 MP4'}</button>
      <ExportLoudnessReport report={s.exportReport}/><p className="export-status">{api.mock?'MOCK：下载 JSON 测试回执，未运行 FFmpeg，不生成 MP4。':s.health.ffmpeg?'本机 FFmpeg 已配置；导出使用当前工程音轨。':'MP4 需要本机 FFmpeg；仍可导出 WAV 与工程。'}</p>
     </div>
    </div>
   </section></div>

  </main>
  <footer className="footer"><span>LOOP! MUSIC PLAYGROUND / CantaLoom</span><span>BUILT FOR LITTLE IDEAS, 2026</span></footer>

  <dialog ref={exportRef} className="export-modal" aria-label="导出作品" onCancel={()=>s.setExportOpen(false)} onClose={()=>{s.setExportOpen(false);exportTrigger.current?.focus()}} onClick={e=>{if(e.target===e.currentTarget)s.setExportOpen(false)}}><div className="pvtop"><h2>把声音，带走。</h2><button aria-label="关闭导出" onClick={()=>s.setExportOpen(false)}>×</button></div><p>工程只保存在当前浏览器。导出 JSON 可在以后恢复。</p><button className="btn" disabled={!!busy} onClick={()=>void s.exportWav()}>混音音频 · {api.mock?'MOCK 测试音 ':''}WAV ↓</button><button className="btn" disabled={!!busy||(!api.mock&&!s.health.ffmpeg)} onClick={()=>void s.exportPV()}>歌词视频 PV · {api.mock?'MOCK JSON 回执':'MP4'} ↓</button><button className="btn" onClick={s.saveProject}>完整工程 · JSON ↓</button><button className="minibtn" onClick={()=>s.importRef.current?.click()}>导入工程</button><button className="minibtn" onClick={()=>{if(window.confirm('新建会替换当前浏览器存档，请先导出需要保留的工程。')){setEditor(undefined);s.newProject();go('compose')}}}>新建作品</button><p>{s.llmLabel} · {api.mock?'测试音，未运行歌声模型':p.vocalMode==='external'?'当前有效演唱':'元音演示，不会读出中文歌词'}</p><ExportLoudnessReport report={s.exportReport}/><ArtifactDownloads project={p} busy={!!busy}/><p className="dialog-status" role="status">{busy||s.toast}</p></dialog>
  <input type="file" ref={s.importRef} accept=".json" hidden onChange={e=>void s.importProject(e.target.files?.[0])}/>
  {s.toast&&!s.exportOpen&&<div className="toast" role="status">{s.toast}<button aria-label="关闭提示" onClick={()=>s.setToast('')}>×</button></div>}{busy&&!s.exportOpen&&<div className="busy-banner" role="status">{busy}{busy.includes('PV')&&api.mock?' · MOCK 导出状态测试':''}</div>}
 </div>;
}
