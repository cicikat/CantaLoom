import {useEffect,useRef,useState} from 'react';
import {api} from '../api/client';
import {melodyRequest} from '../melody';
import type {SongProject,Note} from '../model';
import {editPhraseNote,togglePhraseLock,phraseLocked,applyPhraseResult} from './phrase-edit';

export function usePhraseEditor(p:SongProject,onChange:(p:SongProject)=>void){
 const [lineId,setLineId]=useState(p.lyrics[0]?.id||''),[noteId,setNoteId]=useState(p.lyrics[0]?.notes[0]?.id||''),[intent,setIntent]=useState(''),[working,setWorking]=useState(false),[message,setMessage]=useState('');
 const latest=useRef(p);latest.current=p;const callback=useRef(onChange);callback.current=onChange;
 const generation=useRef(0),active=useRef(false),mounted=useRef(true);
 useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;generation.current++;active.current=false}},[]);
 useEffect(()=>{if(active.current){generation.current++;active.current=false;setWorking(false);setMessage('工程已改变，迟到的旋律结果不会应用。')}},[p]);
 const line=p.lyrics.find(l=>l.id===lineId)??p.lyrics[0],note=line?.notes.find(n=>n.id===noteId)??line?.notes[0];
 function cancel(text='已停止等待，原旋律保留；后台已受理的请求可能继续运行。'){generation.current++;active.current=false;setWorking(false);setMessage(text)}
 function mutate(fn:()=>SongProject,lockOnly=false){try{const next=fn();cancel(lockOnly?'锁定设置已保存，旋律与已有演唱不变。':'已保存；改动句需要重新演唱，其他句的音频保留。');callback.current(next)}catch(e){setMessage(e instanceof Error&&e.name!=='ZodError'?e.message:'音高须为 48–84，长度至少为 1/8 拍，音符不能重叠或越界。')}}
 async function regenerate(){
  if(active.current||!line)return;
  if(phraseLocked(p,line.id)){setMessage('这句已锁定，请先解锁。');return}
  if(!intent.trim()){setMessage('先写下这一句希望怎样变化。');return}
  const source=p,id=line.id,token=++generation.current;active.current=true;setWorking(true);setMessage(api.mock?'MOCK 局部旋律测试中，未调用模型…':'正在为这一句重作旋律…');
  try{
   const request=melodyRequest(source,intent,[id]),result=await api.melody(request);
   if(!mounted.current||generation.current!==token)return;
   if(latest.current!==source){cancel('工程已改变，迟到的旋律结果不会应用。');return}
   const next=applyPhraseResult(latest.current,request,result.draft);active.current=false;callback.current(next);
   setMessage(api.mock?'MOCK 测试旋律已应用；需要重新演唱的句子会单独提示。':'这一句的新旋律已应用，请重新演唱此句；其他句与伴奏保留。');
  }catch(e){if(mounted.current&&generation.current===token)setMessage((e instanceof Error&&e.name!=='ZodError'?e.message:'旋律响应校验失败')+' 原工程已保留。')}
  finally{if(mounted.current&&generation.current===token){active.current=false;setWorking(false)}}
 }
 return {line,note,intent,working,message,
  selectLine:(id:string)=>{cancel('已切换乐句，未应用的生成结果已作废。');setLineId(id);setNoteId(p.lyrics.find(l=>l.id===id)?.notes[0]?.id||'')},selectNote:setNoteId,
  setIntent:(value:string)=>{cancel('要求已修改，未应用的生成结果已作废。');setIntent(value)},cancel,regenerate,
  edit:(id:string,patch:Partial<Pick<Note,'midi'|'beat'|'duration'|'locked'>>)=>{setNoteId(id);if(line)mutate(()=>editPhraseNote(p,line.id,id,patch),Object.keys(patch).every(k=>k==='locked'))},
  toggleLock:()=>{if(line)mutate(()=>togglePhraseLock(p,line.id),true)},locked:line?phraseLocked(p,line.id):true};
}
