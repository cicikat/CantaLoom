import {useEffect,useRef,useState} from 'react';
import {AudioEngine} from '../audio';
import {duration,type SongProject} from '../model';
import type {PreviewStem} from '../components/MixControls';
export function usePlayer(p:SongProject,busy:string,setBusy:(value:string)=>void,notify:(message:string)=>void){
 const [engine]=useState(()=>new AudioEngine()),[time,setTime]=useState(0),[playing,setPlaying]=useState(false);const mounted=useRef(true);
 useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;engine.stop()}},[engine]);
 const length=duration(p);
 useEffect(()=>{let frame:number;function tick(){if(engine.playing){setTime(engine.time);setPlaying(true)}else if(playing){setPlaying(false);if(engine.time>=length-.15){setTime(0);engine.offset=0}}frame=requestAnimationFrame(tick)}frame=requestAnimationFrame(tick);return()=>cancelAnimationFrame(frame)},[playing,length,engine]);
 function stop(){engine.stop();setPlaying(false)}
 function seek(value:number){stop();setTime(value);engine.offset=value}
 async function play(options:{trackId?:string;lyricId?:string;stem?:PreviewStem}={}){if(busy)return;setBusy('准备音频');try{await engine.play(p,options.trackId||options.lyricId||options.stem?0:time>=length-.1?0:time,options);if(mounted.current)setPlaying(engine.playing)}catch(e){if(mounted.current)notify(`音频无法启动：${(e as Error).message}`)}finally{if(mounted.current)setBusy('')}}
 return {time,playing,stop,seek,play,tapAudio:()=>engine.tap()};
}
