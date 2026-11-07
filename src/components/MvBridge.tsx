import {useEffect,useLayoutEffect,useRef,useState,type CSSProperties} from 'react';
import {useStickyProgress} from '../hooks/useStickyProgress';
import {Planks} from './ChapterBridge';

// Workbench → MV: the block planks slide back over the workbench, "Let's go together" rolls over to
// "Let's make a music video" letter by letter, then the dark text block grows until it becomes the MV theatre.
// --q (0–1) is the scroll progress through this tall block; --f (0–1) is how far the block has grown.
const PHRASES=['go together','make a music video'] as const;
// Planks start once the cards have moved a third of a screen up (CSS, q ≈ .135) and are all in by q ≈ .44.
const SAY=.47,SWAP=.68,FILL=.8,HOLD_MS=2000;
type Stage=0|1|2;
type Say={stage:Stage;run:number;out:Stage|null;fromIdle:boolean};

function Phrase({tone,mode}:{tone:1|2;mode:'in'|'out'}){
 return <span className={`say-phrase is-${mode}`} data-phrase={tone}>{Array.from(PHRASES[tone-1]).map((ch,i)=>ch===' '?<span key={i} className="say-gap"/>:<span key={i} className="say-ch" style={{'--i':i} as CSSProperties}>{ch}</span>)}</span>;
}

export function MvBridge(){
 const ref=useRef<HTMLDivElement>(null),block=useRef<HTMLSpanElement>(null),now=useRef<HTMLSpanElement>(null);
 const [say,setSay]=useState<Say>({stage:0,run:0,out:null,fromIdle:true});
 const stage=useRef<Stage>(0),timer=useRef(0);
 const toStage=(next:Stage)=>{
  if(stage.current===next)return;
  const from=stage.current;stage.current=next;clearTimeout(timer.current);
  if(next===1)timer.current=window.setTimeout(()=>toStage(2),HOLD_MS);
  setSay(s=>({stage:next,run:next?s.run+1:s.run,out:from&&next?from:null,fromIdle:from===0}));
 };
 useEffect(()=>()=>clearTimeout(timer.current),[]);

 useStickyProgress(ref,(q,el)=>{
  if(q===null){el.style.removeProperty('--q');el.style.removeProperty('--f');el.classList.remove('is-filling');toStage(2);return}
  const f=Math.min(1,Math.max(0,(q-FILL)/(.96-FILL)));
  // Scale the block's fill so it covers the whole screen from wherever the block sits.
  if(f>0&&block.current){const r=block.current.getBoundingClientRect(),cx=r.left+r.width/2,cy=r.top+r.height/2;el.style.setProperty('--fs',(Math.max(2*Math.max(cx,innerWidth-cx)/r.width,2*Math.max(cy,innerHeight-cy)/r.height)*1.2).toFixed(3))}
  el.style.setProperty('--q',q.toFixed(4));el.style.setProperty('--f',f.toFixed(4));el.classList.toggle('is-filling',f>0);
  if(q<SAY)toStage(0);else if(q>=SWAP)toStage(2);else if(stage.current===0)toStage(1);
 });

 // The coloured block follows the width of the new phrase; the CSS transition makes the resize smooth.
 useLayoutEffect(()=>{
  const b=block.current,n=now.current;if(!b||!n)return;
  const fit=()=>b.style.setProperty('--w',`${n.offsetWidth}px`);
  if(say.fromIdle){b.style.transition='none';fit();void b.offsetWidth;b.style.transition=''}else fit();
  const watch=new ResizeObserver(fit);watch.observe(n);return()=>watch.disconnect();
 },[say.run,say.fromIdle]);

 const tone=say.stage===2?2:1;
 return <div className={`mv-bridge${say.stage?' is-say':''}${say.stage===2?' is-swapped':''}`} ref={ref} aria-hidden="true"><div className="say-stage">
  <Planks className="say-planks"/>
  <p className="say-line">
   <span className="say-lets">Let's</span>
   <span className={`say-block tone-${tone}`} ref={block}>
    {say.out&&<span className="say-was" key={`out-${say.run}`}><Phrase tone={say.out as 1|2} mode="out"/></span>}
    <span className="say-now" ref={now}><Phrase key={say.run} tone={tone} mode="in"/></span>
   </span>
  </p>
  <p className="say-hint">↓ 继续往下，进入 MV 放映厅</p>
 </div></div>;
}
