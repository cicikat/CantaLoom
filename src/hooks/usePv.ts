import {useEffect,useRef,useState} from 'react';
import {api} from '../api/client';
import {pvFingerprint,pvResultSchema,validatePvBinding} from '../../shared/contracts/pv.mjs';
import {currentPv,pvSnapshot,type StoredPv} from '../features/pv/project';
import {record,validateProject,type SongProject} from '../model';

export function usePv(project:SongProject,onChange:(p:SongProject)=>void,blocked:boolean){
 const latest=useRef({project,blocked});latest.current={project,blocked};
 const token=useRef(0),mounted=useRef(true),active=useRef(false);
 const [pending,setPending]=useState(false),[message,setMessage]=useState(''),[resource,setResource]=useState(''),[verified,setVerified]=useState<{source:SongProject;value?:StoredPv;error?:string}>();
 useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;token.current++}},[]);
 useEffect(()=>{let valid=true;void api.pvStatus().then(s=>{if(valid)setResource(s.available?(api.mock?'MOCK 资源夹具，不代表本机已就绪':'检测到 Chromium 路径；模型、字体与实际导出仍需验证'):'本机未检测到 HTML 视频组件；可继续使用 Canvas。')}).catch(()=>{if(valid)setResource('HTML 视频资源状态不可用；Canvas 不受影响。')});return()=>{valid=false}},[]);
 useEffect(()=>{let valid=true;
  if(project.pvVisual)void currentPv(project,api.mock).then(value=>{if(valid)setVerified({source:project,value})}).catch(e=>{if(valid)setVerified({source:project,error:(e as Error).message})});
  else setVerified({source:project});
  return()=>{valid=false};
 },[project]);
 useEffect(()=>{if(active.current){token.current++;active.current=false;setPending(false);setMessage('作品或制作状态已变化，上次视觉请求不会应用；后台可能仍在运行。')}},[project,blocked]);
 async function generate(){
  if(active.current||blocked)return;
  const source=project,id=++token.current;active.current=true;setPending(true);setMessage('正在设计画面…');
  const valid=()=>mounted.current&&token.current===id&&latest.current.project===source&&!latest.current.blocked;
  try{
   const snapshot=pvSnapshot(source),fingerprint=await pvFingerprint(snapshot);
   const result=pvResultSchema.parse(await api.pvDesign(snapshot));if(!valid())return;
   if(api.mock!==(result.mock===true)||result.inputFingerprint!==fingerprint)throw Error('视觉设计来源或工程指纹不符，原设计已保留。');
   validatePvBinding(snapshot,result.pvDesign);
   const next=structuredClone(source);next.pvVisual={project:snapshot,result};next.pvVisualMode='html';
   active.current=false;onChange(validateProject(record(next,'应用 AI 视觉设计')));setMessage(api.mock?'MOCK 设计夹具已应用，未调用模型。':'视觉设计已应用。');
  }catch(e){if(valid())setMessage(`视觉设计失败：${(e as Error).message} 原作品和设计已保留；可选择 Canvas。`)}
  finally{if(mounted.current&&token.current===id){active.current=false;setPending(false)}}
 }
 function cancel(){token.current++;active.current=false;setPending(false);setMessage('已停止等待，原设计已保留；后台请求可能仍在运行。')}
 function select(mode:'canvas'|'html'){
  if(blocked)return;
  if(mode==='html'&&!(verified?.source===project&&verified.value)){setMessage('请先生成匹配当前作品的视觉设计。');return}
  cancel();const next=structuredClone(project);next.pvVisualMode=mode;onChange(record(next,'选择 PV 画面'));setMessage('');
 }
 const current=verified?.source===project?verified:undefined;
 return {pending,message,resource,generate,cancel,select,current:current?.value,error:current?.error,checking:!!project.pvVisual&&!current};
}
