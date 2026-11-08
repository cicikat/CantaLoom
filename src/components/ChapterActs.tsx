import {memo,useEffect,useRef,type CSSProperties,type RefObject} from 'react';
import {actProgress,BENCH_REVEAL_MS,cascade,chapterGestureGate,CIRCLE_ENTRY_MS,easeInOut,easeOut,lerp,mvExitFrame,phraseFrame,span,timedProgress,WORKBENCH_REST_MS,workbenchGestureAction} from './chapter-motion';

// Two scroll "acts" sit between the three content chapters:
//   hero → BenchAct ("Music Blocks") → workbench → MvAct ("Let's …") → MV theatre.
// Each act is a tall track whose 100vh stage is pinned with position:sticky. The page right after it is wrapped in
// `.act-pin`, which pins that page underneath the stage during the act's last stretch, so the curtain can be pulled
// down to reveal it in place. Scroll triggers each phase; titles, the letter swap and the MV exit finish on their own clocks,
// so stopping the scroll never leaves a title half assembled. Scrolling back resets the opener. Only transforms, opacity and the
// one text block's size change per frame; nothing in the content chapters is covered once its curtain is gone.

type Act=ReturnType<typeof actProgress>;
type Gesture={down:boolean;up:boolean;entering:boolean;navigating:boolean};
interface Scene{measure():void;draw(act:Act|null,now:number,gesture:Gesture):boolean}

const NAVIGATION_EVENT='songyu:chapter-navigation';
let navigation:{top:number;until:number}|null=null;

/** Writes a style value only when it changed, so idle scroll frames touch nothing. */
function writer(){
 const last=new Map<HTMLElement,Record<string,string>>();
 return (el:HTMLElement,prop:string,value:string)=>{
  const seen=last.get(el)??{};if(seen[prop]===value)return;seen[prop]=value;last.set(el,seen);el.style.setProperty(prop,value);
 };
}
type Put=ReturnType<typeof writer>;
const move=(x:number,y:number)=>`translate3d(${x.toFixed(1)}px,${y.toFixed(1)}px,0)`;

/** Original 1f2c3d8 opener: the CSS owns the rings' geometry and title's timed pop, scroll only sets --p. */
function discs(stage:HTMLElement,put:Put){
 return {
  draw(p:number,reveal:number){
   put(stage,'--p',p.toFixed(4));
   stage.classList.toggle('is-covered',p>=.48);
   stage.classList.toggle('is-titled',p>.42);
   stage.classList.toggle('is-active',p>.42&&reveal<1);
  },
 };
}
const Discs=({colors}:{colors:readonly string[]})=><>{colors.map((c,i)=><span key={i} className="act-ring" style={{'--i':i,'--c':c} as CSSProperties}/>)}</>;
/** Length of the spacer that keeps a page pinned under its curtain (0 when reduced motion removes it). */
function pinReveal(pin:HTMLElement){const after=getComputedStyle(pin,'::after');return after.display==='none'?0:parseFloat(after.height)||0}

function workbenchBounds(){
 const bench=document.querySelector<HTMLElement>('.bench-pin'),next=document.querySelector<HTMLElement>('.act-mv');
 if(!bench||!next)return null;
 const top=bench.getBoundingClientRect().top+scrollY+pinReveal(bench);
 return {top,bottom:Math.max(top,next.getBoundingClientRect().top+scrollY)};
}
const isControl=(target:EventTarget|null)=>target instanceof Element&&!!target.closest('button,input,textarea,select,a,summary,canvas,[contenteditable=true],[role=slider],dialog[open]');
function innerCanScroll(target:EventTarget|null,direction:number){
 for(let node=target instanceof Element?target:null;node&&node!==document.body;node=node.parentElement){
  if(node instanceof HTMLElement&&/(auto|scroll)/.test(getComputedStyle(node).overflowY)&&node.scrollHeight>node.clientHeight+1){
   if(direction>0?node.scrollTop+node.clientHeight<node.scrollHeight-1:node.scrollTop>1)return true;
  }
 }
 return false;
}

