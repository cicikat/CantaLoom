import {type SongProject,beatsToSeconds,duration} from './model';
export interface ImageProvider {id:string;isDemo:boolean;draw(ctx:CanvasRenderingContext2D,w:number,h:number,theme:number,time:number):void}
export const proceduralImage:ImageProvider={id:'original-island-canvas',isDemo:true,draw(c,w,h,theme,time){
 const palettes=[['#bdd6df','#f5ddaa','#719da7','#365e6c'],['#b6c9df','#ffe4ab','#7f9ebc','#45647d'],['#e8bdab','#ffefbe','#ad9cba','#615d80'],['#8f9fb8','#e5d9b0','#707e9d','#384c6b']];const [sky,sun,sea,deep]=palettes[Math.abs(theme)%4];
 c.save();c.fillStyle=sky;c.fillRect(0,0,w,h);c.translate(w/2,h/2);const zoom=1+time*.0018;c.scale(zoom,zoom);c.translate(-w/2+Math.sin(time*.08)*w*.008,-h/2);
 c.fillStyle=sun;c.beginPath();c.arc(w*.72,h*.27,h*.115,0,Math.PI*2);c.fill();c.fillStyle='#ffffff65';
 for(const [x,y,r] of [[.16,.23,.08],[.46,.17,.05],[.88,.43,.055]]){c.beginPath();c.ellipse(w*x,h*y,w*r,h*.014,0,0,Math.PI*2);c.fill();}
 c.fillStyle=sea;c.beginPath();c.moveTo(-w*.1,h*.6);c.bezierCurveTo(w*.25,h*.48,w*.6,h*.68,w*1.1,h*.52);c.lineTo(w*1.1,h*1.1);c.lineTo(-w*.1,h*1.1);c.fill();
 c.fillStyle=deep;c.beginPath();c.moveTo(-w*.1,h*.84);c.bezierCurveTo(w*.24,h*.64,w*.62,h*.99,w*1.1,h*.75);c.lineTo(w*1.1,h*1.1);c.lineTo(-w*.1,h*1.1);c.fill();
 c.strokeStyle='#ffffff35';c.lineWidth=1;for(let i=0;i<18;i++){const y=h*(.61+i*.026);c.beginPath();c.moveTo(w*(.05+(i%4)*.12),y);c.bezierCurveTo(w*.42,y-8,w*.54,y+8,w*(.66+i%3*.1),y);c.stroke();}
 const x=w*.44,y=h*.58;c.fillStyle='#fff9e5';c.beginPath();c.moveTo(x,y-h*.19);c.lineTo(x-h*.1,y);c.lineTo(x,y);c.closePath();c.fill();c.fillStyle='#eed89d';c.beginPath();c.moveTo(x+4,y-h*.13);c.lineTo(x+h*.07,y);c.lineTo(x+4,y);c.fill();c.strokeStyle='#314a52';c.lineWidth=2;c.beginPath();c.moveTo(x,y-h*.21);c.lineTo(x,y+h*.025);c.stroke();c.fillStyle='#3c4c53';c.beginPath();c.moveTo(x-h*.11,y+h*.015);c.lineTo(x+h*.09,y+h*.015);c.lineTo(x+h*.045,y+h*.045);c.lineTo(x-h*.065,y+h*.045);c.fill();c.restore();
}};
export function activeLyric(p:SongProject,time:number){return p.lyrics.find(l=>time>=beatsToSeconds(p,l.start)&&time<beatsToSeconds(p,l.end));}
export function drawPV(canvas:HTMLCanvasElement,p:SongProject,time:number,backgroundOnly=false,themeOverride?:number){const c=canvas.getContext('2d')!,w=canvas.width,h=canvas.height;const beat=time*p.bpm/60;const section=p.sections.find(s=>beat>=s.start&&beat<s.start+s.beats)??p.sections[p.sections.length-1];const scene=p.visualScenes.find(v=>v.sectionId===section.id);proceduralImage.draw(c,w,h,themeOverride??scene?.theme??0,time);if(backgroundOnly)return;
 c.fillStyle='#fffdf2';c.font=`600 ${w*.012}px "Microsoft YaHei", sans-serif`;c.textAlign='left';c.fillText('SONGYU  /  ORIGINAL SESSION',w*.045,h*.08);c.textAlign='right';c.fillText(section.name.toUpperCase(),w*.95,h*.08);
 const lyric=activeLyric(p,time),text=lyric?.text??(time<beatsToSeconds(p,p.sections[1].start)?p.metadata.title:'让这段旋律，留在你的小岛。');
 c.textAlign='center';c.shadowColor='#1c354b';c.shadowBlur=8;
 let size=w*(p.subtitleStyle==='poster'?.043:p.subtitleStyle==='minimal'?.026:.034);c.font=`600 ${size}px "Microsoft YaHei", sans-serif`;while(c.measureText(text).width>w*.88&&size>14){size-=1;c.font=`600 ${size}px "Microsoft YaHei", sans-serif`;}
 const y=h*(p.subtitleStyle==='poster'?.47:p.subtitleStyle==='minimal'?.89:.8);if(p.subtitleStyle==='cinema'){c.fillStyle='#18314455';c.fillRect(0,h*.69,w,h*.31)}c.fillStyle='#fffdf2';c.fillText(text,w/2,y);c.shadowBlur=0;c.font=`${w*.011}px "Microsoft YaHei", sans-serif`;c.fillText(p.subtitleStyle==='poster'?'A LITTLE IDEA, AN ISLAND OF SOUND':'声屿 · 元音人声演示 / 程序化画面',w/2,y+h*.065);
 c.fillStyle='#ffffff45';c.fillRect(w*.045,h*.95,w*.91,2);c.fillStyle='#fff';c.fillRect(w*.045,h*.95,w*.91*Math.min(1,time/duration(p)),2);
}
export function download(blob:Blob,name:string){const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),10000)}
export function blobBase64(blob:Blob):Promise<string>{return new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve((r.result as string).split(',')[1]);r.onerror=reject;r.readAsDataURL(blob)})}
