import {useRef,type CSSProperties} from 'react';
import {useStickyProgress} from '../hooks/useStickyProgress';

// Chapter 2 opener: rings rise with the scroll and fill the screen, "Music Blocks" holds on a wall of block planks,
// then the planks are pulled out like drawers to reveal the workbench lying underneath.
// --p (0–1) is the scroll progress through this tall block; the ring motion is derived from it in CSS.
const rings=['var(--yellow)','var(--orange)','var(--mint)','var(--blue)','var(--violet)'];
const blocks=[['B','var(--yellow)'],['l','var(--mint)'],['o','var(--orange)'],['c','var(--blue)'],['k','var(--off)'],['s','#f2b8d8']];
// Seven planks stacked top to bottom: [pull order, side it slides toward (-1 left / 1 right)].
const PLANKS=[[2,-1],[5,1],[0,-1],[4,1],[1,-1],[6,1],[3,-1]] as const;

export function Planks({className}:{className:string}){
 return <div className={`planks ${className}`}>{PLANKS.map(([o,dir],i)=><span className="plank" key={i} style={{'--i':i,'--o':o,'--dir':dir} as CSSProperties}/>)}</div>;
}

export function ChapterBridge(){
 const ref=useRef<HTMLDivElement>(null);
 useStickyProgress(ref,(p,el)=>{
  if(p===null){el.style.removeProperty('--p');el.classList.add('is-titled','is-filled');el.classList.remove('is-open');return}
  // The workbench starts beneath the last screen of this block; once its top reaches the top of the screen the planks are pulled.
  // They only slam back after scrolling well back up (not on a small nudge), and stay out while focus is inside the workbench.
  const bench=el.nextElementSibling,top=bench?.getBoundingClientRect().top??Infinity;
  const open=p>=.48&&(top<=2||(el.classList.contains('is-open')&&top<innerHeight*.75)||(!!bench?.contains(document.activeElement)&&top<innerHeight));
  el.style.setProperty('--p',p.toFixed(4));el.classList.toggle('is-titled',p>.42);el.classList.toggle('is-filled',p>=.48);el.classList.toggle('is-open',open);
 });
 return <div className="chapter-bridge" ref={ref} aria-hidden="true"><div className="bridge-stage">
  {rings.map((color,i)=><span className="bridge-ring" key={i} style={{'--i':i,'--c':color} as CSSProperties}/>)}
  <Planks className="bridge-planks"/>
  <div className="bridge-title">
   <p className="bridge-kicker">CHAPTER 02 · 音乐积木工作台</p>
   <p className="bridge-word"><span className="bridge-music">{Array.from('Music').map((ch,j)=><span key={j} style={{'--j':j} as CSSProperties}>{ch}</span>)}</span><span className="bridge-blocks">{blocks.map(([ch,color],j)=><span key={j} style={{'--j':j+5,'--c':color,'--r':`${j%2?5:-6}deg`} as CSSProperties}>{ch}</span>)}</span></p>
   <span className="bridge-steps">{Array.from({length:8},(_,k)=><i key={k} style={{'--k':k} as CSSProperties}/>)}</span>
   <p className="bridge-hint">↓ 继续往下，把积木抽开</p>
  </div>
 </div></div>;
}
