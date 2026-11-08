import {useEffect,useRef,useState} from 'react';
import {api} from '../api/client';
import {setPhrasePerformance} from '../melody';
import {applyVocalResult,generateLine,lineLocked} from '../features/singing/qixuan';
import {expressionControls} from './performance-edit';
import type {useStudio} from './useStudio';
import type {Performance} from '../../shared/contracts/melody.mjs';

export function useVocalStyle(s:ReturnType<typeof useStudio>){
 const [working,setWorking]=useState(false),[error,setError]=useState('');
 const latest=useRef(s);latest.current=s;
 const active=useRef(false),mounted=useRef(true);
 useEffect(()=>{mounted.current=true;return()=>{mounted.current=false}},[]);
 async function select(preset:Performance['preset']){
  if(active.current||s.busy||s.production.view.phase==='running')return;
  const source=s.p;
  const lines=source.lyrics.filter(l=>!lineLocked(source,l.id)&&!l.performance?.locked);
  if(!lines.length){setError('请先解锁要修改的乐句或演唱表达。');return}
  active.current=true;setWorking(true);setError('');s.stop();s.production.invalidate();
  try{
   const voice=await api.qixuan();
   if(!voice.available)throw Error('中文演唱服务未就绪，请准备好声库后再切换风格。');
   let next=source;
   for(const line of lines){
    if(source.vocalAssets?.[line.id]&&source.vocalAssets[line.id].voiceId!=='qixuan')throw Error('当前包含导入歌声，请在逐句演唱中制作后再切换风格。');
    const performance={...line.performance,preset,mode:'manual' as const};
    // The preset owns these four phrase values; retain advanced curves and note overrides.
    for(const {key} of expressionControls)delete performance[key];
    next=setPhrasePerformance(next,line.id,performance);
   }
   const valid=()=>mounted.current&&latest.current.p===source&&latest.current.production.view.phase!=='running';
   for(const line of lines){
    if(!valid())throw Error('切换期间作品已变化，本次演唱未应用。');
    const asset=await generateLine(next,line.id,voice);
    if(!valid())throw Error('切换期间作品已变化，本次演唱未应用。');
    next=applyVocalResult(next,line.id,asset,source.id);
   }
   if(!valid())throw Error('切换期间作品已变化，本次演唱未应用。');
   s.recordChange(next,'切换演唱风格并重新演唱');
   s.notify(`演唱风格已更新，${lines.length} 句已重新演唱；锁定内容保留。`);
  }catch(e){if(mounted.current)setError(`${(e as Error).message} 当前作品已保留。`)}
  finally{active.current=false;if(mounted.current)setWorking(false)}
 }
 return {working,error,select};
}
