import {createProductionMixer} from './services/production-mix.mjs';
import {mountPv} from './routes/pv.mjs';
import {mountProduction} from './routes/production.mjs';
import {mountFreeComposition} from './routes/free-composition.mjs';
import {mountMelody} from './routes/melody.mjs';
import {createVideoService} from './services/export.mjs';
import {mountExport} from './routes/export.mjs';
import {mountPlanning} from './routes/planning.mjs';
export {subtitles} from './services/export.mjs';
import express from 'express';
import {access} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createPlanner} from './services/planner.mjs';
import {mountInstruments} from './routes/instruments.mjs';
import {mountSinging} from './singing.mjs';
import {mountQixuan} from './routes/qixuan.mjs';
import {qixuanStatus} from './services/qixuan.mjs';
import {externalRoot,InstrumentRenderer,runProcess} from './services/instruments.mjs';
import {createConfigStore} from './admin-config.mjs';
import {mountAdmin,createJobs} from './admin.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const settings=await createConfigStore({directory:path.join(externalRoot,'runtime/config')});
const app=express();app.disable('x-powered-by');app.use(express.json({limit:'24mb'}));
const jobs=createJobs();app.use(jobs.middleware);
mountFreeComposition(app);
mountPv(app);
mountMelody(app);
mountInstruments(app);
mountSinging(app);
mountQixuan(app);
const video=await createVideoService(root);
const production=mountProduction(app,{isPaused:()=>jobs.isPaused(),ffmpegReady:()=>video.ready,
 directory:path.join(externalRoot,'runtime/jobs/production'),mixer:createProductionMixer({binary:()=>video.binary})});
jobs.addSource(()=>production.list().map(job=>({...job,type:'自动制作'})));
let planner=createPlanner();
mountAdmin(app,{store:settings,jobs,root:externalRoot,projectRoot:root,publicDirectory:path.join(root,'server/public'),previewVideo:bytes=>video.preview(bytes),onConfig:async()=>{planner=createPlanner();await video.refresh()},diagnostics:async()=>{
 const instruments=await new InstrumentRenderer().status();
 const probe=async(command,args)=>{try{return {available:true,version:(await runProcess(command,args,externalRoot,10000)).split(/\r?\n/)[0]}}catch{return {available:false,message:'未安装、路径错误或运行失败'}}};
 const python=process.env.DIFFSINGER_PYTHON||path.join(externalRoot,'DiffSinger/.venv/Scripts/python.exe');
 const openutau=process.env.OPENUTAU_PATH||path.join(externalRoot,'OpenUtau/OpenUtau.exe');let openUtauInstalled=false;try{await access(openutau);openUtauInstalled=true}catch{}
 return {production:production.list(),instruments,qixuan:await qixuanStatus(),ffmpeg:await probe(video.binary,['-version']),python:await probe(python,['--version']),diffSingerDependencies:await probe(python,['-c','import torch,librosa,pyworld; print("PyTorch " + torch.__version__ + "; CUDA " + str(torch.cuda.is_available()))']),openUtau:{installed:openUtauInstalled,mode:'官方组件桥接 + GUI 工程交换'},gpu:await probe('nvidia-smi',['--query-gpu=name,memory.total,memory.used,driver_version','--format=csv,noheader'])};
}});
mountPlanning(app,{planner:()=>planner,video});
mountExport(app,video);
try{await access(path.join(root,'dist','index.html'));app.use(express.static(path.join(root,'dist')));app.get('/{*path}',(_req,res)=>res.sendFile(path.join(root,'dist','index.html')))}catch{/* Vite serves source during development */}
app.use((err,_req,res,_next)=>{if(!res.headersSent)res.status(err.status||500).json({error:err.status===413?'请求过大，最大 24 MB':'请求无效或服务异常'})});
const port=Number(process.env.PORT||3001);app.listen(port,'127.0.0.1',()=>console.log(`CantaLoom API http://127.0.0.1:${port} · FFmpeg ${video.ready?'ready':'unavailable'} · LLM ${process.env.LLM_API_KEY?'configured':'local-only'}`));
