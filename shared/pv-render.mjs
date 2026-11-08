import {validatePvBinding} from './contracts/pv.mjs';
// Trusted code only. Model data never becomes HTML, CSS source, attributes or executable code.
function pvRuntime(project,design,credit){
 const root=document.getElementById('stage');let current=-1,items=[];
 const make=(tag,parent,svg=false)=>{const node=svg?document.createElementNS('http://www.w3.org/2000/svg',tag):document.createElement(tag);parent.append(node);return node};
 const random=seed=>()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296};
 function scene(index){root.replaceChildren();items=[];const data=design.scenes[index];root.style.background=`linear-gradient(${data.background.angle}deg,${data.background.colors.join(',')})`;
  for(const l of data.layers){const box=make('div',root);Object.assign(box.style,{position:'absolute',width:l.width*1280+'px',height:l.height*720+'px',color:l.color,transformOrigin:'center',overflow:'visible'});
   if(l.type==='text'){Object.assign(box.style,{fontSize:l.fontSize+'px',fontWeight:'700',textAlign:l.align,whiteSpace:'pre-wrap',lineHeight:'1.25',overflowWrap:'anywhere'});}
   else if(l.type==='shape'){const svg=make('svg',box,true);svg.setAttribute('viewBox','0 0 100 100');svg.setAttribute('width','100%');svg.setAttribute('height','100%');const shape=make(l.shape==='circle'?'circle':l.shape==='rect'?'rect':'polygon',svg,true);shape.setAttribute('fill',l.color);const attrs=l.shape==='circle'?{cx:50,cy:50,r:48}:l.shape==='rect'?{x:2,y:2,width:96,height:96,rx:8}:{points:'50,2 98,98 2,98'};for(const [k,v] of Object.entries(attrs))shape.setAttribute(k,String(v));}
   const particles=[];if(l.type==='particles'){const r=random(l.seed);for(let i=0;i<l.count;i++){const n=make('div',box);Object.assign(n.style,{position:'absolute',width:'5px',height:'5px',borderRadius:'50%',background:l.color});particles.push({node:n,x:r(),y:r(),speed:.3+r()*.8,phase:r()*6.283185})}}
   items.push({l,box,particles});
  }
  const brand=make('div',root);brand.className='brand';brand.textContent='CantaLoom / ORIGINAL SESSION';const source=make('div',root);source.className='credit';source.textContent=credit==='qixuan'?'AI 合成内容 · 歌声合成：绮萱 · 合成技术：DiffSinger':credit==='external'?'外部歌声 / 程序化画面':'织声机 · 元音人声演示 / 程序化画面';
 }
 window.renderAt=timeMs=>{
  const total=project.sections.at(-1).start+project.sections.at(-1).beats;
  const beat=Math.max(0,Math.min(total-1e-8,timeMs/1000*project.bpm/60));let index=project.sections.findIndex(s=>beat>=s.start&&beat<s.start+s.beats);if(index<0)index=0;if(index!==current){current=index;scene(index)}
  const s=project.sections[index],progress=(beat-s.start)/s.beats,lyric=project.lyrics.find(l=>beat>=l.start&&beat<l.end);
  for(const {l,box,particles} of items){let right=l.keyframes.findIndex(f=>f.at>=progress);if(right<=0)right=1;const a=l.keyframes[right-1],b=l.keyframes[right],u=Math.max(0,Math.min(1,(progress-a.at)/(b.at-a.at)));
   const value=key=>(a[key]??l[key])+((b[key]??l[key])-(a[key]??l[key]))*u;
   box.style.left=value('x')*1280+'px';box.style.top=value('y')*720+'px';box.style.opacity=String(value('opacity'));box.style.transform=`translate(-50%,-50%) rotate(${value('rotate')}deg) scale(${value('scale')})`;
   if(l.type==='text')box.textContent=l.textSource==='title'?project.title:(lyric?.text||'');
   for(const p of particles){const x=l.motion==='fall'?p.x:(.5+.45*Math.cos(progress*6.283185*p.speed+p.phase)),y=l.motion==='fall'?(p.y+progress*p.speed)%1:(.5+.45*Math.sin(progress*6.283185*p.speed+p.phase));p.node.style.left=x*100+'%';p.node.style.top=y*100+'%';}
  }
  root.dataset.section=project.sections[index].id;root.dataset.time=String(timeMs);
 };
 window.addEventListener('message',event=>{if(event.source===parent&&event.data?.type==='cantaloom-pv-seek'&&Number.isFinite(event.data.timeMs))window.renderAt(event.data.timeMs)});
 window.renderAt(0);
}
export function pvDocument(project,design,singingCredit='demo'){
 const bound=validatePvBinding(project,design);if(!['demo','qixuan','external'].includes(singingCredit))throw Error('署名来源无效');
 const json=value=>JSON.stringify(value).replace(/</g,'\\u003c').replace(/&/g,'\\u0026').replace(/\u2028/g,'\\u2028').replace(/\u2029/g,'\\u2029');
 const csp="default-src 'none'; script-src 'nonce-pv-runtime-v1'; style-src 'unsafe-inline'; connect-src 'none'; img-src 'none'; font-src 'none'; frame-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'";
 return `<!doctype html><html><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="${csp}"><style>html,body{margin:0;width:1280px;height:720px;overflow:hidden;background:#111}#stage{position:relative;width:1280px;height:720px;overflow:hidden;font-family:Arial,'Microsoft YaHei',sans-serif}.brand,.credit{position:absolute;left:48px;color:#fff;font:14px Arial,'Microsoft YaHei',sans-serif;text-shadow:0 1px 3px #000}.brand{top:30px}.credit{bottom:24px}</style></head><body><div id="stage"></div><script nonce="pv-runtime-v1">(${pvRuntime.toString()})(${json(bound.project)},${json(bound.design)},${json(singingCredit)});</script></body></html>`;
}
