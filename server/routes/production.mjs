import {createProduction,productionDetails,serializeProductionJob} from '../services/production.mjs';
import {productionInputSchema} from '../../shared/contracts/production.mjs';

export function mountProduction(app,options){
 const production=createProduction(options);
 app.post('/api/production',(req,res)=>{
  const input=productionInputSchema.safeParse(req.body);
  if(!input.success)return res.status(400).json({error:'制作输入无效'});
  try{
   const job=production.start(input.data);
   res.status(202).json({id:job.id,state:job.state,stage:job.stage});
  }catch{res.status(503).json({error:'无法启动制作任务'})}
 });
 function find(req,res){
  res.set('Cache-Control','no-store');
  const job=production.get(req.params.id);
  if(!job)res.status(404).json({error:'任务不存在'});
  return job;
 }
 app.get('/api/production/:id',(req,res)=>{
  const job=find(req,res);
  if(job)res.json(serializeProductionJob(job));
 });
 app.get('/api/production/:id/details',(req,res)=>{
  const job=find(req,res);
  if(job)res.json(productionDetails(job));
 });
 app.post('/api/production/:id/resume',(req,res)=>{
  if(!find(req,res))return;
  try{res.status(202).json(productionDetails(production.resume(req.params.id)))}
  catch{res.status(409).json({error:'当前任务不能继续制作'})}
 });
 app.get('/api/production/:id/wav',async(req,res)=>{
  if(!find(req,res))return;
  try{
   const bytes=await production.artifact(req.params.id);
   if(!bytes)return res.status(409).json({error:'成品尚不可下载，请查看任务详情'});
   if(req.query.download==='1')res.attachment('CantaLoom-'+req.params.id+'.wav');
   res.type('audio/wav').send(bytes);
  }catch{res.status(503).json({error:'成品暂不可读取'})}
 });
 app.post('/api/production/:id/retry/:phraseId',async(req,res)=>{
  try{res.json(serializeProductionJob(await production.retry(req.params.id,req.params.phraseId)))}
  catch{res.status(409).json({error:'当前任务不能重试该句'})}
 });
 return production;
}
