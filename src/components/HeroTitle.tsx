import type {CSSProperties} from 'react';

// Chapter 1 heading. Screen readers get the plain sentence; the animated letters are visual only.
const STAR='M0-19C1.6-6 6-1.6 19 0 6 1.6 1.6 6 0 19-1.6 6-6 1.6-19 0-6-1.6-1.6-6 0-19Z';
export function HeroTitle({tap,pop}:{tap:string;pop:string}){
 const chars=Array.from(pop);
 return <h1><span className="sr-only">{tap}{pop}</span>
  <span className="h1-tap" aria-hidden="true">{tap}</span><br/>
  <span className="h1-pop" aria-hidden="true">{chars.map((ch,i)=><span className="pop-char" key={i} style={{'--i':i+(i===chars.length-1?.6:0)} as CSSProperties}>
   <svg className="pop-star" viewBox="-20 -20 40 40" focusable="false"><path d={STAR}/></svg>
   <span className="pop-glyph">{ch}</span>
   <span className="pop-bits"><i/><i/><i/></span>
  </span>)}</span>
 </h1>;
}
