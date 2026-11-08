import {useEffect,useRef,useState} from 'react';
import {api,ApiError} from '../api/client';
import type {SongProject} from '../model';
import type {ProductionJob,ProductionInput} from '../../shared/contracts/production.mjs';
import type {GrooveSettings} from '../../shared/contracts/groove.mjs';
import {productionInput,productionProject} from './production-result';

type Phase='idle'|'running'|'failed'|'ready'|'cancelled';
export interface ProductionView {phase:Phase;job?:ProductionJob;message:string}
export function useProduction(onApply:(project:SongProject)=>void,onStart:()=>void,initialIntent='',grooveSettings?:GrooveSettings){
 const [intent,setIntent]=useState(initialIntent),[lyrics,setLyrics]=useState(''),[bpm,setBpm]=useState(''),[targetSeconds,setTargetSeconds]=useState(25);
 const [view,setView]=useState<ProductionView>({phase:'idle',message:'写下主题，或带上你自己的歌词。'});
 const work=useRef({token:0,active:false,controller:new AbortController(),phase:'idle' as Phase});
 const callbacks=useRef({onApply,onStart});callbacks.current={onApply,onStart};
 const last=useRef<{input:ProductionInput;job:ProductionJob}|undefined>(undefined);
 const mounted=useRef(true);
 useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;work.current.token++;work.current.active=false;work.current.controller.abort()}},[]);
 function publish(next:ProductionView){work.current.phase=next.phase;if(mounted.current)setView(next)}
 function invalidate(message='输入或工程已改变，上次制作结果不会覆盖当前工程。'){
  const phase=work.current.phase;work.current.token++;work.current.active=false;work.current.controller.abort();last.current=undefined;
  if(phase!=='idle')publish({phase:'cancelled',message});
 }
 function edit<T>(setter:(value:T)=>void,value:T){invalidate();setter(value)}
 async function execute(retry=false){
  if(work.current.active)return;
  let input:ProductionInput;
  try{input=retry&&last.current?last.current.input:productionInput(intent,lyrics,bpm,targetSeconds,grooveSettings)}
  catch(e){publish({phase:'failed',message:(e as Error).message});return}
  const previous=retry?last.current:undefined;
  const token=++work.current.token;work.current.active=true;work.current.controller=new AbortController();
  const signal=work.current.controller.signal;
  const valid=()=>mounted.current&&work.current.token===token&&!signal.aborted;
  callbacks.current.onStart();publish({phase:'running',message:'正在提交制作…'});
  try{
   let job=previous?await api.retryProduction(previous.job.id,previous.job.phraseId!):await api.startProduction(input);
   if(!valid())return;
   const id=job.id;
   for(;;){
    if(job.id!==id)throw Error('制作任务标识不符，请重新制作。');
    last.current={input,job};publish({phase:'running',job,message:''});
    if(job.state==='failed'){publish({phase:'failed',job,message:`${job.error||'制作失败，可以重新制作。'} 当前工程已保留。`});return}
    if(job.state==='succeeded'){
     const next=productionProject(job,input,api.mock);if(!valid())return;
     work.current.active=false;work.current.phase='idle';callbacks.current.onApply(next);
     publish({phase:'ready',job,message:api.mock?'MOCK 测试作品已应用，可试听测试音。':'作品已应用，可以试听了。'});return;
    }
    await new Promise<void>(resolve=>{
     const finish=()=>{clearTimeout(timer);signal.removeEventListener('abort',finish);resolve()};
     const timer=setTimeout(finish,1000);signal.addEventListener('abort',finish,{once:true});
    });
    if(!valid())return;
    job=await api.production(id);if(!valid())return;
   }
  }catch(e){
   if(!valid())return;
   const message=e instanceof ApiError&&e.status===404?'制作任务已丢失或服务已重启，请重新制作。':e instanceof Error&&e.name==='ZodError'?'制作结果校验失败，请重新制作。':e instanceof Error?e.message:'无法连接制作服务，请重新制作。';
   last.current=undefined;publish({phase:'failed',message:message.includes('当前工程已保留')?message:`${message} 当前工程已保留。`});
  }finally{if(valid())work.current.active=false}
 }
 const retryable=view.phase==='failed'&&view.job?.errorCode!=='PERFORMANCE_PLANNING_FAILED'&&view.job?.stage==='singing'&&!!view.job.phraseId&&!!last.current;
 return {intent,lyrics,bpm,targetSeconds,view,retryable,
  setIntent:(value:string)=>edit(setIntent,value),setLyrics:(value:string)=>edit(setLyrics,value),setBpm:(value:string)=>edit(setBpm,value),setTargetSeconds:(value:number)=>edit(setTargetSeconds,value),
  start:()=>execute(),retry:()=>execute(true),invalidate,
  cancel:()=>invalidate('已停止等待，上次制作结果不会应用；当前工程已保留。后台已受理的制作可能仍在运行。')};
}
