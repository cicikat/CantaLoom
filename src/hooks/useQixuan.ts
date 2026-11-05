import {useEffect,useRef,useState} from 'react';
import type {SongProject} from '../model';
import {api} from '../api/client';
import type {QixuanStatus} from '../../shared/contracts/index.mjs';
import {applyVocalResult,generateLine,lineLocked,vocalReady} from '../features/singing/qixuan';

export function useQixuan(p:SongProject,onChange:(p:SongProject)=>void){
 const [voice,setVoice]=useState<QixuanStatus>(),[working,setWorking]=useState(''),[messages,setMessages]=useState<Record<string,string>>({}),[notice,setNotice]=useState('');
 const latest=useRef(p);latest.current=p;const active=useRef(false),mounted=useRef(true);
 useEffect(()=>{mounted.current=true;api.qixuan().then(v=>{if(mounted.current)setVoice(v)}).catch(()=>{if(mounted.current)setNotice('无法连接本地歌声服务')});return()=>{mounted.current=false}},[]);
 async function generate(id:string,force=false){
  if(!voice?.available)throw Error('请先完成绮萱声库与桥接器安装');
  setWorking(id);setMessages(m=>({...m,[id]:api.mock?'MOCK 测试任务进行中（未调用模型）':'正在让绮萱演唱… 首次加载模型需要一些时间'}));
  try{const source=latest.current,asset=await generateLine(source,id,voice,force);if(!mounted.current)return;const next=applyVocalResult(latest.current,id,asset,source.id);latest.current=next;onChange(next);setMessages(m=>({...m,[id]:(asset.mock?'MOCK 测试音已就绪 · ':'真实演唱已就绪 · ')+asset.renderParameters?.runner+' · v'+((asset.take||0)+1)}))}
  catch(e){if(mounted.current)setMessages(m=>({...m,[id]:(e as Error).message}));throw e}
 }
 async function run(id:string,force=false){if(active.current)return;active.current=true;try{await generate(id,force)}catch(e){if(mounted.current)setNotice((e as Error).message)}finally{active.current=false;if(mounted.current)setWorking('')}}
 async function all(){if(active.current)return;active.current=true;try{for(const l of latest.current.lyrics){if(!mounted.current)break;if(vocalReady(latest.current,l.id,voice)||lineLocked(latest.current,l.id))continue;await generate(l.id)}}catch(e){if(mounted.current)setNotice((e as Error).message)}finally{active.current=false;if(mounted.current)setWorking('')}}
 return {voice,working,messages,notice,run,all};
}
