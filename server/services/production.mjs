import {readFile,rm} from 'node:fs/promises';
import {openCheckpoints,fingerprint} from './production-checkpoints.mjs';
import {TaskError} from './llm-router.mjs';
import {createPerformancePlanner} from './performance-planner.mjs';
import {resolveRoute} from './llm-router.mjs';
import {randomUUID} from 'node:crypto';
import {createFreeComposer} from './free-composition.mjs';
import {buildFreeScore} from '../../shared/free-score.mjs';
import {resolvePerformance} from '../../shared/performance.mjs';
import {qixuanStatus,renderQixuan} from './qixuan.mjs';
import {InstrumentRenderer} from './instruments.mjs';
import {productionInputSchema,productionJobSchema,performanceTraceSchema} from '../../shared/contracts/production.mjs';
import {projectInstrumentInput} from '../../shared/groove.mjs';
// Explicit public projection: never serialize the mutable internal job wholesale.
export function serializeProductionJob(job){
 const fields=['mock','id','state','stage','project','composition','phraseId','completedPhrases','error','errorCode'];
 const result=Object.fromEntries(fields.filter(key=>job[key]!==undefined).map(key=>[key,job[key]]));
 if(job.performancePlanning){
  result.performancePlanning={status:job.performancePlanning.status};
  if(job.performancePlanning.status==='succeeded'&&job.performanceTrace){
   const keys=['provider','model','promptVersion','attempts','promptTokens','completionTokens','milliseconds','cost','costCurrency'];
   const trace=performanceTraceSchema.safeParse(Object.fromEntries(keys.map(key=>[key,job.performanceTrace[key]])));
   if(trace.success)result.performancePlanning.trace=trace.data;
  }
 }
 // Engine results carry cache paths and diagnostics outside the persisted VocalAsset contract.
 if(result.project?.vocalAssets){
  const assetFields=['audioUrl','dependency','providerId','voiceId','voiceVersion','startSeconds','durationSeconds','isDemo','mock','projectVersion','engineVersion','renderParameters','take','createdAt'];
  result.project={...result.project,vocalAssets:Object.fromEntries(Object.entries(result.project.vocalAssets).map(([id,asset])=>[id,Object.fromEntries(assetFields.filter(key=>asset[key]!==undefined).map(key=>[key,asset[key]]))]))};
 }
 return productionJobSchema.parse(result);
}

