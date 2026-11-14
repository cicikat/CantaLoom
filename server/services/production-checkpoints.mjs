import {createHash,randomUUID} from 'node:crypto';
import {mkdirSync,readFileSync,readdirSync,renameSync,rmSync,writeFileSync} from 'node:fs';
import path from 'node:path';
import {productionInputSchema} from '../../shared/contracts/production.mjs';

const uuid=/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/;
export const fingerprint=value=>createHash('sha256').update(value).digest('hex');

export function openCheckpoints(directory){
 mkdirSync(directory,{recursive:true,mode:0o700});
 const file=id=>path.join(directory,id+'.json');
 const artifact=id=>path.join(directory,id+'.wav');
 function save(job){
  job.updatedAt=new Date().toISOString();
  const temporary=file(job.id)+'.'+randomUUID()+'.tmp';
  try{
   writeFileSync(temporary,JSON.stringify({schemaVersion:1,job}),{mode:0o600});
   renameSync(temporary,file(job.id));
  }finally{rmSync(temporary,{force:true})}
 }
 const jobs=new Map();
 for(const name of readdirSync(directory)){
  const id=name.slice(0,-5);
  if(!name.endsWith('.json')||!uuid.test(id))continue;
  let record;
  try{record=JSON.parse(readFileSync(file(id),'utf8'))}catch{continue}
  const {job}=record;
  if(record.schemaVersion!==1||job?.id!==id||!productionInputSchema.safeParse(job.input).success||
    job.inputHash!==fingerprint(JSON.stringify(job.input)))continue;
  if(job.state==='running'){
   job.state='failed';job.interrupted=true;job.failureCode='INTERRUPTED';
   job.error='服务中断，已保存的阶段可继续制作';
   save(job);
  }
  jobs.set(id,job);
 }
 return {jobs,save,artifact,remove(id){rmSync(file(id),{force:true});rmSync(artifact(id),{force:true})}};
}
