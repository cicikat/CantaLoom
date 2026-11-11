import React from 'react';
import {FilmV2} from './spatial';
import {AbsoluteFill,Composition,registerRoot,useCurrentFrame,Sequence,Video,Audio,staticFile} from 'remotion';
import {FPS,palette as C,slots,shots,audio,typography,motion} from './config';
const clamp=(x:number)=>Math.max(0,Math.min(1,x));
const smooth=(x:number)=>{x=clamp(x);return x*x*(3-2*x)};
const out=(x:number)=>1-Math.pow(1-clamp(x),3);
const pop=(x:number)=>{x=clamp(x);return 1+2.7*Math.pow(x-1,3)+1.7*Math.pow(x-1,2)};
const Text=({x,y,size=100,fill=C.white,children,rotate=0,anchor='start',...rest}:any)=><text x={x} y={y} fill={fill} fontSize={size} fontWeight="900" textAnchor={anchor} transform={`rotate(${rotate} ${x} ${y})`} {...rest}>{children}</text>;
function Star({x,y,r=100,fill=C.yellow,angle=0}:any){return <polygon fill={fill} transform={`translate(${x} ${y}) rotate(${angle})`} points={Array.from({length:24},(_,i)=>{let a=i*Math.PI/12;let d=i%2?r*.65:r;return `${Math.cos(a)*d},${Math.sin(a)*d}`}).join(' ')}/>}
function Brand({x=110,y=100,fill=C.white}:any){return <g><Text x={x} y={y} size={29} fill={fill}>CANTALOOM®</Text><Text x={1800} y={y} size={23} fill={fill} anchor="end">MAKE A LITTLE NOISE.</Text></g>}
function Wave({t,y=780,color=C.yellow,amount=1}:any){return <g>{Array.from({length:65},(_,i)=>{let h=18+amount*(75+65*Math.sin(i*.43+t*4)+40*Math.sin(i*.91-t*6));return <rect key={i} x={110+i*26} y={y-Math.abs(h)/2} width={15} height={Math.abs(h)} rx={7} fill={i%9===0?C.pink:color}/>})}</g>}
function Scene({kind,t,duration}:any){
 const opening=kind==='opening', ending=kind==='ending';
 const n=opening?0:kind==='ingredients'?1:kind==='singing'?2:kind==='showcase'?3:4;
 const bg=[C.purple,C.yellow,C.ink,C.pink,C.purple][n];
 const fg=n===1||n===3?C.ink:C.white;
 const enter=out(t/0.8),p=pop((t-.25)/.8);
 return <g>
 <rect width="1920" height="1080" fill={bg}/>
 <g opacity=".12" stroke={fg} strokeWidth="1">{Array.from({length:20},(_,i)=><path key={i} d={`M ${i*110} 0 V1080 M0 ${i*110} H1920`}/>)}</g>
 <Brand fill={fg}/>
 <Star x={1650} y={330} r={150} fill={n===1?C.orange:C.yellow} angle={t*22}/>
 <circle cx={1720} cy={850} r={180} fill="none" stroke={n===3?C.purple:C.pink} strokeWidth={70} strokeDasharray="660 480" transform={`rotate(${t*32} 1720 850)`}/>
 {opening?<>
 <g transform={`translate(${110-(1-enter)*1400} 0)`}><Text x={0} y={345} size={160}>一句话，</Text></g>
 <clipPath id="line"><rect x="90" y="370" width={1530*out((t-.9)/1)} height="260"/></clipPath>
 <g clipPath="url(#line)"><Text x={110} y={585} size={205} fill={C.yellow}>变成一首歌</Text></g>
 <g transform={`translate(1230 255) rotate(${-12+6*enter}) scale(${Math.max(.01,p)})`}><rect x="0" y="0" width="310" height="78" fill={C.pink}/><Text x={25} y={54} size={37} fill={C.ink}>IDEA → MUSIC</Text></g>
 <Wave t={t} y={760} amount={smooth((t-1.4)/1.2)}/>
 <Text x={110} y={960} size={43}>织声 CantaLoom</Text><Text x={1800} y={960} size={28} anchor="end">AI 虚拟歌姬音乐创作 Agent</Text>
 </>:ending?<>
 <g transform={`translate(960 350) scale(${.75+.25*pop(t/1)})`}>
 {[0,1,2,3,4].map(i=><rect key={i} x={-110+i*46} y={-70+Math.abs(i-2)*25} width={30} height={140-Math.abs(i-2)*50} rx={15} fill={i%2?C.pink:C.yellow} transform={`rotate(${(1-smooth(t/1.4))*(i-2)*30})`}/>)}</g>
 <Text x={960} y={615} size={172} anchor="middle" fontFamily={typography.latin}>CantaLoom</Text>
 <Text x={960} y={740} size={54} anchor="middle" fill={C.yellow}>让每一个灵感，都有自己的声音。</Text>
 <Text x={960} y={920} size={30} anchor="middle">织声 · AI 虚拟歌姬音乐创作 Agent</Text>
 <Text x={960} y={980} size={24} anchor="middle">github.com/cicikat/CantaLoom</Text>
 </>:<>
 <Text x={110} y={205} size={26} fill={fg}>0{n+1} / {['','COMPOSE THE IDEA','GIVE IT A VOICE','LET IT SHINE'][n]}</Text>
 {n===1?<>
 {['歌词','旋律','节奏'].map((word,i)=>{let q=pop((t-.15-i*.23)/.8);let shift=smooth((t-2.2)/1.4);return <g key={word} transform={`translate(${125+i*540} ${330+Math.sin(i*2+t)*12}) rotate(${(-7+i*7)*(1-shift)}) scale(${Math.max(.001,q)} 1)`}><rect width="485" height="235" fill={[C.purple,C.pink,C.orange][i]} stroke={C.ink} strokeWidth="5"/><Text x={40} y={165} size={140} fill={i===0?C.white:C.ink}>{word}</Text></g>})}
 <Text x={110} y={720} size={90} fill={fg}>让灵感，长出节奏。</Text>
 <g stroke={fg} strokeWidth="7" fill="none"><path d={`M110 825 C450 ${730+Math.sin(t*3)*60} 590 950 880 825 S1400 690 1780 825`} pathLength="1" strokeDasharray="1" strokeDashoffset={1-out((t-1)/2)}/></g>
 </>:n===2?<>
 <g>{Array.from({length:24},(_,i)=>{let q=smooth((t-1)/2);let x=120+i*70;let y=320+(i%5)*38;let h=20+q*(110+90*Math.sin(i*.8+t*4));return <rect key={i} x={x} y={y*(1-q)+(380-h/2)*q} width={48*(1-q)+15*q} height={Math.abs(h)} rx={8} fill={i%3?C.pink:C.yellow} transform={`rotate(${(1-q)*-8} ${x} ${y})`}/>})}</g>
 <g transform={`translate(110 ${700+(1-enter)*350})`}><Text x={0} y={0} size={155}>从音符，</Text><Text x={700} y={165} size={155} fill={C.yellow}>到歌声。</Text></g>
 <Text x={110} y={960} size={30}>灵感有了声音，故事开始被听见。</Text>
 </>:<>
 <Wave t={t} y={350} color={C.purple} amount={1-smooth((t-2.4)/2)*.8}/>
 <clipPath id="show"><rect x="100" y="450" width={1700*out((t-.3)/1.2)} height="390"/></clipPath>
 <g clipPath="url(#show)"><Text x={110} y={615} size={145} fill={fg}>不止被听见。</Text><Text x={400} y={805} size={145} fill={C.purple}>也要被看见。</Text></g>
 <g transform={`translate(${110+smooth((t-1)/2)*80} 920) rotate(-3)`}><rect x="0" y="-48" width="550" height="76" fill={C.yellow}/><Text x={22} y={5} size={36} fill={C.ink}>MUSIC × LYRICS × VISUALS</Text></g>
 </>}
 </>}
 </g>
}
function Window({slot,t,preview}:any){const idx=slots.indexOf(slot); const previous=shots[idx], next=shots[idx+1]; const active=t>=slot.end?next:previous; let o=smooth((t-(slot.start-motion.transition))/motion.transition),c=smooth((t-slot.end)/motion.transition);let openness=o*(1-c);let w=1780*openness,h=810*openness;let x=960-w/2,y=540-h/2;
 return <g>
 <defs><mask id={`hole-${slot.id}`}><rect width="1920" height="1080" fill="white"/><rect x={x} y={y} width={w} height={h} rx={30*openness} fill="black"/></mask></defs>
 <g mask={`url(#hole-${slot.id})`}><rect width="1920" height="1080" fill={slot.start===8?C.purple:slot.start===30?C.yellow:slot.start===57?C.ink:C.pink}/><g opacity={1-smooth((openness-.7)/.3)}><Scene kind={active.id} t={t-active.start} duration={8}/></g></g>
 <rect x={x} y={y} width={w} height={h} rx={30*openness} fill="none" stroke={C.yellow} strokeWidth={6}/>
 {openness>.98&&<><rect x="70" y="36" width="63" height="54" fill={C.yellow}/><Text x={101} y={74} size={27} anchor="middle" fill={C.ink}>{slots.indexOf(slot)+1}</Text><Text x={158} y={75} size={30} fill={slot.start===30||slot.start===82?C.ink:C.white}>{slot.title}</Text><Text x={1850} y={1028} size={25} anchor="end" fill={slot.start===30||slot.start===82?C.ink:C.white}>CANTALOOM / {slot.detail}</Text></>}
 {preview&&openness>.01&&<g clipPath={`inset(0)`} opacity={openness}>
 <rect x={x+4} y={y+4} width={Math.max(0,w-8)} height={Math.max(0,h-8)} rx="25" fill={C.ink}/>
 <path d={`M${x} ${y+h} L${x+w} ${y}`} stroke={C.white} strokeWidth="2" opacity=".08"/>
 {openness>.8&&<><Text x={960} y={415} size={23} anchor="middle" fill={C.pink}>FOOTAGE TO COME / 真实录屏待替换</Text><Text x={960} y={540} size={76} anchor="middle">{slot.detail}</Text><Text x={960} y={625} size={32} anchor="middle" fill={C.yellow}>{String(slot.start).padStart(2,'0')}—{slot.end} s  ·  {slot.end-slot.start} 秒</Text><Text x={960} y={725} size={24} anchor="middle" fill="#aaa5b9">此处为预览提示，正式 Alpha 素材中完全透明</Text></>}
 </g>}
 </g>
}
export function Film({preview=true,offset=0}:any){const frame=useCurrentFrame()+offset;const t=frame/FPS;const slot=slots.find(s=>t>=s.start-motion.transition&&t<s.end+motion.transition);const shot=shots.find(s=>t>=s.start&&t<s.end)||shots[0];return <AbsoluteFill style={{fontFamily:typography.family,backgroundColor:'transparent'}}>
 {preview&&slots.filter(s=>s.file).map(s=><Sequence key={s.id} from={Math.round((s.start-motion.transition)*FPS)-offset} durationInFrames={Math.round((s.end-s.start+motion.transition*2)*FPS)}><Video src={staticFile(s.file!)} trimBefore={Math.round(s.trim*FPS)} style={{width:'100%',height:'100%',objectFit:'contain'}}/></Sequence>)}
 <svg width="1920" height="1080" viewBox="0 0 1920 1080" style={{position:'absolute'}}>{slot?<Window slot={slot} t={t} preview={preview&&!slot.file}/>:<Scene kind={shot.id} t={t-shot.start} duration={shot.end-shot.start}/>}</svg>
 {preview&&audio.file&&<Audio src={staticFile(audio.file)} volume={audio.volume}/>}
 </AbsoluteFill>}
