import {readFile,writeFile,mkdir} from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {z} from 'zod';
import {externalRoot,cacheRoot,InstrumentRenderer} from '../services/instruments.mjs';
import {importInput,audioFileSchema,instrumentResultSchema} from '../../shared/contracts/index.mjs';
const hash=x=>createHash('sha256').update(x).digest('hex');
export function mountInstruments(app){const renderer=new InstrumentRenderer();
 app.get('/api/singing/dictionary',async(_req,res)=>{try{const text=await readFile(process.env.DIFFSINGER_DICTIONARY||path.join(externalRoot,'DiffSinger/dictionaries/opencpop-extension.txt'),'utf8');res.json(Object.fromEntries(text.trim().split(/\r?\n/).map(l=>l.split('\t'))))}catch{res.status(503).json({error:'DiffSinger 音素词典缺失'})}});
 app.post('/api/singing/import',async(req,res)=>{try{
  const {wav,voice}=importInput.parse(req.body);
  const bytes=Buffer.from(wav,'base64');if(bytes.length<44||bytes.subarray(0,4).toString()!=='RIFF'||bytes.subarray(8,12).toString()!=='WAVE')throw Error('需要真实 WAV 文件');
  const key=hash(bytes);await mkdir(cacheRoot,{recursive:true});await writeFile(path.join(cacheRoot,key+'.wav'),bytes);await writeFile(path.join(cacheRoot,key+'.json'),JSON.stringify({providerId:voice.providerId,voice,importedAt:new Date().toISOString(),sha256:key},null,2));res.json({audioUrl:`/api/audio/${key}.wav`,key});
 }catch(e){res.status(400).json({error:e.message})}});
 app.get('/api/engines',async(_req,res)=>res.json({instruments:await renderer.status(),singing:'file-exchange; voicebank not selected'}));
 app.post('/api/instruments/render',async(req,res)=>{try{res.json(instrumentResultSchema.parse(await renderer.render(req.body)))}catch(e){res.status(e instanceof z.ZodError?400:503).json({error:e.message})}});
 app.get('/api/audio/:file',async(req,res)=>{if(!audioFileSchema.safeParse(req.params.file).success)return res.status(400).end();res.sendFile(path.join(cacheRoot,req.params.file),e=>{if(e&&!res.headersSent)res.status(404).json({error:'音频缓存已丢失，请重新生成或导入'})})});
}
