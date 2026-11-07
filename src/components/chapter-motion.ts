// Pure timing helpers for the scroll-driven chapter transitions (ChapterActs).
// Every value is a function of scroll position, so scrolling back up replays the same frames in reverse.

export const clamp=(v:number,lo=0,hi=1)=>Math.min(hi,Math.max(lo,v));
/** 0 before `from`, 1 after `to`, linear in between. */
export const span=(p:number,from:number,to:number)=>clamp((p-from)/(to-from));
export const lerp=(a:number,b:number,t:number)=>a+(b-a)*t;
export const easeInOut=(t:number)=>t<.5?4*t*t*t:1-(-2*t+2)**3/2;
export const easeOut=(t:number)=>1-(1-t)**3;
/** Overshoots a little before settling: the "lands with a bounce" curve. */
export const easeBack=(t:number,s=1.6)=>t<=0?0:t>=1?1:1+(s+1)*(t-1)**3+s*(t-1)**2;

/**
 * Progress through a scroll "act": a tall track whose 100vh stage is pinned with position:sticky,
 * followed by a pinned page whose curtain is pulled away during the last `reveal` pixels.
 * - enter: the stage rising from the bottom of the screen (0) to the top (1)
 * - text:  the pinned text page, 0–1
 * - reveal: the curtain being pulled down over the pinned page underneath, 0–1
 * - lead:  enter and text as one run, 0 when the stage peeks in at the bottom and 1 when the text page ends
 */
export function actProgress(trackTop:number,trackHeight:number,stageHeight:number,pinTop:number,reveal:number){
 const textLength=Math.max(1,trackHeight-stageHeight-reveal);
 return {enter:clamp(1-trackTop/stageHeight),text:clamp(-trackTop/textLength),reveal:reveal>0?clamp(-pinTop/reveal):pinTop<=0?1:0,lead:clamp((stageHeight-trackTop)/(stageHeight+textLength))};
}

/**
 * A disc rising from below the bottom centre of the screen and growing until it covers the whole screen.
 * Coordinates are viewport pixels; `radius` is the full-size radius, `t` 0–1.
 */
export function ringFrame(t:number,width:number,height:number,radius:number){
 const e=easeInOut(t),scale=lerp(.45,1,e);
 return {x:width/2,y:lerp(height+radius*.45,height/2,e),scale};
}
/** Radius that covers the whole screen from its centre, plus the border. */
export const coverRadius=(width:number,height:number)=>Math.hypot(width/2,height/2)+6;

/** Scroll decides which phrase should show; the gap between `off` and `on` stops it from flickering at the edge. */
export const swapTarget=(p:number,previous:0|1,on:number,off:number):0|1=>p>=on?1:p<=off?0:previous;

/**
 * The phrase swap plays on its own clock so letters never freeze half blurred, but scroll keeps it honest:
 * before `ready` it is held at 0 and after `done` it is forced to 1, so a fast fling can't leave it behind.
 */
export function stepSwap(m:number,target:0|1,dt:number,duration:number,p:number,ready:[number,number],done:[number,number]){
 const moved=target?Math.min(1,m+dt/duration):Math.max(0,m-dt/duration);
 return clamp(moved,span(p,done[0],done[1]),span(p,ready[0],ready[1]));
}

/** Local 0–1 progress of letter `i` inside a staggered cascade that is `m` (0–1) of the way through. */
export function cascade(m:number,i:number,start:number,stagger:number,duration:number,total:number){
 return clamp((m*total-(start+i*stagger))/duration);
}