function Root(){return <><Composition id="PilotOpeningV2" component={FilmV2} width={1920} height={1080} fps={FPS} durationInFrames={240} defaultProps={{preview:true,offset:0}}/><Composition id="PilotScreenV2" component={FilmV2} width={1920} height={1080} fps={FPS} durationInFrames={180} defaultProps={{preview:true,offset:26*FPS}}/>{[true,false].map(p=><Composition key={String(p)+"v2"} id={p?"PreviewV2":"AlphaV2"} component={FilmV2} width={1920} height={1080} fps={FPS} durationInFrames={3060} defaultProps={{preview:p,offset:0}}/>)}{shots.map(s=><Composition key={s.id+"v2"} id={s.id+"V2"} component={FilmV2} width={1920} height={1080} fps={FPS} durationInFrames={(s.end-s.start)*FPS} defaultProps={{preview:false,offset:s.start*FPS}}/>)}{[true,false].map(p=><Composition key={String(p)} id={p?'Preview':'Alpha'} component={Film} width={1920} height={1080} fps={FPS} durationInFrames={Math.round(Math.max(...shots.map(s=>s.end),...slots.map(s=>s.end))*FPS)} defaultProps={{preview:p,offset:0}}/>)}{shots.map(s=><Composition key={s.id} id={s.id} component={Film} width={1920} height={1080} fps={FPS} durationInFrames={(s.end-s.start)*FPS} defaultProps={{preview:false,offset:s.start*FPS}}/>)}</>};registerRoot(Root);