const stageLabels={
 checking:'引擎预检',composing:'作曲',planning:'歌词规划',melody:'旋律',validated:'工程组装',
 performance_planning:'演唱表现规划',instruments:'器乐渲染',singing:'歌声合成',mixing:'混音和音频验收',
};
export function createProduction({env=process.env,compose=createFreeComposer({env}),renderer=new InstrumentRenderer(),
 voiceStatus=qixuanStatus,sing=renderQixuan,ffmpegReady=()=>true,isPaused=()=>false,
 performancePlanner=createPerformancePlanner({env}),directory,mixer}={}){
 if(mixer&&!directory)throw Error('成品制作需要检查点目录');
 const store=directory?openCheckpoints(directory):null;
 const jobs=store?.jobs??new Map();
 const save=job=>store?.save(job);
 const dependency=(p,l,a)=>JSON.stringify({bpm:p.bpm,start:l.start,end:l.end,text:l.text,
  notes:l.notes.map(n=>[n.beat,n.duration,n.midi,n.syllable]),
  ...(l.performance?{performance:resolvePerformance(l.performance)}:{}),
  voice:{id:a.voiceId,version:a.voiceVersion,providerId:a.providerId,
   ...(a.engineVersion?{engineVersion:a.engineVersion}:{}),
   ...(a.renderParameters?{renderParameters:{runner:a.renderParameters.runner,steps:a.renderParameters.steps,depth:a.renderParameters.depth}}:{})}});
 function phase(job,name,legacy=name){
  job.phase=name;job.stage=legacy;save(job);
 }
 async function reuse(job,id,asset){
  if(!asset)return false;
  if(!mixer)return true;
  const expected=job.assetHashes[id];
  return expected!==undefined&&await mixer.assetHash(asset).catch(()=>null)===expected;
 }
 async function acceptAsset(job,id,asset){
  if(mixer)job.assetHashes[id]=await mixer.assetHash(asset);
 }
 async function renderLines(job,voice,only){
  const p=job.project;
  for(const line of p.lyrics){
   if(only&&only!==line.id)continue;
   const current=p.vocalAssets?.[line.id];
   if(await reuse(job,line.id,current)&&(!mixer||current.engineVersion===voice.engineVersion))continue;
   if(current)delete p.vocalAssets[line.id];
   job.completedPhrases=Object.keys(p.vocalAssets??{}).length;
   job.phraseId=line.id;phase(job,'singing');
   const asset=await sing({lyricId:line.id,lyrics:line.text,start:line.start,end:line.end,bpm:p.bpm,
    notes:line.notes,runner:p.singingRunner||'CPU',take:0,engineVersion:voice.engineVersion,performance:line.performance});
   await acceptAsset(job,line.id,asset);
   p.vocalAssets={...p.vocalAssets,[line.id]:{...asset,dependency:dependency(p,line,asset),projectVersion:p.metadata.updatedAt}};
   job.completedPhrases=Object.keys(p.vocalAssets).length;
   save(job);
  }
  p.vocalMode='external';
 }
 function fail(job,error){
  job.state='failed';
  job.failureCode=error instanceof TaskError?error.code:job.phase==='mixing'?'MIX_FAILED':'STAGE_FAILED';
  job.failureTrace=error instanceof TaskError?error.trace:undefined;
  if(job.phase==='performance_planning'){
   job.performancePlanning={status:'failed'};
   job.errorCode='PERFORMANCE_PLANNING_FAILED';
  }
  job.error=(stageLabels[job.phase]??'制作')+'失败'+(error instanceof TaskError?'：'+error.message:'')+'。已保存通过验收的阶段，可继续制作。';
 }
 async function run(job,only){
  try{
   const voice=await voiceStatus(),band=await renderer.status();
   if(!voice.available||!band.ready||!ffmpegReady()){
    throw new TaskError('DEPENDENCY_UNAVAILABLE','需要 FluidSynth、绮萱和 FFmpeg');
   }
   const {grooveSettings,...creationInput}=job.input;
   if(!job.composition){
    phase(job,'composing');
    job.composition=await compose.compose(creationInput,stage=>phase(job,stage),job.checkpoint,()=>save(job));
    save(job);
   }
   if(!job.project){
    phase(job,'validated');
    job.project=buildFreeScore(job.composition,randomUUID);
    if(grooveSettings!==undefined)job.project.grooveSettings={...grooveSettings};
    job.project.instrumentMode='fluidsynth';
    save(job);
   }
   if(!['succeeded','skipped','disabled'].includes(job.performancePlanning?.status)){
    if(JSON.parse(env.LLM_ROUTES||'{}').performance_planning){
     job.performancePlanning={status:'running'};
     phase(job,'performance_planning','validated');
     resolveRoute(env,'performance_planning');
     const planned=await performancePlanner.plan(job.project);
     job.project=planned.project;job.performanceTrace=planned.trace;
     job.performancePlanning={status:planned.trace===null?'skipped':'succeeded'};
    }else if(job.performancePlanning){
     phase(job,'performance_planning','validated');
     throw new TaskError('DEPENDENCY_UNAVAILABLE');
    }else job.performancePlanning={status:'disabled'};
    save(job);
   }
   if(!only){
    phase(job,'instruments');
    for(const track of job.project.tracks.filter(track=>track.kind!=='vocal'&&track.notes.length)){
     const input=projectInstrumentInput(job.project,track);
     const expectedKey=mixer&&renderer.resolveRender?(await renderer.resolveRender(input)).key:undefined;
     const current=job.instrumentAssets[track.id];
     if((!expectedKey||current?.key===expectedKey)&&await reuse(job,track.id,current))continue;
     const asset=await renderer.render(input,{expectedKey});
     await acceptAsset(job,track.id,asset);
     job.instrumentAssets[track.id]=asset;
     save(job);
    }
   }
   await renderLines(job,voice,only);
   if(!job.project.lyrics.every(line=>job.project.vocalAssets?.[line.id])){
    throw Error('尚有未完成的乐句');
   }
   if(mixer){
    phase(job,'mixing','singing');
    const destination=store.artifact(job.id);
    await rm(destination,{force:true});
    job.artifact=await mixer.mix(job,destination);
    job.artifact.inputHash=job.inputHash;
    job.artifact.assetsHash=fingerprint(JSON.stringify(job.assetHashes));
   }
   job.phase=mixer?'completed':'ready-for-mix';
   job.stage='ready-for-mix';job.state='succeeded';
  }catch(error){fail(job,error)}
  job.finishedAt=new Date().toISOString();
  try{save(job)}catch{
   job.state='failed';job.error='无法写入制作检查点，请检查存储目录';job.failureCode='CHECKPOINT_WRITE_FAILED';
  }
 }
 function restart(job,only){
  if(isPaused()||[...jobs.values()].some(item=>item.state==='running'&&item.id!==job.id)&&store){
   throw Error('已有制作任务运行中或正在更新配置');
  }
  job.state='running';
  for(const field of ['interrupted','error','errorCode','failureCode','failureTrace','finishedAt'])delete job[field];
  try{save(job)}catch(error){job.state='failed';throw error}
  return run(job,only);
 }
 return {
  start(raw){
   if(isPaused()||store&&[...jobs.values()].some(job=>job.state==='running'))throw Error('制作任务已满或配置更新中');
   const input=productionInputSchema.parse(raw);
   if(jobs.size>=30){
    const old=[...jobs.values()].filter(job=>job.state!=='running').sort((a,b)=>a.createdAt.localeCompare(b.createdAt))[0];
    if(!old)throw Error('任务已满');
    store?.remove(old.id);jobs.delete(old.id);
   }
   const job={id:randomUUID(),state:'running',stage:'queued',phase:'checking',input,
    inputHash:fingerprint(JSON.stringify(input)),createdAt:new Date().toISOString(),
    completedPhrases:0,checkpoint:{},instrumentAssets:{},assetHashes:{}};
   save(job);jobs.set(job.id,job);
   void run(job);
   return job;
  },
  list:()=>[...jobs.values()].map(j=>({id:j.id,state:j.state,stage:j.stage,phraseId:j.phraseId,completedPhrases:j.completedPhrases,error:j.error})),
  get:id=>jobs.get(id),
  resume(id){
   const job=jobs.get(id);
   if(!job||job.state!=='failed')throw Error('当前任务不能继续');
   void restart(job);
   return job;
  },
  async retry(id,phraseId){
   const job=jobs.get(id);
   if(!job||job.state!=='failed'||job.phase!=='singing'||!job.project?.lyrics.some(line=>line.id===phraseId)||job.project.vocalAssets?.[phraseId]){
    throw Error('不可重试的乐句');
   }
   await restart(job,phraseId);
   return job;
  },
  async artifact(id){
   const job=jobs.get(id);
   if(!job?.artifact||job.state!=='succeeded'||job.artifact.inputHash!==job.inputHash||
    job.artifact.assetsHash!==fingerprint(JSON.stringify(job.assetHashes)))return null;
   const bytes=await readFile(store.artifact(id)).catch(()=>null);
   if(bytes&&fingerprint(bytes)===job.artifact.sha256)return bytes;
   job.state='failed';job.phase='mixing';job.stage='singing';job.failureCode='ARTIFACT_INVALID';
   job.error='成品文件已损坏或丢失，可从混音继续制作';
   save(job);
   return null;
  },
 };
}

export function productionDetails(job){
 return {id:job.id,state:job.interrupted?'interrupted':job.state,phase:job.phase,
  completed:{planning:!!job.checkpoint.plan,melody:!!job.checkpoint.draft,score:!!job.project,
   instruments:Object.keys(job.instrumentAssets).length,phrases:job.completedPhrases},
  ...(job.project?{title:job.project.metadata.title,lyrics:job.project.lyrics.map(line=>line.text)}:{}),
  updatedAt:job.updatedAt,canResume:job.state==='failed',retryMayBill:!job.composition||job.performancePlanning?.status==='failed',
  ...(job.error?{error:job.error,errorCode:job.failureCode}:{}),
  traces:{planning:job.checkpoint.planningTrace,melody:job.checkpoint.melodyTrace,performance:job.performanceTrace,failure:job.failureTrace},
  ...(job.state==='succeeded'&&job.artifact?{artifact:{...job.artifact,url:'/api/production/'+job.id+'/wav'}}:{})};
}
