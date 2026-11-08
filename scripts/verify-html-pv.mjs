// Explicit resource acceptance. Does not change saved routes or the product UI.
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import path from 'node:path';
import {createConfigStore} from '../server/admin-config.mjs';
import {externalRoot} from '../server/services/instruments.mjs';
import {resolveRoute} from '../server/services/llm-router.mjs';
import {createPvPlanner} from '../server/services/pv.mjs';
import {createProject,lyricNotes,syncVocal} from '../src/composer.ts';
const output=path.resolve('temp/task35');await mkdir(output,{recursive:true});
if(process.argv.includes('--plan')){
 if(process.env.SONGYU_PV_REAL!=='1')throw Error('Set SONGYU_PV_REAL=1 for explicit paid-provider acceptance');
 const env={...process.env};await createConfigStore({directory:path.join(externalRoot,'runtime/config'),env});
 const existing=JSON.parse(env.LLM_ROUTES||'{}'),route=existing.pv_design||resolveRoute(env,'lyrics_planning');env.LLM_ROUTES=JSON.stringify({...existing,pv_design:route});
 const variants=[{name:'paper-lantern',bpm:96,style:'海盐汽水',title:'黎明前的纸灯',idea:'安静的电子民谣，纸灯穿过薄雾，几何细线缓慢呼吸',words:['纸灯浮过寂静水湾','晨风停在旧桥栏杆','我把微光折进掌心','等第一朵云醒来']},{name:'magnet-storm',bpm:132,style:'橘子摇滚',title:'磁暴后的奔跑',idea:'高速摇滚，锐利三角和粗大字形，炽热撞色，节拍切开城市',words:['鞋底敲响钢铁街道','心跳撞开沉睡高塔','逆风把名字举过头顶','我们追着闪电出发']}];
 for(const v of variants){const score=createProject(v.bpm,v.style,v.idea);score.metadata.title=v.title;score.lyrics.forEach((l,i)=>{l.text=v.words[i];l.source='manual';l.notes=lyricNotes(l,score.vocalPreset,l.version,score)});for(const s of score.sections)syncVocal(score,s.id);
  const project={id:score.id,title:v.title,idea:v.idea,mood:v.style,bpm:score.bpm,sections:score.sections.map((s,i)=>({id:s.id,start:s.start,beats:s.beats,energy:v.name==='magnet-storm'?.9:[.3,.5,.7,.3][i]})),lyrics:score.lyrics.map(l=>({id:l.id,text:l.text,start:l.start,end:l.end})),pulses:score.tracks.filter(t=>t.kind==='drums').flatMap(t=>t.notes.filter(n=>n.sound==='kick').map(n=>({beat:n.beat,strength:n.velocity}))).slice(0,96)};
  console.log('Planning '+v.name+' with '+route.model);const result=await createPvPlanner({env}).design({project});await writeFile(path.join(output,v.name+'.json'),JSON.stringify({score,project,result},null,2));console.log(JSON.stringify({name:v.name,trace:result.trace}));
 }
}else console.log('Use --plan with SONGYU_PV_REAL=1; rendering acceptance is added in P1.');
