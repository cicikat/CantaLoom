import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createMockRequest} from '../src/api/mock';
import {productionInput,productionProject} from '../src/hooks/production-result';
import type {ProductionJob} from '../shared/contracts/production.mjs';

test('free page input protects whitespace and rejects invalid line counts, lengths and BPM',()=>{
 const parsed=productionInput(' 雨后的歌 ','  留住这些字  \n\n第二句','',25);
 assert.deepEqual(parsed.lyrics,['  留住这些字  ','第二句']);assert.equal(parsed.intent,'雨后的歌');
 assert.equal(productionInput('主题','','',25).lyrics,undefined);
 for(const [text,bpm] of [['x'.repeat(101),''],[Array(9).fill('歌词').join('\n'),''],['歌词','59'],['歌词','96.5']])assert.throws(()=>productionInput('主题',text,bpm,25));
 assert.throws(()=>productionInput('', '', '',25));
});

test('page result validation requires ready state, matching input, complete music and usable asset references (fixtures)',async()=>{
 const input=productionInput('验证页面结果','风吹过小岛\n灯照着海岸','96',25),request=createMockRequest();
 let job=await (await request('/api/production',{method:'POST',body:JSON.stringify(input)})).json() as ProductionJob;
 for(let i=0;i<20&&job.state==='running';i++)job=await (await request('/api/production/'+job.id)).json() as ProductionJob;
 // Explicit real-shaped fixture for Node validation; no model or engine is called.
 const p=job.project as any;delete job.mock;delete p.planning.mock;delete p.melodyDraft.mock;p.planning.source='llm';
 for(const asset of Object.values(p.vocalAssets) as any[]){delete asset.mock;asset.isDemo=false}
 const before=JSON.stringify(job);assert.equal(productionProject(job,input,false).id,p.id);assert.equal(JSON.stringify(job),before);
 const edits=[
  (j:any)=>{j.state='running'},(j:any)=>{j.stage='melody'},(j:any)=>{j.project={}},
  (j:any)=>{j.project.metadata.idea='别的主题'},(j:any)=>{j.project.lyrics[0].text='别的词'},
  (j:any)=>{j.project.lyrics[0].source='llm'},(j:any)=>{j.project.lyrics=[]},(j:any)=>{j.project.melodyDraft.phrases[0].notes[0].midi=61},
  (j:any)=>{j.project.tracks=j.project.tracks.filter((t:any)=>t.kind!=='vocal')},
  (j:any)=>{delete j.project.vocalAssets[j.project.lyrics[0].id]},
  (j:any)=>{j.project.vocalAssets[j.project.lyrics[0].id].dependency='outdated'},
  (j:any)=>{j.project.melodyDraft.mock=true},
 ];
 for(const edit of edits){const bad=structuredClone(job);edit(bad);assert.throws(()=>productionProject(bad,input,false));assert.equal(JSON.stringify(job),before)}
});
