import {useEffect,useRef,useState} from 'react';
import {api} from '../api/client';

interface Health {llm:boolean;ffmpeg:boolean;available:boolean;llmStatus:'local'|'unverified'|'verified'}
export function useProductionReadiness(health:Health,onHealth:(health:Health)=>void){
 const [resources,setResources]=useState({instruments:false,singing:false}),[checking,setChecking]=useState(true);
 const generation=useRef(0),mounted=useRef(true),current=useRef({health,onHealth});current.current={health,onHealth};
 async function refresh(){
  const token=++generation.current;setChecking(true);
  const [h,instruments,voice]=await Promise.allSettled([api.health(),api.engines(),api.qixuan()]);
  if(!mounted.current||token!==generation.current)return;
  current.current.onHealth(h.status==='fulfilled'?{llm:h.value.llm,ffmpeg:h.value.ffmpeg,llmStatus:h.value.llmStatus,available:true}:{...current.current.health,available:false});
  setResources({instruments:instruments.status==='fulfilled'&&instruments.value.instruments.ready,singing:voice.status==='fulfilled'&&voice.value.available});setChecking(false);
 }
 useEffect(()=>{mounted.current=true;const focus=()=>void refresh();focus();window.addEventListener('focus',focus);return()=>{mounted.current=false;generation.current++;window.removeEventListener('focus',focus)}},[]);
 const problems:string[]=[];
 if(!health.available)problems.push('无法连接本机创作服务');
 else{
  if(!health.llm)problems.push('AI 作曲服务尚未配置');
  if(!resources.instruments)problems.push('伴奏音源尚未准备好');
  if(!resources.singing)problems.push('中文演唱声库尚未准备好');
  if(!health.ffmpeg)problems.push('音视频制作组件尚未准备好');
 }
 return {checking,problems,canProduce:!checking&&!problems.length,refresh};
}