function useScrollAct(trackRef:RefObject<HTMLDivElement|null>,build:(track:HTMLDivElement,stage:HTMLDivElement,pin:HTMLElement)=>Scene&{dispose?():void}){
 const buildRef=useRef(build);buildRef.current=build;
 useEffect(()=>{
  const track=trackRef.current,stage=track?.firstElementChild as HTMLDivElement|null,pin=track?.nextElementSibling as HTMLElement|null;
  if(!track||!stage||!pin?.classList.contains('act-pin'))return;
  const motion=matchMedia('(prefers-reduced-motion: reduce)'),scene=buildRef.current(track,stage,pin);
  let frame=0,reveal=0,introLength=0,lastScroll=scrollY,entryProgress=0,entryTarget:0|1=0,entryClock:number|null=null;
  const guardsBottom=track.classList.contains('act-mv');
  let leaveAllowed=false,lastInput=performance.now(),lastMotion=lastInput,previousBounds=workbenchBounds();
  let touchY:number|null=null,touchFresh=false;
  const intent=chapterGestureGate();
  const read=():Act=>{const t=track.getBoundingClientRect();return actProgress(t.top,t.height,stage.offsetHeight,pin.getBoundingClientRect().top,reveal)};
  const tick=(now:number)=>{
   frame=0;
   if(navigation&&(Math.abs(scrollY-navigation.top)<.01||now>=navigation.until))navigation=null;
   const navigating=!!navigation;
   const bounds=workbenchBounds(),wasInContent=previousBounds&&lastScroll>=previousBounds.top-1&&lastScroll<=previousBounds.bottom+1;
   if(!motion.matches&&!navigating&&!leaveAllowed&&entryClock===null&&!track.classList.contains('is-exiting')&&wasInContent&&bounds){
    // Focus, layout changes and touch inertia can move the document without another deliberate gesture.
    if(guardsBottom&&scrollY>bounds.bottom+1&&scrollY<bounds.bottom+introLength)scrollTo({top:Math.floor(bounds.bottom),behavior:'instant'});
    else if(!guardsBottom&&scrollY<bounds.top-1&&scrollY>bounds.top-reveal)scrollTo({top:Math.ceil(bounds.top),behavior:'instant'});
   }
   let act=motion.matches?null:read();
   const down=scrollY>lastScroll+.5,up=scrollY<lastScroll-.5;
   const initialScroll=scrollY;if(down||up)lastMotion=now;
   let entering=false,entryRunning=false;
   if(navigating||!act||act.story>.002||act.reveal>.002||(act.intro===0&&up))entryClock=null;
   else{
    const wasRunning=entryClock!==null;
    if(!wasRunning)entryProgress=act.intro;
    const forward=down&&act.intro>0&&act.intro<1&&(!guardsBottom||leaveAllowed);
    const backward=up&&(wasRunning||(act.intro>0&&act.story<=.002&&act.reveal<=.002));
    if(forward)entryTarget=1;else if(backward)entryTarget=0;
    if(wasRunning||forward||backward){
     entering=true;
     const step=timedProgress(entryProgress,entryTarget,entryClock===null?0:now-entryClock,CIRCLE_ENTRY_MS);
     entryProgress=step.progress;entryRunning=step.running;entryClock=entryRunning?now:null;
     const top=track.getBoundingClientRect().top+scrollY;
     scrollTo({top:Math.ceil(top+introLength*entryProgress),behavior:'instant'});
     act=read();
    }
   }
   track.classList.toggle('is-entering',entryRunning);
   pin.classList.toggle('is-open',!act||act.reveal>=1);
   const protectTop=!guardsBottom&&!leaveAllowed&&!track.classList.contains('is-exiting')&&!!act&&act.reveal>.002;
   const running=scene.draw(act,now,{down:down&&!entering&&!navigating,up:up&&!entering&&!navigating&&!protectTop,entering,navigating});
   if(Math.abs(scrollY-initialScroll)>.5)lastMotion=now;
   lastScroll=scrollY;
   previousBounds=bounds;
   if(!entryRunning&&!track.classList.contains('is-exiting'))leaveAllowed=false;
   if(entryRunning||running)schedule();
  };
  const schedule=()=>{if(!frame)frame=requestAnimationFrame(tick)};
  const guardInput=(event:Event,direction:number,delta:number,repeat=false,freshTouch?:boolean)=>{
   const now=performance.now(),beforeInput=lastInput;lastInput=now;navigation=null;
   if(motion.matches||event.defaultPrevented||track.classList.contains('is-exiting'))return;
   if(!guardsBottom&&direction>0){
    const act=read();
    // Ignore input during the opener; never queue a reveal for when the title finishes.
    if(entryClock!==null||act.intro>=1&&act.reveal<1){
     if(event.cancelable)event.preventDefault();
     if(entryClock===null&&stage.classList.contains('is-ready')&&workbenchGestureAction(0,delta,now,freshTouch===true?now-WORKBENCH_REST_MS:beforeInput,lastMotion,false,repeat||freshTouch===false)==='leave'){
      scrollTo({top:Math.ceil(pin.getBoundingClientRect().top+scrollY)+2,behavior:'instant'});schedule();
     }
     return;
    }
   }
   if(entryClock!==null)return;
   if(direction!==(guardsBottom?1:-1))return;
   const bounds=workbenchBounds();if(!bounds||scrollY<bounds.top-1||scrollY>bounds.bottom+1)return;
   if(innerCanScroll(event.target,direction))return;
   const edge=guardsBottom?bounds.bottom:bounds.top,distance=(edge-scrollY)*direction;
   const sliding=!!document.querySelector('.bench-track[data-view^="to-"],.bench-track[data-view="from-lyrics"]');
   const action=workbenchGestureAction(distance,delta,now,freshTouch===true?now-WORKBENCH_REST_MS:beforeInput,lastMotion,isControl(event.target)||sliding,repeat||freshTouch===false);
   if(action==='content')return;
   if(event.cancelable)event.preventDefault();
   if(action==='leave'){
    leaveAllowed=true;scrollTo({top:Math.round(edge)+direction*2,behavior:'instant'});
   }else{
    leaveAllowed=false;scrollTo({top:guardsBottom?Math.floor(edge):Math.ceil(edge),behavior:'instant'});lastMotion=now;
   }
   schedule();
  };
  const deliberateInput=(event:Event,direction:number,delta:number,threshold=220)=>{
   if(motion.matches||event.defaultPrevented)return true;
   if(entryClock!==null&&direction===(entryTarget?1:-1)){
    intent.reset();if(event.cancelable)event.preventDefault();return false;
   }
   const bounds=workbenchBounds(),act=read(),top=track.getBoundingClientRect().top+scrollY,end=pin.getBoundingClientRect().top+scrollY+reveal;
   // Reaching a transition from normal content first stops at its edge; that scroll is never a chapter command.
   if(direction>0&&scrollY<top-1&&scrollY+delta>=top||direction<0&&scrollY>end+1&&scrollY-delta<=end){
    intent.reset();if(event.cancelable)event.preventDefault();scrollTo({top:direction>0?Math.ceil(top):Math.floor(end),behavior:'instant'});return false;
   }
   const atContentEdge=bounds&&Math.abs(scrollY-(guardsBottom?bounds.bottom:bounds.top))<=1&&direction===(guardsBottom?1:-1);
   const inTransition=scrollY>top+1&&scrollY<end-1||Math.abs(scrollY-top)<=1&&direction>0||Math.abs(scrollY-end)<=1&&direction<0;
   if(innerCanScroll(event.target,direction)||(!atContentEdge&&!inTransition)){
    intent.reset();return true;
   }
   if(isControl(event.target)){
    intent.reset();if(event.cancelable)event.preventDefault();return false;
   }
   const phase=entryClock!==null?'entry':track.classList.contains('is-exiting')?'reveal':act.reveal>=1?'content':act.intro>=1?'title':'intro';
   if(intent.accept(direction,delta,performance.now(),phase,threshold))return true;
   if(event.cancelable)event.preventDefault();return false;
  };
  const wheel=(e:WheelEvent)=>{
   if(e.ctrlKey||Math.abs(e.deltaY)<=.5||Math.abs(e.deltaX)>Math.abs(e.deltaY))return;
   const direction=Math.sign(e.deltaY),delta=Math.abs(e.deltaY)*(e.deltaMode===1?16:e.deltaMode===2?innerHeight:1);
   if(deliberateInput(e,direction,delta))guardInput(e,direction,delta);
  };
  const key=(e:KeyboardEvent)=>{
   if(isControl(e.target)||e.altKey||e.ctrlKey||e.metaKey)return;
   const direction=['ArrowDown','PageDown','End'].includes(e.key)||(e.key===' '&&!e.shiftKey)?1:['ArrowUp','PageUp','Home'].includes(e.key)||(e.key===' '&&e.shiftKey)?-1:0;
   if(direction){
    const delta=e.key.startsWith('Arrow')?40:innerHeight;
    if(e.repeat){if(!deliberateInput(e,direction,0,120))return}
    else if(!deliberateInput(e,direction,delta,120))return;
    guardInput(e,direction,delta,e.repeat||e.key==='Home'||e.key==='End');
   }
  };
  const touchStart=(e:TouchEvent)=>{
   const now=performance.now();touchY=e.touches.length===1?e.touches[0].clientY:null;
   intent.reset();
   touchFresh=workbenchGestureAction(0,1,now,lastInput,lastMotion)==='leave';lastInput=now;navigation=null;
  };
  const touchMove=(e:TouchEvent)=>{
   if(touchY===null||e.touches.length!==1)return;
   const y=e.touches[0].clientY,delta=touchY-y;touchY=y;
   if(Math.abs(delta)>1&&deliberateInput(e,Math.sign(delta),Math.abs(delta),90)){guardInput(e,Math.sign(delta),Math.abs(delta),false,touchFresh);touchFresh=false}
  };
  const touchEnd=()=>{touchY=null;touchFresh=false;lastInput=performance.now()};
  const measure=()=>{reveal=pinReveal(pin);introLength=Math.min(Math.max(1,track.offsetHeight-stage.offsetHeight-reveal),stage.offsetHeight*1.8);scene.measure();schedule()};
  // Keyboard focus landing on a page that is still under its curtain jumps to the end of the reveal.
  const focus=(e:FocusEvent)=>{
   const page=pin.firstElementChild;if(motion.matches||!page?.contains(e.target as Node)||read().reveal>=1)return;
   scrollTo({top:Math.ceil(pin.getBoundingClientRect().top+scrollY+reveal),behavior:'instant'});
  };
  const size=new ResizeObserver(measure);size.observe(stage);
  const workbench=document.querySelector('.chapter-blocks');if(workbench)size.observe(workbench);
  measure();
  addEventListener('scroll',schedule,{passive:true});addEventListener('resize',measure);motion.addEventListener('change',measure);document.addEventListener('focusin',focus);
  addEventListener(NAVIGATION_EVENT,schedule);addEventListener('wheel',wheel,{passive:false});addEventListener('touchstart',touchStart,{passive:true});addEventListener('touchmove',touchMove,{passive:false});addEventListener('touchend',touchEnd);addEventListener('touchcancel',touchEnd);addEventListener('keydown',key);
  void document.fonts?.ready.then(measure);
  return()=>{cancelAnimationFrame(frame);size.disconnect();removeEventListener('scroll',schedule);removeEventListener('resize',measure);motion.removeEventListener('change',measure);document.removeEventListener('focusin',focus);removeEventListener(NAVIGATION_EVENT,schedule);removeEventListener('wheel',wheel);removeEventListener('touchstart',touchStart);removeEventListener('touchmove',touchMove);removeEventListener('touchend',touchEnd);removeEventListener('touchcancel',touchEnd);removeEventListener('keydown',key);scene.dispose?.()};
 },[trackRef]);
}

