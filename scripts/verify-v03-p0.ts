import {legacyMechanicalNotes} from './legacy-melody';
import {mkdir,writeFile,copyFile,readFile} from 'node:fs/promises';
import path from 'node:path';
import {createProject,lyricNotes} from '../src/composer';
// @ts-expect-error Node backend
import {qixuanStatus,renderQixuan} from '../server/services/qixuan.mjs';
const output=path.resolve('D:/ai/hacson/external/runtime/exports/v03-p0');await mkdir(output,{recursive:true});
const p=createProject(),l=p.lyrics[0];l.text='海风吹过我的窗';const old=legacyMechanicalNotes(l,p);
const rhythms=[.5,.5,1,.5,1.5,.5,1],pitches=[67,67,72,69,69,64,67];let cursor=l.start;const manual=old.map((n,i)=>{if(i===3)cursor+=.5;const result={...n,beat:cursor,duration:rhythms[i],midi:pitches[i]};cursor+=rhythms[i];return result});
const voice=await qixuanStatus(),reports=[];for(const [label,notes] of [['mechanical',old],['manual',manual]] as const){const result=await renderQixuan({lyricId:l.id,lyrics:l.text,start:l.start,end:l.end,bpm:p.bpm,notes,runner:'CPU',take:700,engineVersion:voice.engineVersion});const source=path.join('D:/ai/hacson/external/runtime/cache',result.key+'.wav');await copyFile(source,path.join(output,label+'.wav'));await copyFile(source.replace('.wav','.ustx'),path.join(output,label+'.ustx'));reports.push({label,notes,result});console.log({label,cached:result.cached,rms:result.rms})}await writeFile(path.join(output,'report.json'),JSON.stringify({bpm:p.bpm,reports},null,2));
