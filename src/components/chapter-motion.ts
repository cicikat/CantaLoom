// Pure timing helpers for the scroll-driven chapter transitions (ChapterActs).
// Scroll drives the circles; entering Let's and scrolling on to MV start self-running animations.

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
 * - intro: original 280vh opener overlapping the preceding screen, leaving 180vh of scroll (0–1)
 * - story: any additional text choreography after the original opener and its one-screen hold
 * - reveal: the curtain being pulled down over the pinned page underneath, 0–1
 */
export function actProgress(trackTop:number,trackHeight:number,stageHeight:number,pinTop:number,reveal:number){
 const textLength=Math.max(1,trackHeight-stageHeight-reveal);
 const introLength=Math.min(textLength,stageHeight*1.8);
 return {intro:clamp(-trackTop/introLength),story:clamp((-trackTop-introLength)/Math.max(1,textLength-introLength)),reveal:reveal>0?clamp(-pinTop/reveal):pinTop<=0?1:0};
}

export const PHRASE_HOLD_MS=1200,PHRASE_SWAP_MS=1600;
/** Enter once, let the first phrase land, then finish the swap even with no more scroll events.
 * Scrolling out resets it; a fast jump to the closing curtain settles it and leaves no animation loop behind. */
export function phraseFrame(intro:number,now:number,startedAt:number|null,finish=false){
 if(intro<=.34)return {startedAt:null,progress:0,running:false};
 let start=startedAt??(intro>.42?now:null);
 if(start===null)return {startedAt:null,progress:0,running:false};
 if(finish)start=Math.min(start,now-PHRASE_HOLD_MS-PHRASE_SWAP_MS);
 const progress=span(now-start,PHRASE_HOLD_MS,PHRASE_HOLD_MS+PHRASE_SWAP_MS);
 return {startedAt:start,progress,running:progress<1};
}

export const MV_EXIT_MS=1800;
/** One downward gesture plays the whole close/fill/reveal sequence; an upward gesture reverses it. */
export function mvExitFrame(previous:number,target:0|1,elapsed:number){
 const progress=clamp(previous+(target?1:-1)*Math.max(0,elapsed)/MV_EXIT_MS);
 return {progress,join:easeInOut(span(progress,0,.18)),expand:easeInOut(span(progress,.18,.56)),reveal:easeInOut(span(progress,.56,1)),running:progress!==target};
}

/** Local 0–1 progress of letter `i` inside a staggered cascade that is `m` (0–1) of the way through. */
export function cascade(m:number,i:number,start:number,stagger:number,duration:number,total:number){
 return clamp((m*total-(start+i*stagger))/duration);
}
