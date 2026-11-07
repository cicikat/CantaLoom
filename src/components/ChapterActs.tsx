import {memo,useEffect,useRef,type CSSProperties,type RefObject} from 'react';
import {actProgress,cascade,easeBack,easeInOut,easeOut,lerp,span,stepSwap,swapTarget} from './chapter-motion';

// Two scroll "acts" sit between the three content chapters:
//   hero → BenchAct ("Music Blocks") → workbench → MvAct ("Let's …") → MV theatre.
// Each act is a tall track whose 100vh stage is pinned with position:sticky. The page right after it is wrapped in
// `.act-pin`, which pins that page underneath the stage during the act's last stretch, so the curtain can be pulled
// down to reveal it in place. Scroll position alone decides every frame (except the letter swap, which plays on its
// own clock but is clamped by scroll), so scrolling back replays the act in reverse. Only transforms, opacity and the
// one text block's size change per frame; nothing in the content chapters is covered once its curtain is gone.

type Act={enter:number;text:number;reveal:number};
interface Scene{measure():void;draw(act:Act|null,now:number):boolean}

/** Writes a style value only when it changed, so idle scroll frames touch nothing. */
function writer(){
 const last=new Map<HTMLElement,Record<string,string>>();
 return (el:HTMLElement,prop:string,value:string)=>{
  const seen=last.get(el)??{};if(seen[prop]===value)return;seen[prop]=value;last.set(el,seen);el.style.setProperty(prop,value);
 };
}
const move=(x:number,y:number)=>`translate3d(${x.toFixed(1)}px,${y.toFixed(1)}px,0)`;
/** Length of the spacer that keeps a page pinned under its curtain (0 when reduced motion removes it). */
function pinReveal(pin:HTMLElement){const after=getComputedStyle(pin,'::after');return after.display==='none'?0:parseFloat(after.height)||0}

function useScrollAct(trackRef:RefObject<HTMLDivElement|null>,build:(track:HTMLDivElement,stage:HTMLDivElement,pin:HTMLElement)=>Scene&{dispose?():void}){
 const buildRef=useRef(build);buildRef.current=build;
 useEffect(()=>{
  const track=trackRef.current,stage=track?.firstElementChild as HTMLDivElement|null,pin=track?.nextElementSibling as HTMLElement|null;
  if(!track||!stage||!pin?.classList.contains('act-pin'))return;
  const motion=matchMedia('(prefers-reduced-motion: reduce)'),scene=buildRef.current(track,stage,pin);
  let frame=0,reveal=0;
  const read=():Act=>{const t=track.getBoundingClientRect();return actProgress(t.top,t.height,stage.offsetHeight,pin.getBoundingClientRect().top,reveal)};
  const tick=(now:number)=>{
   frame=0;const act=motion.matches?null:read();
   pin.classList.toggle('is-open',!act||act.reveal>=1);
   if(scene.draw(act,now))schedule();
  };
  const schedule=()=>{if(!frame)frame=requestAnimationFrame(tick)};
  const measure=()=>{reveal=pinReveal(pin);scene.measure();schedule()};
  // Keyboard focus landing on a page that is still under its curtain jumps to the end of the reveal.
  const focus=(e:FocusEvent)=>{
   const page=pin.firstElementChild;if(motion.matches||!page?.contains(e.target as Node)||read().reveal>=1)return;
   scrollTo({top:Math.ceil(pin.getBoundingClientRect().top+scrollY+reveal),behavior:'instant'});
  };
  const size=new ResizeObserver(measure);size.observe(stage);
  measure();
  addEventListener('scroll',schedule,{passive:true});addEventListener('resize',measure);motion.addEventListener('change',measure);document.addEventListener('focusin',focus);
  void document.fonts?.ready.then(measure);
  return()=>{cancelAnimationFrame(frame);size.disconnect();removeEventListener('scroll',schedule);removeEventListener('resize',measure);motion.removeEventListener('change',measure);document.removeEventListener('focusin',focus);scene.dispose?.()};
 },[trackRef]);
}

