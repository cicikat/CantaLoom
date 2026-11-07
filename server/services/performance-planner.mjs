import {z} from 'zod';
import {performanceSchema} from '../../shared/contracts/melody.mjs';
import {createTaskRouter} from './llm-router.mjs';

export const performanceOutputSchema=z.object({phrases:z.array(z.object({id:z.string(),performance:performanceSchema}).strict()).min(1).max(32)}).strict();
export function createPerformancePlanner({env=process.env,request=fetch}={}){
 return {async plan(project){
  // Locked/manual data never goes to the planner and is never replaced.
  const eligible=project.lyrics.filter(l=>!l.locked&&!l.performance?.locked&&l.performance?.mode!=='manual'&&!l.notes.some(n=>n.locked)&&!l.performance?.overrides?.some(o=>o.locked||o.origin!=='auto'));
  if(!eligible.length)return {project,trace:null};
  const input={bpm:project.bpm,phrases:eligible.map(l=>({id:l.id,text:l.text,start:l.start,end:l.end,notes:l.notes.map(n=>({beat:n.beat,duration:n.duration,midi:n.midi,velocity:n.velocity,syllable:n.syllable}))}))};
  const result=await createTaskRouter({env,request}).run('performance_planning',{schema:performanceOutputSchema,input,promptVersion:'1',system:'你是中文歌声表现规划师。仅按现有歌词和音符规划演唱表现，不改写歌词、音符、ID 或时间轴。逐句返回所有目标 ID。优先使用自然的力度、过渡和克制颤音；只输出 Performance 契约支持的参数。mode 必须 auto，所有 overrides 的 origin 必须 auto，不添加锁定。',validate:raw=>{
   const value=performanceOutputSchema.parse(raw),ids=value.phrases.map(p=>p.id);
   if(ids.length!==eligible.length||new Set(ids).size!==ids.length||ids.some(id=>!eligible.some(l=>l.id===id)))throw Error('乐句 ID 不匹配');
   for(const p of value.phrases){const line=eligible.find(l=>l.id===p.id);if(p.performance.mode!=='auto'||p.performance.locked||p.performance.overrides?.some(o=>o.index>=line.notes.length||o.locked||o.origin!=='auto'))throw Error('调教索引或来源无效')}
   return value;
  }});
  const byId=new Map(result.value.phrases.map(p=>[p.id,p.performance]));
  return {project:{...project,lyrics:project.lyrics.map(l=>byId.has(l.id)?{...l,performance:byId.get(l.id)}:l)},trace:result.trace};
 }};
}
