import {readFile,writeFile,mkdir,access} from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {z} from 'zod';
import {externalRoot,cacheRoot,runProcess} from './instruments.mjs';
const dsSchema=z.array(z.object({offset:z.number().min(0).max(35),text:z.string().max(500),ph_seq:z.string().max(5000),ph_num:z.string().regex(/^\d+( \d+)*$/),note_seq:z.string().max(5000),note_dur:z.string().regex(/^[\d.]+( [\d.]+)*$/),note_slur:z.string().regex(/^[01]( [01])*$/)}).strict()).length(1);
async function voices(){try{return z.array(z.object({id:z.string().min(1),version:z.string().min(1),label:z.string(),variance:z.string().regex(/^[\w.-]+$/),acoustic:z.string().regex(/^[\w.-]+$/)}).strict()).parse(JSON.parse(await readFile(path.join(externalRoot,'voicebanks/voices.json'),'utf8')))}catch(e){if(e.code==='ENOENT')return [];throw e}}
const pending=new Map();
export function mountSinging(app){
 app.get('/api/singing/voices',async(_req,res)=>{try{res.json(await voices())}catch{res.status(503).json({error:'声库注册文件无效'})}});
 app.post('/api/singing/render',async(req,res)=>{try{
  const input=z.object({voiceId:z.string(),voiceVersion:z.string(),ds:dsSchema}).strict().parse(req.body);const voice=(await voices()).find(v=>v.id===input.voiceId&&v.version===input.voiceVersion);if(!voice)throw Error('尚未选择并安装已授权的原生 DiffSinger checkpoint 声库');
  const ds=structuredClone(input.ds);ds[0].offset=0;
  const key=createHash('sha256').update(JSON.stringify({voice,ds,revision:1})).digest('hex');
  if(!pending.has(key))pending.set(key,(async()=>{
   await mkdir(cacheRoot,{recursive:true});const output=path.join(cacheRoot,key+'.wav');try{await access(output);return {audioUrl:`/api/audio/${key}.wav`,cached:true,providerId:'diffsinger',voiceId:voice.id,voiceVersion:voice.version}}catch{}
   const root=path.join(externalRoot,'DiffSinger'),python=process.env.DIFFSINGER_PYTHON||path.join(root,'.venv/Scripts/python.exe'),file=path.join(cacheRoot,key+'.ds');await writeFile(file,JSON.stringify(ds));const started=performance.now();
   await runProcess(python,['scripts/infer.py','variance',file,'--exp',voice.variance,'--out',cacheRoot,'--title',key+'-variance','--seed','42'],root,600000);
   await runProcess(python,['scripts/infer.py','acoustic',path.join(cacheRoot,key+'-variance.ds'),'--exp',voice.acoustic,'--out',cacheRoot,'--title',key,'--seed','42'],root,600000);
   await access(output);const result={audioUrl:`/api/audio/${key}.wav`,cached:false,providerId:'diffsinger',voiceId:voice.id,voiceVersion:voice.version,milliseconds:Math.round(performance.now()-started)};await writeFile(path.join(cacheRoot,key+'.json'),JSON.stringify({voice,ds,...result},null,2));return result;
  })());
  try{res.json(await pending.get(key))}finally{pending.delete(key)}
 }catch(e){res.status(e instanceof z.ZodError?400:503).json({error:e.message})}});
}