/** Scroll position that shows a chapter (or an element inside one) with its curtain fully pulled away. */
export function chapterScrollTop(id:string){
 const el=document.getElementById(id);if(!el)return 0;
 const pin=el.closest<HTMLElement>('.act-pin'),top=(n:Element)=>n.getBoundingClientRect().top+scrollY;
 if(!pin)return top(el);
 const page=pin.firstElementChild!,reveal=pinReveal(pin);
 // Rounded up so the browser's whole-pixel scroll never stops a hair before the curtain is fully open.
 return Math.ceil(top(pin)+reveal+(el.getBoundingClientRect().top-page.getBoundingClientRect().top));
}

// ---------- Act 1 · Music Blocks: three paper layers rise, then the front one is pulled down off the workbench ----------
const BLOCKS=[['B','var(--yellow)'],['l','var(--mint)'],['o','var(--orange)'],['c','var(--blue)'],['k','var(--off)'],['s','#f2b8d8']] as const;

export const BenchAct=memo(function BenchAct(){
 const track=useRef<HTMLDivElement>(null);
 useScrollAct(track,(el,stage)=>{
  const [,mid,front]=Array.from(stage.querySelectorAll<HTMLElement>(':scope>.act-panel'));
  const title=stage.querySelector<HTMLElement>('.act-title')!,word=stage.querySelector<HTMLElement>('.bridge-word')!;
  const letters=Array.from(stage.querySelectorAll<HTMLElement>('.bridge-music>span')),tiles=Array.from(stage.querySelectorAll<HTMLElement>('.bridge-blocks>span'));
  const fades=Array.from(stage.querySelectorAll<HTMLElement>('[data-at]'));
  const put=writer();let H=0,em=0;
  return {
   measure(){H=stage.offsetHeight;em=parseFloat(getComputedStyle(word).fontSize)||100},
   draw(act){
    // The hero is left alone (it stays fully usable); the layers only stack over one another inside the stage.
    const {text:P,reveal:r}=act??{text:.7,reveal:0};
    const rise=H*.5*(1-easeInOut(span(P,.03,.34))),pull=easeInOut(r)*(H+120);
    put(mid,'transform',move(0,H*.24*(1-easeInOut(span(P,0,.24)))));
    put(front,'transform',move(0,rise+pull));
    stage.classList.toggle('is-covered',rise<.5);
    // The step lights only blink while the title page can be seen.
    stage.classList.toggle('is-titled',P>.3&&r<1);
    // Title rides the front layer; it drifts up while held and sinks a little faster than the curtain when pulled.
    put(title,'transform',move(0,-span(P,.45,1)*H*.04+easeInOut(r)*H*.14));
    letters.forEach((ch,i)=>{const t=span(P,.08+i*.035,.27+i*.035),k=easeBack(t);put(ch,'transform',`translate3d(0,${((1-k)*em*.9).toFixed(1)}px,0) rotate(${((1-k)*(i%2?9:-9)).toFixed(1)}deg)`);put(ch,'opacity',Math.min(1,t*4).toFixed(3))});
    // The tiles are tossed up from below one after another, spinning, and land with a bounce.
    tiles.forEach((tile,j)=>{const t=span(P,.16+j*.04,.36+j*.04),k=easeBack(t,2.2);put(tile,'transform',`translate3d(0,${((1-k)*em*1.3).toFixed(1)}px,0) rotate(${((1-k)*(j%2?-40:40)).toFixed(1)}deg)`);put(tile,'opacity',Math.min(1,t*5).toFixed(3))});
    fades.forEach(node=>{const at=Number(node.dataset.at),k=easeOut(span(P,at,at+.1));put(node,'opacity',k.toFixed(3));put(node,'transform',move(0,(1-k)*16))});
    return false;
   },
  };
 });
 return <div className="act act-bench" ref={track} aria-hidden="true"><div className="act-stage">
  <div className="act-panel tone-yellow"><i className="act-cast"/></div>
  <div className="act-panel tone-orange"><i className="act-cast"/></div>
  <div className="act-panel tone-violet act-curtain"><i className="act-cast"/>
   <div className="act-title">
    <p className="bridge-kicker" data-at=".3">CHAPTER 02 · 音乐积木工作台</p>
    <p className="bridge-word"><span className="bridge-music">{Array.from('Music').map((ch,j)=><span key={j}>{ch}</span>)}</span><span className="bridge-blocks">{BLOCKS.map(([ch,color],j)=><span key={j} style={{'--c':color,'--r':`${j%2?5:-6}deg`} as CSSProperties}>{ch}</span>)}</span></p>
    <span className="bridge-steps" data-at=".34">{Array.from({length:8},(_,k)=><i key={k} style={{'--k':k} as CSSProperties}/>)}</span>
    <p className="bridge-hint" data-at=".4">↓ 继续往下，拉开幕布开始搭积木</p>
   </div>
  </div>
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
const SWAP_MS=1600,OUT_GAP=.045,OUT_LEN=.32,IN_AT=.12,IN_GAP=.04,IN_LEN=.44;
const GAP=.3,PAD_X=.32,PAD_Y=.1;
const MINT=[188,228,187],VIOLET=[187,164,248];

function Phrase({text}:{text:string}){
 return <span className="say-phrase">{Array.from(text).map((ch,i)=>ch===' '?<span key={i} className="say-gap"/>:<span key={i} className="say-ch">{ch}</span>)}</span>;
}

export const MvAct=memo(function MvAct(){
 const track=useRef<HTMLDivElement>(null);
 useScrollAct(track,(el,stage)=>{
  const [,mid,front]=Array.from(stage.querySelectorAll<HTMLElement>(':scope>.act-panel'));
  const curtain=stage.querySelector<HTMLElement>('.say-curtain')!,block=stage.querySelector<HTMLElement>('.say-block')!,text=stage.querySelector<HTMLElement>('.say-text')!;
  const lets=text.querySelector<HTMLElement>('.say-lets')!,[from,to]=Array.from(text.querySelectorAll<HTMLElement>('.say-phrase')),hint=stage.querySelector<HTMLElement>('.say-hint')!;
  const timing={duration:1000,fill:'both'as const};
  const outs=Array.from(from.querySelectorAll<HTMLElement>('.say-ch')).map(ch=>ch.animate(OUT,timing));
  const ins=Array.from(to.querySelectorAll<HTMLElement>('.say-ch')).map(ch=>ch.animate(IN,timing));
  [...outs,...ins].forEach(a=>{a.pause();a.currentTime=0});
  const total=Math.max((outs.length-1)*OUT_GAP+OUT_LEN,IN_AT+(ins.length-1)*IN_GAP+IN_LEN);
  const put=writer();
  const outChars=Array.from(from.querySelectorAll<HTMLElement>('.say-ch')),inChars=Array.from(to.querySelectorAll<HTMLElement>('.say-ch'));
  let W=0,H=0,f=100,stacked=false,letsW=0,wB=0,lineH=0,edgeA:number[]=[],edgeB:number[]=[];
  let m=0,target:0|1=0,shown=-1,clock=0;
  return {
   measure(){
    W=stage.clientWidth;H=stage.offsetHeight;
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
   draw(act,now){
    const live=!!act,{text:P,reveal:r}=act??{text:.5,reveal:0};
    const dt=clock?Math.min(64,now-clock):16;
    const was=m;target=swapTarget(P,target,.3,.22);
    m=live?stepSwap(m,target,dt,SWAP_MS,P,[.1,.16],[.5,.58]):1;
    const running=live&&m!==target&&m!==was;clock=running?now:0;
    if(m!==shown){
     outs.forEach((a,i)=>{a.currentTime=cascade(m,i,0,OUT_GAP,OUT_LEN,total)*1000});
     ins.forEach((a,j)=>{a.currentTime=cascade(m,j,IN_AT,IN_GAP,IN_LEN,total)*1000});
     shown=m;
    }
    el.classList.toggle('is-swapped',m>=1);
    // Layers rise like Act 1; "Let's" and the block arrive on separate beats.
    const midY=H*.24*(1-easeInOut(span(P,0,.2))),frontY=H*.5*(1-easeInOut(span(P,.02,.28)));
    const letsLag=(1-easeBack(span(P,.06,.24)))*f*.9,blockLag=(1-easeBack(span(P,.1,.3)))*f*1.4;
    put(mid,'transform',move(0,midY));put(front,'transform',move(0,frontY));
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
    const join=easeInOut(span(P,.62,.7)),ex=easeInOut(span(P,.7,.92));
    let lx:number,ly:number,px:number,by:number,wrap:[number,number,number,number];
    if(stacked){
     const gap=f*.16;lx=(W-letsW)/2;ly=cy-gap/2-lineH;px=(W-bw)/2+padX;by=cy+gap/2;
     const left=Math.min(lx,px)-padX,right=Math.max(lx+letsW,px+wB)+padX;wrap=[left,ly-padY,right-left,by+bh-ly+padY];
    }else{
     const space=.28*f,sentence=letsW+space+wB,lx0=(W-(letsW+GAP*f+bw))/2,lx1=(W-sentence)/2;
     lx=lerp(lx0,lx1,join);px=lerp(lx0+letsW+GAP*f+padX,lx1+letsW+space,join);ly=cy-lineH/2;by=cy-bh/2;wrap=[lx1-padX,by,sentence+2*padX,bh];
    }
    put(lets,'transform',move(lx,ly+frontY+letsLag));
    put(from,'transform',move(px,by+padY+frontY+blockLag));put(to,'transform',move(px,by+padY+frontY+blockLag));
    const rest=[px-padX,by+frontY+blockLag,bw,bh],full=[-14,-14,W+28,H+28];
    const [X,Y,BW,BH]=rest.map((v,i)=>lerp(lerp(v,wrap[i],join),full[i],ex));
    put(block,'transform',move(X,Y));
    put(block,'width',`${BW.toFixed(1)}px`);put(block,'height',`${BH.toFixed(1)}px`);
    put(block,'border-radius',`${lerp(.2*f,0,ex).toFixed(1)}px`);
    put(block,'background-color',`rgb(${MINT.map((v,i)=>Math.round(lerp(v,VIOLET[i],c))).join(',')})`);
    stage.classList.toggle('is-filled',ex>=1);
    put(text,'transform',`translate3d(0,${(easeInOut(r)*H*.12).toFixed(1)}px,0) scale(${(1+.08*ex).toFixed(4)})`);
    put(curtain,'transform',move(0,easeInOut(r)*(H+120)));
    const h=live?span(m,.8,1)*(1-span(P,.6,.66)):0;
    put(hint,'opacity',h.toFixed(3));put(hint,'transform',move(0,frontY+(1-h)*12));
    return running;
   },
   dispose(){[...outs,...ins].forEach(a=>a.cancel())},
  };
 });
 return <div className="act act-mv" ref={track} aria-hidden="true"><div className="act-stage">
  <div className="act-panel tone-violet"><i className="act-cast"/></div>
  <div className="act-panel tone-orange"><i className="act-cast"/></div>
  <div className="act-panel tone-yellow"><i className="act-cast"/></div>
  <div className="say-curtain"><i className="act-cast"/>
   <div className="say-block"/>
   <p className="say-text"><span className="say-lets">Let's</span><Phrase text={PHRASES[0]}/><Phrase text={PHRASES[1]}/></p>
   <p className="say-hint">↓ 继续往下，进入 MV 放映厅</p>
  </div>
 </div></div>;
});
