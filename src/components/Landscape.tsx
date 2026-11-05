import {useEffect,useRef} from 'react';
import type {SongProject} from '../model';
import {drawPV} from '../visual';
export function Landscape({project,time=0,className='',background=false}:{project:SongProject;time?:number;className?:string;background?:boolean}){const ref=useRef<HTMLCanvasElement>(null);useEffect(()=>{if(ref.current)drawPV(ref.current,project,time,background)},[project,time,background]);return <canvas ref={ref} width="1280" height="720" className={className} aria-label="声屿原创程序化海岛画面"/>}
