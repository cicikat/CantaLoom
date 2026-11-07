import {useEffect,useRef,type CSSProperties} from 'react';

// Chapter 2 opener: rings rise with the scroll, fill the screen, and "Music Blocks" holds before the workbench.
// --p (0–1) is the scroll progress through this tall block; all motion is derived from it in CSS.
const rings=['var(--yellow)','var(--orange)','var(--mint)','var(--blue)','var(--violet)'];
const blocks=[['B','var(--yellow)'],['l','var(--mint)'],['o','var(--orange)'],['c','var(--blue)'],['k','var(--off)'],['s','#f2b8d8']];
export function ChapterBridge(){
 const ref=useRef<HTMLDivElement>(null);
 useEffect(()=>{
  const el=ref.current;if(!el)return;
  const still=matchMedia('(prefers-reduced-motion: reduce)');
  let frame=0;
  const update=()=>{
   frame=0;
   if(still.matches){el.style.removeProperty('--p');el.classList.add('is-titled','is-filled');return}
   const box=el.getBoundingClientRect(),range=box.height-innerHeight,p=range>0?Math.min(1,Math.max(0,-box.top/range)):0;
   el.style.setProperty('--p',p.toFixed(4));el.classList.toggle('is-titled',p>.42);el.classList.toggle('is-filled',p>=.48);
  };
  const schedule=()=>{if(!frame)frame=requestAnimationFrame(update)};
  update();addEventListener('scroll',schedule,{passive:true});addEventListener('resize',schedule);still.addEventListener('change',schedule);
  return()=>{cancelAnimationFrame(frame);removeEventListener('scroll',schedule);removeEventListener('resize',schedule);still.removeEventListener('change',schedule)};
 },[]);
 return <div className="chapter-bridge" ref={ref} aria-hidden="true"><div className="bridge-stage">
  {rings.map((color,i)=><span className="bridge-ring" key={i} style={{'--i':i,'--c':color} as CSSProperties}/>)}
  <div className="bridge-title">
   <p className="bridge-kicker">CHAPTER 02 · 音乐积木工作台</p>
   <p className="bridge-word"><span className="bridge-music">{Array.from('Music').map((ch,j)=><span key={j} style={{'--j':j} as CSSProperties}>{ch}</span>)}</span><span className="bridge-blocks">{blocks.map(([ch,color],j)=><span key={j} style={{'--j':j+5,'--c':color,'--r':`${j%2?5:-6}deg`} as CSSProperties}>{ch}</span>)}</span></p>
   <span className="bridge-steps">{Array.from({length:8},(_,k)=><i key={k} style={{'--k':k} as CSSProperties}/>)}</span>
   <p className="bridge-hint">↓ 继续往下，开始搭积木</p>
  </div>
 </div></div>;
}
