import {useEffect,useRef,type RefObject} from 'react';

// Progress (0–1) of scrolling through a tall block whose inner stage is pinned with position:sticky.
// The callback runs at most once per frame (also after focus moves, so covers can open for keyboard users);
// with "reduce motion" it receives null so the caller can show its still version.
export function useStickyProgress(ref:RefObject<HTMLElement|null>,onProgress:(p:number|null,el:HTMLElement)=>void){
 const latest=useRef(onProgress);latest.current=onProgress;
 useEffect(()=>{
  const el=ref.current;if(!el)return;
  const still=matchMedia('(prefers-reduced-motion: reduce)');
  let frame=0;
  const update=()=>{
   frame=0;
   if(still.matches){latest.current(null,el);return}
   const box=el.getBoundingClientRect(),range=box.height-innerHeight;
   latest.current(range>0?Math.min(1,Math.max(0,-box.top/range)):0,el);
  };
  const schedule=()=>{if(!frame)frame=requestAnimationFrame(update)};
  update();addEventListener('scroll',schedule,{passive:true});addEventListener('resize',schedule);addEventListener('focusin',schedule);still.addEventListener('change',schedule);
  return()=>{cancelAnimationFrame(frame);removeEventListener('scroll',schedule);removeEventListener('resize',schedule);removeEventListener('focusin',schedule);still.removeEventListener('change',schedule)};
 },[ref]);
}