/** Scroll position that shows a chapter (or an element inside one) with its curtain fully pulled away. */
export function chapterScrollTop(id:string){
 const el=document.getElementById(id);if(!el)return 0;
 const pin=el.closest<HTMLElement>('.act-pin'),top=(n:Element)=>n.getBoundingClientRect().top+scrollY;
 const page=pin?.firstElementChild,reveal=pin?pinReveal(pin):0;
 // Rounded up so the browser's whole-pixel scroll never stops a hair before the curtain is fully open.
 const target=id==='compose'?0:pin&&page?Math.ceil(top(pin)+reveal+(el.getBoundingClientRect().top-page.getBoundingClientRect().top)):top(el);
 navigation={top:target,until:performance.now()+3000};dispatchEvent(new Event(NAVIGATION_EVENT));
 return target;
}

// ---------- Act 1 · original Music Blocks opener, then the violet page pulls down off the workbench ----------
const BLOCKS=[['B','var(--yellow)'],['l','var(--mint)'],['o','var(--orange)'],['c','var(--blue)'],['k','var(--off)'],['s','#f2b8d8']] as const;
const DISCS_1=['var(--yellow)','var(--orange)','var(--mint)','var(--blue)','var(--violet)'] as const;

export const BenchAct=memo(function BenchAct(){
 const track=useRef<HTMLDivElement>(null);
 useScrollAct(track,(el,stage,pin)=>{
  const curtain=stage.querySelector<HTMLElement>('.bench-curtain')!,title=stage.querySelector<HTMLElement>('.act-title')!;
  const put=writer(),ring=discs(stage,put);let H=0,revealLength=0,titleAt:number|null=null,progress=0,target:0|1=0,clock:number|null=null;
  return {
   measure(){H=stage.offsetHeight;revealLength=pinReveal(pin)},
   draw(act,now,{down,up,navigating}){
    const {intro:p,reveal:r}=act??{intro:1,reveal:0},revealTop=pin.getBoundingClientRect().top+scrollY;
    if(!act||p<=.34){progress=0;target=0;clock=null;titleAt=null}
    else if(navigating){progress=r;target=r>=1?1:0;clock=null}
    else{
     if(p>.42)titleAt??=now;
     if(r>=1&&(target===1||progress===0||down)){progress=1;target=1;clock=null}
     else{
      if(up)target=0;
      else if(down&&p>=1&&titleAt!==null&&now-titleAt>=1100)target=1;
     }
    }
    const previous=progress,step=navigating?{progress,running:false}:timedProgress(progress,target,clock===null?0:now-clock,BENCH_REVEAL_MS);
    progress=step.progress;clock=step.running?now:null;
    const drop=easeInOut(span(progress,.3,1));
    put(title,'scale',lerp(1,.92,easeInOut(span(progress,0,.3))).toFixed(4));
    stage.classList.toggle('is-ready',p>=1&&titleAt!==null&&now-titleAt>=1100);
    ring.draw(p,drop);el.classList.toggle('is-exiting',step.running);
    put(curtain,'transform',move(0,drop*(H+120)));
    if(act){
     if(step.running||progress!==previous)scrollTo({top:Math.ceil(revealTop+revealLength*drop),behavior:'instant'});
     pin.classList.toggle('is-open',progress>=1);
    }
    return !!act&&!navigating&&(step.running||titleAt!==null&&now-titleAt<1100);
   },
  };
 });
 return <div className="act act-bench" ref={track} aria-hidden="true"><div className="act-stage">
  <Discs colors={DISCS_1}/>
  <div className="bench-curtain"><div className="act-title">
   <p className="bridge-kicker">CHAPTER 02 · 音乐积木工作台</p>
   <p className="bridge-word"><span className="bridge-music">{Array.from('Music').map((ch,j)=><span key={j} style={{'--j':j} as CSSProperties}>{ch}</span>)}</span><span className="bridge-blocks">{BLOCKS.map(([ch,color],j)=><span key={j} style={{'--j':j+5,'--c':color,'--r':`${j%2?5:-6}deg`} as CSSProperties}>{ch}</span>)}</span></p>
   <span className="bridge-steps">{Array.from({length:8},(_,k)=><i key={k} style={{'--k':k} as CSSProperties}/>)}</span>
   <p className="bridge-hint">↓ 继续往下，拉开幕布开始搭积木</p>
  </div></div>
 </div></div>;
});

