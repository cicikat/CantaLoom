import {mkdir,writeFile} from 'node:fs/promises';
import {createConfigStore} from '../server/admin-config.mjs';
import {createPlanner} from '../server/planner.mjs';
import {createProject} from '../src/composer';
import {composeFromIdea} from '../src/composition';
const root='D:/ai/hacson/external/runtime';await createConfigStore({directory:root+'/config'});const planner=createPlanner();
const directory=root+'/exports/qixuan-acceptance';await mkdir(directory,{recursive:true});
const reports=[];
for(const [label,idea,style] of [['A','海边、安静、忧伤、缓慢','深夜漫游'],['B','夏天、明亮、热烈、快节奏','橘子摇滚']] as const){
 const p=createProject();const drum=p.tracks.find(t=>t.kind==='drums')!;drum.locked=true;let metrics;const started=performance.now();
 const project=await composeFromIdea(p,idea,style,true,async(_url,init)=>{let payload;let code=200;const res={locals:{},status(c:number){code=c;return this},json(x:unknown){payload=x;return this}};await planner.handle({body:JSON.parse(init!.body as string)},res);metrics=res.locals;return Response.json(payload,{status:code})});
 if(JSON.stringify(project.tracks.find(t=>t.id===drum.id))!==JSON.stringify(drum))throw Error('Locked track changed');
 await writeFile(`${directory}/llm-${label}-project.json`,JSON.stringify(project,null,2));const report={label,idea,milliseconds:Math.round(performance.now()-started),metrics,plan:project.songPlan,lyrics:project.lyrics.map(l=>l.text),lockedPreserved:true};reports.push(report);console.log({label,milliseconds:report.milliseconds,metrics,source:project.planning?.source});
}await writeFile(directory+'/llm-report.json',JSON.stringify(reports,null,2));
