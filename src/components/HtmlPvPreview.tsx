import {useEffect,useMemo,useRef,useState} from 'react';
import {pvDocument} from '../../shared/pv-render.mjs';
import type {StoredPv} from '../features/pv/project';
import './html-pv.css';

export function HtmlPvPreview({value,time,credit}:{value:StoredPv;time:number;credit:'demo'|'qixuan'|'external'}){
 const frame=useRef<HTMLIFrameElement>(null),box=useRef<HTMLDivElement>(null),[scale,setScale]=useState(1);
 const document=useMemo(()=>pvDocument(value.project,value.result.pvDesign,credit),[value,credit]);
 const seek=()=>frame.current?.contentWindow?.postMessage({type:'cantaloom-pv-seek',timeMs:time*1000},'*');
 useEffect(seek,[time,document]);
 useEffect(()=>{const observer=new ResizeObserver(entries=>setScale(entries[0].contentRect.width/1280));if(box.current)observer.observe(box.current);return()=>observer.disconnect()},[]);
 return <div className="html-pv-preview" ref={box}><iframe ref={frame} title="AI HTML PV 预览" sandbox="allow-scripts" srcDoc={document} onLoad={seek} style={{transform:`scale(${scale})`}}/></div>;
}
