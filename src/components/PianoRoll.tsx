import {useEffect,useRef,useState,type PointerEvent} from 'react';
import {LockKeyhole,Unlock,Play,RefreshCw} from 'lucide-react';
import type {SongProject,Note,Lyric} from '../model';
import {usePhraseEditor} from '../hooks/usePhraseEditor';
import {currentVocalAsset} from '../external-audio';
import {api} from '../api/client';
import './piano-roll.css';

const pitchName=(midi:number)=>`${['C','C♯','D','D♯','E','F','F♯','G','G♯','A','A♯','B'][midi%12]}${Math.floor(midi/12)-1}`;
const roundBeat=(value:number)=>Math.round(value*8)/8;
function NoteForm({note,line,locked,onEdit}:{note:Note;line:Lyric;locked:boolean;onEdit:(patch:Partial<Note>)=>void}){
 const [pitch,setPitch]=useState(String(note.midi)),[at,setAt]=useState(String(note.beat-line.start)),[length,setLength]=useState(String(note.duration));
 return <form className="note-inspector" onSubmit={e=>{e.preventDefault();const patch:Partial<Note>={};if(Number(pitch)!==note.midi)patch.midi=Number(pitch);if(Number(at)!==note.beat-line.start)patch.beat=line.start+Number(at);if(Number(length)!==note.duration)patch.duration=Number(length);if(Object.keys(patch).length)onEdit(patch)}}>
  <h3>选中的音符 <span>{note.syllable==='+'?'延音':note.syllable}</span></h3>
  <label>音高 <input aria-label="选中音符音高" type="number" min={48} max={84} step={1} required disabled={locked||note.locked} value={pitch} onChange={e=>setPitch(e.target.value)}/><small>{Number.isInteger(Number(pitch))?pitchName(Number(pitch)):''} · 60 是中央 C</small></label>
  <label>句内位置（拍） <input aria-label="选中音符位置" type="number" min={0} step="any" required disabled={locked||note.locked} value={at} onChange={e=>setAt(e.target.value)}/></label>
  <label>长度（拍） <input aria-label="选中音符长度" type="number" min={.125} max={16} step="any" required disabled={locked||note.locked} value={length} onChange={e=>setLength(e.target.value)}/></label>
  <button type="submit" className="button light small" disabled={locked||note.locked}>保存音符修改</button>
  <button type="button" className="text-button" disabled={locked} onClick={()=>onEdit({locked:!note.locked})}>{note.locked?<LockKeyhole size={14}/>:<Unlock size={14}/>} {note.locked?'解锁这个音符':'锁定这个音符'}</button>
 </form>;
}
export function PianoRoll({project:p,onChange,onPreview,busy}:{project:SongProject;onChange:(p:SongProject)=>void;onPreview:(id:string)=>void;busy:boolean}){
 const editor=usePhraseEditor(p,onChange),line=editor.line,note=editor.note;
 const drag=useRef<{id:string;x:number;y:number;beat:number;midi:number;duration:number;resize:boolean;pointerId:number;scale:number}|undefined>(undefined);
 const [ghost,setGhost]=useState<{id:string;beat:number;midi:number;duration:number}>();
 const grid=useRef<HTMLDivElement>(null),[available,setAvailable]=useState(0);
 useEffect(()=>{drag.current=undefined;setGhost(undefined)},[p,line?.id]);
 useEffect(()=>{const element=grid.current;if(!element)return;const update=()=>setAvailable(element.clientWidth-48);update();const observer=new ResizeObserver(update);observer.observe(element);return()=>observer.disconnect()},[line?.id]);
 if(!line||!note)return null;
 const low=Math.max(48,Math.min(60,...line.notes.map(n=>n.midi))-3),high=Math.min(84,Math.max(72,...line.notes.map(n=>n.midi))+3),row=20,unit=52;
 const span=line.end-line.start,width=Math.max(520,span*unit,available),scale=width/span;
 let ready=false;try{currentVocalAsset(p,line);ready=p.vocalMode==='external'}catch{/* Only the edited sentence needs a new vocal. */}
 function start(e:PointerEvent<HTMLElement>,n:Note,resize=false){
  editor.selectNote(n.id);if(!resize)e.currentTarget.focus();if(editor.locked||n.locked||e.button!==0||drag.current)return;
  e.preventDefault();e.currentTarget.setPointerCapture(e.pointerId);drag.current={id:n.id,x:e.clientX,y:e.clientY,beat:n.beat,midi:n.midi,duration:n.duration,resize,pointerId:e.pointerId,scale};
 }
 function move(e:PointerEvent<HTMLElement>){const d=drag.current;if(!d||e.pointerId!==d.pointerId)return;const delta=roundBeat((e.clientX-d.x)/d.scale);
  setGhost({id:d.id,beat:d.resize?d.beat:d.beat+delta,midi:d.resize?d.midi:Math.max(48,Math.min(84,d.midi-Math.round((e.clientY-d.y)/row))),duration:d.resize?Math.max(.125,Math.min(16,d.duration+delta)):d.duration});
 }
 function finish(e:PointerEvent<HTMLElement>){const d=drag.current;drag.current=undefined;if(d&&ghost?.id===d.id&&e.pointerId===d.pointerId)editor.edit(d.id,d.resize?{duration:ghost.duration}:{beat:ghost.beat,midi:ghost.midi});setGhost(undefined)}
 return <section className="piano-roll" aria-label="单句钢琴卷帘">
  <div className="piano-roll-heading"><div><h2>一句旋律，慢慢雕。</h2><p>横着看拍子，竖着看音高。拖动音符改变位置与音高，拖右侧小柄调整长度；也可以填写数值。</p></div><span className="demo-badge">{api.mock?'MOCK 旋律编辑':'单句旋律编辑'}</span></div>
  <div className="phrase-tabs" aria-label="选择乐句">{p.lyrics.map((l,i)=><button key={l.id} className={l.id===line.id?'selected':''} onClick={()=>editor.selectLine(l.id)}>第 {i+1} 句 {l.locked?'🔒':''}<span>{l.text}</span></button>)}</div>
  <div className="phrase-toolbar"><b>{line.text}</b><label className="piano-note-select">音符 <select aria-label="选择音符" value={note.id} onChange={e=>editor.selectNote(e.target.value)}>{line.notes.map((n,i)=><option value={n.id} key={n.id}>{i+1} · {n.syllable} · {pitchName(n.midi)}{n.locked?' · 已锁定':''}</option>)}</select></label><button type="button" className="text-button" onClick={editor.toggleLock}>{editor.locked?<LockKeyhole size={14}/>:<Unlock size={14}/>} {line.locked?'解锁这一句':'锁定这一句'}</button><button type="button" className="text-button" disabled={!ready||busy} onClick={()=>onPreview(line.id)}><Play size={14}/> 试听当前演唱</button></div>
  <div className="piano-roll-layout"><div ref={grid} className="piano-scroll" tabIndex={0} aria-label="音高与拍子网格"><div className="piano-canvas" style={{width:width+48,height:(high-low+1)*row+26}}>
   <div className="piano-ruler" style={{width,left:48}}>{Array.from({length:Math.ceil(span)},(_,i)=><span key={i} style={{left:i*scale}}>第 {i+1} 拍</span>)}</div>
   {Array.from({length:high-low+1},(_,i)=>{const midi=high-i;return <div className={`piano-row ${[1,3,6,8,10].includes(midi%12)?'black-key':''}`} style={{top:26+i*row,height:row}} key={midi}><span>{pitchName(midi)}</span></div>})}
   <div className="piano-beats" style={{left:48,top:26,width,height:(high-low+1)*row,backgroundSize:`${scale}px 100%`}}/>
   {line.notes.map((n,i)=>{const display=ghost?.id===n.id?ghost:n;return <div className={`piano-note ${n.id===note.id?'selected':''} ${n.locked?'locked':''}`} key={n.id} style={{left:48+(display.beat-line.start)*scale,top:26+(high-display.midi)*row+2,width:Math.max(9,display.duration*scale),height:row-4}}>
    <button type="button" aria-label={`音符${i+1} ${n.syllable} ${pitchName(n.midi)}`} aria-pressed={n.id===note.id} className="piano-note-body" onFocus={()=>editor.selectNote(n.id)} onPointerDown={e=>start(e,n)} onPointerMove={move} onPointerUp={finish} onPointerCancel={()=>{drag.current=undefined;setGhost(undefined)}} onClick={()=>editor.selectNote(n.id)} onKeyDown={e=>{if(editor.locked||n.locked)return;let patch:Partial<Note>|undefined;if(e.key==='ArrowUp')patch={midi:n.midi+1};if(e.key==='ArrowDown')patch={midi:n.midi-1};if(e.key==='ArrowLeft')patch=e.shiftKey?{duration:n.duration-.125}:{beat:n.beat-.125};if(e.key==='ArrowRight')patch=e.shiftKey?{duration:n.duration+.125}:{beat:n.beat+.125};if(patch){e.preventDefault();editor.edit(n.id,patch)}}}>{n.locked?'◆ ':''}{n.syllable}</button>
    {!editor.locked&&!n.locked&&<button type="button" tabIndex={-1} aria-label={`调整音符${i+1}长度`} className="piano-note-resize" onPointerDown={e=>start(e,n,true)} onPointerMove={move} onPointerUp={finish} onPointerCancel={()=>{drag.current=undefined;setGhost(undefined)}}/>}
   </div>})}
  </div></div><NoteForm key={`${p.id}:${line.id}:${line.version}:${note.id}`} note={note} line={line} locked={editor.locked} onEdit={patch=>editor.edit(note.id,patch)}/></div>
  <p className="piano-help">音符可用方向键微调；Shift＋左右键改长度。交换音符的时间顺序会重新对齐歌词，锁定音符不会被改写。</p>
  <div className="phrase-generate"><label>这一句想怎样变化？<input aria-label="局部旋律要求" maxLength={500} value={editor.intent} onChange={e=>editor.setIntent(e.target.value)} placeholder="例如：前半句轻一点，最后一个字拉长"/></label><button className="button dark small" disabled={editor.working||editor.locked||busy||!editor.intent.trim()||line.notes.every(n=>n.locked)} onClick={()=>void editor.regenerate()}><RefreshCw size={14}/> {editor.working?'正在重作这一句':'只重作这一句'}</button>{editor.working&&<button className="text-button" onClick={()=>editor.cancel()}>停止等待</button>}</div>
  <p className="phrase-status" role="status">{editor.message}</p><small>{ready?'当前演唱与这句旋律一致。':'修改后的这句需要在下方重新演唱；其他句与伴奏保留。'}{api.mock?' Mock 为两版固定测试旋律；部分音符锁定时保留整句，未调用模型。':''}</small>
 </section>;
}
