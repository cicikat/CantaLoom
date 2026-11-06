import {useEffect,useRef,useState} from 'react';
import {type SongProject,type Track,type Style,estimateBpm,record,uid,trackInfo} from '../model';
import {createProject,regenerate,applyRhythm,lyricNotes,syncVocal} from '../composer';
import {composeFromIdea} from '../composition';
import {effectivePlan} from '../song-plan';
import {api} from '../api/client';
import {usePlayer} from './usePlayer';
import {useProduction} from './useProduction';
import {STORAGE,initialProject,canAutoSave,readProject,exportProject} from '../features/project/files';
import {exportWavFile,exportPVFile} from '../features/export/files';
export function useStudio(){
 const [p,setP]=useState<SongProject>(initialProject),[page,setPage]=useState(0),[section,setSection]=useState(''),[idea,setIdea]=useState(p.metadata.idea),[style,setStyle]=useState<Style>(p.style),[taps,setTaps]=useState<number[]>([]),[complete,setComplete]=useState(true),[busy,setBusy]=useState(''),[toast,setToast]=useState(''),[saved,setSaved]=useState('已保存在此浏览器'),[health,setHealth]=useState<{llm:boolean;ffmpeg:boolean;available:boolean;llmStatus:'local'|'unverified'|'verified'}>({llm:false,ffmpeg:false,available:false,llmStatus:'local'}),[exportOpen,setExportOpen]=useState(false),[autoSave,setAutoSave]=useState(canAutoSave);
 const {time,playing,stop,seek,play,tapAudio}=usePlayer(p,busy,setBusy,notify);
 const [planError,setPlanError]=useState('');
 const plan=effectivePlan(p);
 const llmLabel=api.mock?'MOCK 固定测试方案 · 未调用 LLM':health.llmStatus==='verified'?'真实 LLM · 最近一次方案已校验':health.llm?'LLM 已配置 · 真实调用未验证':'本地规则 · 未调用 LLM';
 const importRef=useRef<HTMLInputElement>(null),toastTimer=useRef<ReturnType<typeof setTimeout>|undefined>(undefined),lastTap=useRef(0),requestToken=useRef(0);
 const production=useProduction(next=>{change(next);setIdea(next.metadata.idea);setStyle(next.style);setSection('');notify('自由作品已应用，可以试听了')},()=>{requestToken.current++});
 const selected=p.sections.find(s=>s.id===section)??p.sections[1];const length=p.sections.reduce((n,s)=>n+s.beats,0)*60/p.bpm;let tapBpm:number|undefined;try{tapBpm=estimateBpm(taps)}catch{/* need 4 taps */}
 function notify(message:string){setToast(message);clearTimeout(toastTimer.current);toastTimer.current=setTimeout(()=>setToast(''),4000)}
 function change(next:SongProject){if(next===p)return;production.invalidate();requestToken.current++;seek(0);setP(next)}
 function mutate(action:string,fn:(draft:SongProject)=>void){const next=structuredClone(p);fn(next);change(record(next,action))}
 useEffect(()=>{if(!autoSave){setSaved('旧存档格式异常，请导出或手动保存');return}try{localStorage.setItem(STORAGE,JSON.stringify(p));setSaved('已保存在此浏览器')}catch{setSaved('存储已满，请导出工程')}},[p,autoSave]);
 useEffect(()=>{const refresh=()=>{api.health().then(h=>setHealth({...h,available:true})).catch(()=>{})};refresh();window.addEventListener('focus',refresh);return()=>window.removeEventListener('focus',refresh)},[]);
 useEffect(()=>()=>clearTimeout(toastTimer.current),[]);
 function tap(){const now=performance.now();if(now-lastTap.current<180)return;const next=now-lastTap.current>1800?[]:taps;lastTap.current=now;setTaps([...next,now].slice(-8));void tapAudio().catch(()=>notify('浏览器暂时无法启动声音'))}
 function apply(){try{if(!tapBpm)throw Error('请连续敲击 4–8 次');if(p.tracks.some(t=>t.kind==='drums'&&t.locked))throw Error('鼓点已锁定，请先在音乐积木中解锁');change(applyRhythm(p,taps,tapBpm,complete));notify(`已量化 ${taps.length} 次真实敲击 · ${tapBpm} BPM`);setSection(p.sections[1].id);setPage(1)}catch(e){notify((e as Error).message)}}
 async function develop(forceLocal=false){
  if(busy)return;if(p.mode==='free'){notify('自由作品请使用自由创作入口；原曲没有改动');return}production.invalidate();const token=requestToken.current;setBusy('搭建创作方向');setPlanError('');
  const useLLM=health.llm&&!forceLocal;
  try{
   const next=await composeFromIdea(p,idea,style,useLLM);
   if(requestToken.current!==token)return;
   if(useLLM&&!api.mock)setHealth(h=>({...h,llmStatus:'verified'}));
   change(next);notify(api.mock&&useLLM?'已应用 MOCK 固定测试方案，未调用 LLM':useLLM?'已应用经校验的 LLM 音乐方案；音符由本地合成':'已应用本地规则音乐方案，未调用 LLM');
  }catch{
   if(requestToken.current!==token)return;
   const message='音乐方案生成或校验失败，当前工程完整保留。可用本地规则继续。';
   setPlanError(message);if(useLLM&&!api.mock)setHealth(h=>({...h,llmStatus:'unverified'}));notify(message);
  }finally{setBusy('')}
 }
 function toggleStep(t:Track,step:number){if(t.locked||p.mode==='free')return;mutate('手动编辑节奏',next=>{const track=next.tracks.find(x=>x.id===t.id)!,s=next.sections.find(s=>s.id===t.sectionId)!;const exists=track.notes.some(n=>Math.floor((n.beat-s.start)%4*4)===step);if(exists)track.notes=track.notes.filter(n=>Math.floor((n.beat-s.start)%4*4)!==step);else for(let bar=0;bar<s.beats/4;bar++)track.notes.push({id:uid(),beat:s.start+bar*4+step/4,midi:t.kind==='drums'?36:t.kind==='bass'?36:67,duration:.22,velocity:.55,...(t.kind==='drums'?{sound:'kick' as const}:{})});track.version++;track.manuallyEdited=true})}
 function editLyric(id:string,text:string){mutate('手动修改单句歌词',next=>{const l=next.lyrics.find(l=>l.id===id)!;l.text=text;l.source='manual';l.version++;l.notes=lyricNotes(l,next.vocalPreset,l.version,next);syncVocal(next,l.sectionId)})}
 async function exportWav(){setBusy('混合音轨');try{await exportWavFile(p);notify(api.mock?'MOCK 测试音 WAV 已导出（非真实歌声）':'已导出真实立体声 WAV')}catch(e){notify((e as Error).message)}finally{setBusy('')}}
 async function exportPV(){setBusy('合成 PV，请稍候');try{await exportPVFile(p);notify(api.mock?'MOCK 导出交互完成 · 已下载 JSON 回执，未生成 MP4':'PV 导出完成 · H.264 / AAC / 720p')}catch(e){notify(`PV 导出失败：${(e as Error).message}`)}finally{setBusy('')}}
 async function importProject(file?:File){if(!file)return;try{const project=await readProject(file);change(project);setIdea(project.metadata.idea);setStyle(project.style);setAutoSave(true);setSection('');notify('工程已恢复，音轨版本与锁定状态已保留')}catch(e){notify(`导入失败：${(e as Error).message}`)}if(importRef.current)importRef.current.value=''}
 function saveProject(){exportProject(p);notify('已导出完整工程，可随时导入继续创作')}
 function manualSave(){try{localStorage.setItem(STORAGE,JSON.stringify(p));setAutoSave(true);notify('工程已保存在此浏览器')}catch{notify('保存失败，请导出工程 JSON')}}
 function recordChange(next:SongProject,action:string){change(record(next,action))}
 function regenerateAll(){let next=p;for(const t of p.tracks)if(!t.locked)next=regenerate(next,t.id);change(next);notify('已重做未锁定音轨，锁定数据原样保留')}
 function regenerateTrack(t:Track){change(regenerate(p,t.id));notify(`只重做了 ${selected.name} · ${trackInfo[t.kind].name}`)}
 function changePreset(name:SongProject['vocalPreset']){if(p.mode==='free')return;if(p.tracks.some(t=>t.kind==='vocal'&&t.locked)){notify('请先解锁人声音轨再切换预设');return}mutate('切换元音音色',next=>{next.vocalPreset=name;next.lyrics.forEach(l=>{l.notes=lyricNotes(l,name,l.version,next)});next.sections.forEach(s=>syncVocal(next,s.id))})}
 function rewriteMelody(id:string){mutate('重写单句旋律',next=>{const line=next.lyrics.find(x=>x.id===id)!;line.version++;line.notes=lyricNotes(line,next.vocalPreset,line.version,next);syncVocal(next,line.sectionId)})}
 function newProject(){change(createProject());setIdea('海风吹过夏天的轻快歌');setStyle('海盐汽水');setPage(0);setAutoSave(true);setExportOpen(false)}
 const lyricLocked=(sectionId:string)=>!!p.tracks.find(t=>t.sectionId===sectionId&&t.kind==='vocal')?.locked;
 return {p,page,setPage:(value:number)=>{if(value!==page)production.invalidate('已离开输入页，上次制作结果不会覆盖当前工程。');requestToken.current++;setPage(value)},section,setSection,idea,setIdea:(value:string)=>{production.invalidate();requestToken.current++;setIdea(value)},style,setStyle:(value:Style)=>{production.invalidate();requestToken.current++;setStyle(value)},taps,setTaps,complete,setComplete,time,playing,busy,toast,setToast,saved,health,exportOpen,setExportOpen,setAutoSave,planError,plan,llmLabel,importRef,lastTap,selected,length,tapBpm,notify,stop,seek,play,change,mutate,tap,apply,develop,toggleStep,editLyric,exportWav,exportPV,importProject,saveProject,manualSave,recordChange,regenerateAll,regenerateTrack,changePreset,rewriteMelody,newProject,lyricLocked,production};
}
