import {freeInputSchema,freePlanSchema,freeResultSchema,type FreeInput,type FreeResult} from '../../shared/contracts/free-composition.mjs';
import {melodyRequestSchema,melodyResponseSchema,type MelodyRequest} from '../../shared/contracts/melody.mjs';
import {productionJobSchema,type ProductionJob} from '../../shared/contracts/production.mjs';
import {freeTimeline} from '../../shared/free-timeline.mjs';
import {localMelody,validateMelody} from '../../shared/melody.mjs';
import {buildFreeScore} from '../../shared/free-score.mjs';
import {validateProject,uid,type SongProject} from '../model';
import {singingDependency} from '../singing';

const model='mock-fixture-no-inference';
const songPlan={key:{tonic:'C',mode:'major'},emotion:'bright',intensity:.6,chordProgression:[1,5,6,4],drumDensity:'steady',melodyContour:'arch',melodyRange:'medium',sectionEnergy:{intro:.4,verse:.6,chorus:.8,outro:.4},reasons:[{decision:'key',reason:'MOCK 固定测试数据，未调用 LLM。'}]} as const;

export function mockMelody(input:MelodyRequest){
 const request=melodyRequestSchema.parse(input);
 // A fixture preserves a partly locked phrase in full; it never claims AI continuation.
 const generation={...request,phrases:request.phrases.map(p=>({...p,text:p.text||'风吹过测试小岛',locked:p.locked||p.notes.some(n=>n.locked)}))};
 const draft=localMelody(generation);
 draft.phrases=draft.phrases.map((p,i)=>({...p,locked:request.phrases[i].locked}));
 // Two deterministic octave variants exercise targeted edits without pretending to infer.
 if(request.targetIds)for(const phrase of draft.phrases){
  const before=request.phrases.find(p=>p.id===phrase.id)!;
  if(!request.targetIds.includes(phrase.id)||before.locked||before.notes.some(n=>n.locked))continue;
  const shifted=before.notes[0]?.midi===phrase.notes[0]?.midi+12;
  if(!shifted)phrase.notes=phrase.notes.map(n=>({...n,midi:n.midi+12}));
 }
 return melodyResponseSchema.parse({mock:true,model,draft:validateMelody(request,{...draft,mock:true})});
}

export function mockComposition(raw:FreeInput):FreeResult {
 const input=freeInputSchema.parse(raw),lyrics=input.lyrics??['风吹过测试小岛','灯照着测试海岸'];
 const plan=freePlanSchema.parse({title:'MOCK 自由创作测试作品',mood:'MOCK 固定夹具 · 未调用模型',bpm:input.bpm??96,songPlan:structuredClone(songPlan),lyrics,phraseWeights:lyrics.map(()=>1)});
 const timeline=freeTimeline(input,plan,uid);
 const response=mockMelody({intent:input.intent,bpm:timeline.bpm,songPlan:plan.songPlan,phrases:timeline.phrases});
 return freeResultSchema.parse({mock:true,requestId:uid(),source:'llm',model,input,plan,sections:timeline.sections,draft:response.draft});
}

export type MockProductionScenario='success'|'planning-failure'|'singing-failure'|'lost';
interface FixtureJob {job:ProductionJob;input:FreeInput;scenario:MockProductionScenario;step:number;project?:SongProject;composition?:FreeResult}
const stages=['checking','planning','melody','validated','instruments','singing'] as const;