// ---------- Act 2 · Let's: "go together" rolls over into "make a music video", then the block becomes the curtain ----------
const PHRASES=['go together','make a music video'] as const;
const OUT:Keyframe[]=[
 {transform:'translateY(0em) rotateX(0deg) scale(1)',opacity:1,filter:'blur(0px)'},
 {transform:'translateY(-.16em) rotateX(55deg) scale(1.12)',opacity:.7,filter:'blur(2px)',offset:.4},
 {transform:'translateY(-.5em) rotateX(110deg) scale(1.2)',opacity:0,filter:'blur(7px)'},
];
// Drum roll in from below, sharpen while growing, drop, squash on landing and settle with a small hop.
const IN:Keyframe[]=[
 {transform:'translateY(.6em) rotateX(-110deg) scale(.7)',opacity:0,filter:'blur(7px)'},
 {transform:'translateY(.12em) rotateX(-40deg) scale(1)',opacity:.85,filter:'blur(3px)',offset:.25},
 {transform:'translateY(-.3em) rotateX(0deg) scale(1.36)',opacity:1,filter:'blur(0px)',offset:.5,easing:'cubic-bezier(.55,0,.8,.3)'},
 {transform:'translateY(.07em) rotateX(0deg) scale(1.06)',opacity:1,filter:'blur(0px)',offset:.72,easing:'cubic-bezier(.2,.7,.4,1)'},
 {transform:'translateY(-.07em) rotateX(0deg) scale(.98)',opacity:1,filter:'blur(0px)',offset:.86,easing:'ease-in-out'},
 {transform:'translateY(0em) rotateX(0deg) scale(1)',opacity:1,filter:'blur(0px)'},
];
const OUT_GAP=.045,OUT_LEN=.32,IN_AT=.12,IN_GAP=.04,IN_LEN=.44;
const GAP=.3,PAD_X=.32,PAD_Y=.1;
const MINT=[188,228,187],VIOLET=[187,164,248];
const DISCS_2=['var(--violet)','var(--blue)','var(--orange)','var(--mint)','var(--yellow)'] as const;