// An isolated route factory lets tests select failures without adding public API fields.
// Stages advance on fixture polls, not real inference or measured progress.
export function createMockFreeRoutes(audioKey:(seconds:number,seed:string)=>Promise<string>,scenario:MockProductionScenario='success'){
 const jobs=new Map<string,FixtureJob>();
 const snapshot=(f:FixtureJob)=>Response.json(productionJobSchema.parse({...f.job,...(f.project?{project:f.project}:{}),...(f.composition?{composition:f.composition}:{})}));
 const missing=()=>Response.json({error:'MOCK 制作任务不存在或已丢失'},{status:404});
 async function sing(f:FixtureJob,id:string){
  const p=f.project!,line=p.lyrics.find(l=>l.id===id)!,seconds=(line.end-line.start)*60/p.bpm+.4;
  const voice={id:'qixuan',version:'2.7.0',providerId:'openutau-diffsinger' as const,label:'MOCK 测试音',engineVersion:'mock-fixture-v1',renderParameters:{runner:'CPU' as const,steps:20,depth:.6}};
  const dependency=singingDependency(p,line,voice),key=await audioKey(seconds,dependency);
  p.vocalAssets={...p.vocalAssets,[id]:{audioUrl:`/api/audio/${key}.wav`,dependency,providerId:voice.providerId,voiceId:voice.id,voiceVersion:voice.version,engineVersion:voice.engineVersion,renderParameters:voice.renderParameters,startSeconds:line.start*60/p.bpm,durationSeconds:seconds,isDemo:true,mock:true,projectVersion:p.metadata.updatedAt}};
  f.job.completedPhrases=Object.keys(p.vocalAssets).length;
 }
 function finish(f:FixtureJob){
  const complete=f.project!.lyrics.every(l=>f.project!.vocalAssets?.[l.id]);
  f.job.state=complete?'succeeded':'failed';f.job.stage=complete?'ready-for-mix':'singing';
  if(complete){f.project!.vocalMode='external';delete f.job.error;delete f.job.phraseId;validateProject(f.project)}
  else{f.job.error='MOCK 尚有缺失测试音，请逐句重试';f.job.phraseId=f.project!.lyrics.find(l=>!f.project!.vocalAssets?.[l.id])!.id}
 }
 return async(path:string,method:string,body:unknown):Promise<Response|undefined>=>{
  if(!/^\/api\/(compose|melody|production)(\/|$)/.test(path))return;
  try{
   if(path==='/api/compose'&&method==='POST')return Response.json(mockComposition(freeInputSchema.parse(body)));
   if(path==='/api/melody'&&method==='POST')return Response.json(mockMelody(melodyRequestSchema.parse(body)));
   if(path==='/api/production'&&method==='POST'){
    if(jobs.size>=30){const old=[...jobs].find(([,f])=>f.job.state!=='running');if(!old)return Response.json({error:'MOCK 制作任务已满'},{status:409});jobs.delete(old[0])}
    const input=freeInputSchema.parse(body),job:ProductionJob={mock:true,id:uid(),state:'running',stage:'queued',completedPhrases:0};
    const f={job,input,scenario,step:0};jobs.set(job.id,f);return new Response(await snapshot(f).text(),{status:202,headers:{'Content-Type':'application/json'}});
   }
   const match=path.match(/^\/api\/production\/([^/]+)(?:\/retry\/([^/]+))?$/);
   if(!match||method!==(match[2]?'POST':'GET'))return;
   const f=jobs.get(decodeURIComponent(match[1]));if(!f)return missing();
   if(match[2]){
    const id=decodeURIComponent(match[2]);
    if(f.job.state==='running'||!f.project?.lyrics.some(l=>l.id===id)||f.project.vocalAssets?.[id])return Response.json({error:'MOCK 不可重试的乐句'},{status:409});
    await sing(f,id);finish(f);return snapshot(f);
   }
   if(f.scenario==='lost'){jobs.delete(f.job.id);return missing()}
   if(f.job.state!=='running')return snapshot(f);
   f.job.stage=stages[Math.min(f.step++,stages.length-1)];
   if(f.job.stage==='planning'&&f.scenario==='planning-failure'){f.job.state='failed';f.job.error='MOCK 规划失败；原工程保留，请重新发起制作'}
   if(f.job.stage==='validated'){
    try{f.composition=mockComposition(f.input);f.project=validateProject(buildFreeScore(f.composition,uid))}
    catch{f.job.state='failed';f.job.error='MOCK 夹具无法通过音乐校验；请调整歌词后重新发起制作';return snapshot(f)}
    // Browser synth accompaniment is the existing local renderer; vocals are explicit test tones.
    f.project.instrumentMode='synth';
   }
   if(f.job.stage==='singing'){
    const line=f.project!.lyrics.find(l=>!f.project!.vocalAssets?.[l.id]);
    if(line){f.job.phraseId=line.id;
     if(f.scenario==='singing-failure'&&(f.job.completedPhrases??0)>=1){f.job.state='failed';f.job.error='MOCK 单句测试音失败；已完成资产保留'}
     else await sing(f,line.id);
    }
    if(f.project!.lyrics.every(l=>f.project!.vocalAssets?.[l.id]))finish(f);
   }
   return snapshot(f);
  }catch{return Response.json({error:'MOCK 输入或夹具无法通过校验；当前工程已保留'},{status:422})}
 };
}