function Phrase({text}:{text:string}){
 return <span className="say-phrase">{Array.from(text).map((ch,i)=>ch===' '?<span key={i} className="say-gap"/>:<span key={i} className="say-ch">{ch}</span>)}</span>;
}

export const MvAct=memo(function MvAct(){
 const track=useRef<HTMLDivElement>(null);
 useScrollAct(track,(el,stage,pin)=>{
  const curtain=stage.querySelector<HTMLElement>('.say-curtain')!,block=stage.querySelector<HTMLElement>('.say-block')!,text=stage.querySelector<HTMLElement>('.say-text')!;
  const lets=text.querySelector<HTMLElement>('.say-lets')!,[from,to]=Array.from(text.querySelectorAll<HTMLElement>('.say-phrase')),hint=stage.querySelector<HTMLElement>('.say-hint')!;
  const timing={duration:1000,fill:'both'as const};
  const outs=Array.from(from.querySelectorAll<HTMLElement>('.say-ch')).map(ch=>ch.animate(OUT,timing));
  const ins=Array.from(to.querySelectorAll<HTMLElement>('.say-ch')).map(ch=>ch.animate(IN,timing));
  [...outs,...ins].forEach(a=>{a.pause();a.currentTime=0});
  const total=Math.max((outs.length-1)*OUT_GAP+OUT_LEN,IN_AT+(ins.length-1)*IN_GAP+IN_LEN);
  const put=writer(),ring=discs(stage,put);
  const outChars=Array.from(from.querySelectorAll<HTMLElement>('.say-ch')),inChars=Array.from(to.querySelectorAll<HTMLElement>('.say-ch'));
  let W=0,H=0,revealLength=0,f=100,stacked=false,letsW=0,wB=0,lineH=0,edgeA:number[]=[],edgeB:number[]=[];
  let startedAt:number|null=null,shown=-1;
  let exitRequested=false,exitStart:number|null=null,exitProgress=0,exitTarget:0|1=0,exitClock:number|null=null;
  return {
   measure(){
    W=stage.clientWidth;H=stage.offsetHeight;revealLength=pinReveal(pin);
    text.style.fontSize='100px';
    // Everything is measured once at 100px and scaled, so text size never feeds back into the measurement.
    const l=lets.offsetWidth,b=to.offsetWidth,h=to.offsetHeight;
    // Right edge of every letter, so the block can follow the letters that are actually showing.
    const edge=(ch:HTMLElement)=>ch.offsetLeft+ch.offsetWidth,rawA=outChars.map(edge),rawB=inChars.map(edge);
    // One line when it fits at a readable size, otherwise "Let's" sits above the block.
    const avail=W-2*Math.max(16,W*.08),cap=Math.min(150,H*.16);
    f=Math.min(cap,100*avail/(l+(GAP+2*PAD_X)*100+b));stacked=f<54;
    if(stacked)f=Math.min(cap,100*(W-32)/Math.max(l,b+2*PAD_X*100));
    text.style.fontSize=`${f.toFixed(2)}px`;
    const k=f/100;letsW=l*k;wB=b*k;lineH=h*k;edgeA=rawA.map(x=>x*k);edgeB=rawB.map(x=>x*k);shown=-1;
   },
   draw(act,now,{down,up,navigating}){
    const live=!!act,{story:P,reveal:r,intro:q}=act??{story:.5,reveal:0,intro:1};
    const currentScroll=scrollY;
    const pageTop=el.getBoundingClientRect().top+currentScroll,revealTop=pin.getBoundingClientRect().top+currentScroll;
    const playback=phraseFrame(q,now,startedAt,!live||navigating||P>=.66||r>0);
    startedAt=playback.startedAt;
    const m=playback.progress;
    if(!live||q<=.34){
     exitRequested=false;exitStart=null;exitProgress=0;exitTarget=0;exitClock=null;
    }else if(navigating){
     exitRequested=false;exitStart??=1.8;exitProgress=.56+.44*r;exitTarget=1;exitClock=null;
    }else if(r>=1&&(exitTarget===1||exitProgress===0||down)){
     // Navigation/focus can skip directly to MV. It must not leave a timer or an invisible curtain behind.
     exitRequested=false;exitStart??=1.8;exitProgress=1;exitTarget=1;exitClock=null;
    }else{
     if(up){exitRequested=false;exitTarget=0}
     else if(down&&(m>=1||P>.02))exitRequested=true;
     if(exitRequested&&m>=1){
      // Keep the original title position for reversing; store viewport units so resizing stays aligned.
      if(exitProgress===0)exitStart=(currentScroll-pageTop)/H;
      exitTarget=1;exitRequested=false;
     }
    }
    const previousExit=exitProgress,exit=mvExitFrame(exitProgress,exitTarget,exitClock===null?0:now-exitClock);
    if(navigating)exit.running=false;
    exitProgress=exit.progress;exitClock=exit.running?now:null;
    ring.draw(q,exit.reveal);
    el.classList.toggle('is-exiting',exit.running);
    if(m!==shown){
     outs.forEach((a,i)=>{a.currentTime=cascade(m,i,0,OUT_GAP,OUT_LEN,total)*1000});
     ins.forEach((a,j)=>{a.currentTime=cascade(m,j,IN_AT,IN_GAP,IN_LEN,total)*1000});
     shown=m;
    }
    el.classList.toggle('is-swapped',m>=1);
    // The opener pops in on its own clock at the original .42 threshold, then holds before the phrase swap.
    // The block's right edge tracks the furthest letter still standing: old letters hold it until they roll away,
    // new ones push it out as they land, so the block stretches and shrinks in step with the swap (both ways).
    // Old letters: the furthest one still showing (a leaving letter slides the edge back to its neighbour).
    // New letters: the summed width of what has landed so far, which grows smoothly letter by letter.
    let reach=0,landed=0;
    edgeA.forEach((x,i)=>{const here=1-easeInOut(span(cascade(m,i,0,OUT_GAP,OUT_LEN,total),.35,.85));if(here>0)reach=Math.max(reach,lerp(edgeA[i-1]??0,x,here))});
    edgeB.forEach((x,j)=>{landed+=(x-(edgeB[j-1]??0))*easeOut(span(cascade(m,j,IN_AT,IN_GAP,IN_LEN,total),0,.4))});
    reach=Math.max(reach,landed);
    const c=easeInOut(span(m,.15,.7));
    const padX=PAD_X*f,padY=PAD_Y*f,bw=Math.max(reach,f*.6)+2*padX,bh=lineH+2*padY,cy=H*.47;
    // After the swap the block takes two beats: it swallows "Let's" (the words close up into one sentence),
    // then grows over the whole screen and is pulled down off the MV like Act 1's curtain.
    const join=exit.join,ex=exit.expand;
    let lx:number,ly:number,px:number,by:number,wrap:[number,number,number,number];
    if(stacked){
     const gap=f*.16;lx=(W-letsW)/2;ly=cy-gap/2-lineH;px=(W-bw)/2+padX;by=cy+gap/2;
     const left=Math.min(lx,px)-padX,right=Math.max(lx+letsW,px+wB)+padX;wrap=[left,ly-padY,right-left,by+bh-ly+padY];
    }else{
     const space=.28*f,sentence=letsW+space+wB,lx0=(W-(letsW+GAP*f+bw))/2,lx1=(W-sentence)/2;
     lx=lerp(lx0,lx1,join);px=lerp(lx0+letsW+GAP*f+padX,lx1+letsW+space,join);ly=cy-lineH/2;by=cy-bh/2;wrap=[lx1-padX,by,sentence+2*padX,bh];
    }
    put(lets,'transform',move(lx,ly));
    put(from,'transform',move(px,by+padY));put(to,'transform',move(px,by+padY));
    const rest=[px-padX,by,bw,bh],full=[-14,-14,W+28,H+28];
    const [X,Y,BW,BH]=rest.map((v,i)=>lerp(lerp(v,wrap[i],join),full[i],ex));
    put(block,'transform',move(X,Y));
    put(block,'width',`${BW.toFixed(1)}px`);put(block,'height',`${BH.toFixed(1)}px`);
    put(block,'border-radius',`${lerp(.2*f,0,ex).toFixed(1)}px`);
    put(block,'background-color',`rgb(${MINT.map((v,i)=>Math.round(lerp(v,VIOLET[i],c))).join(',')})`);
    stage.classList.toggle('is-filled',ex>=1);
    put(text,'transform',`translate3d(0,${(exit.reveal*H*.12).toFixed(1)}px,0) scale(${(1+.08*ex).toFixed(4)})`);
    put(curtain,'transform',move(0,exit.reveal*(H+120)));
    const h=live?span(m,.8,1)*(1-span(exit.progress,0,.18)):0;
    put(hint,'opacity',h.toFixed(3));put(hint,'transform',move(0,(1-h)*12));
    if(live&&exitStart!==null){
     // Once the colour block is opaque and full-screen, move the actual MV underneath it, then consume the
     // reveal spacer while it opens. This lands on usable MV content instead of leaving an empty scroll track.
     const destination=exit.expand>=1?revealTop+revealLength*exit.reveal:pageTop+exitStart*H;
     if(exit.running||exit.progress!==previousExit)scrollTo({top:Math.ceil(destination),behavior:'instant'});
     pin.classList.toggle('is-open',exit.reveal>=1);
    }
    return live&&!navigating&&(playback.running||exit.running);
   },
   dispose(){[...outs,...ins].forEach(a=>a.cancel())},
  };
 });
 return <div className="act act-mv" ref={track} aria-hidden="true"><div className="act-stage">
  <Discs colors={DISCS_2}/>
  <div className="say-curtain"><i className="act-cast"/>
   <div className="say-block"/>
   <p className="say-text"><span className="say-lets">Let's</span><Phrase text={PHRASES[0]}/><Phrase text={PHRASES[1]}/></p>
   <p className="say-hint">↓ 继续往下，进入 MV 放映厅</p>
  </div>
 </div></div>;
});
