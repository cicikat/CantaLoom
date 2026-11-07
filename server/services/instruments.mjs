import {spawn} from 'node:child_process';
import {access,readFile,writeFile,mkdir,rename,rm,stat,readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {z} from 'zod';
import {midiFile} from '../../shared/midi.mjs';
export const externalRoot=path.resolve(process.env.SONGYU_EXTERNAL_ROOT||'D:/ai/hacson/external');
export const cacheRoot=path.join(externalRoot,'runtime/cache');
export function runProcess(command,args,cwd,timeout=120000){return new Promise((resolve,reject)=>{
 const child=spawn(command,args,{cwd,windowsHide:true,stdio:['ignore','pipe','pipe']});let output='';let settled=false;
 const finish=(error)=>{if(settled)return;settled=true;clearTimeout(timer);error?reject(error):resolve(output)};
 const timer=setTimeout(()=>{child.kill();finish(Error('外部引擎超时'))},timeout);
 for(const stream of [child.stdout,child.stderr])stream.on('data',x=>output=(output+x).slice(-6000));
 child.on('error',finish);child.on('close',code=>finish(code===0?undefined:Error(`外部引擎失败 (${code}): ${output.slice(-1200)}`)));
})}
export {instrumentInput} from '../../shared/contracts/index.mjs';
import {instrumentInput} from '../../shared/contracts/index.mjs';
const hash=x=>createHash('sha256').update(x).digest('hex');
// 48 kHz render revision: the cache key contains rate+revision, so legacy 24 kHz files become unreachable on their own.
export const renderRate=48000,renderRevision=2;
export class InstrumentRenderer {
 constructor(){this.pending=new Map();}
 get binary(){return process.env.FLUIDSYNTH_PATH||path.join(externalRoot,'FluidSynth/fluidsynth-v2.6.2-win10-x64-cpp11/bin/fluidsynth.exe')}
 async soundfonts(){try{return (await readdir(path.join(externalRoot,'soundfonts'))).filter(n=>/\.(sf2|sf3)$/i.test(n));}catch{return []}}
 async status(){const soundfonts=await this.soundfonts();try{return {installed:true,version:(await runProcess(this.binary,['--version'],externalRoot,5000)).split('\n')[0],soundfonts,ready:!!soundfonts.length};}catch{return {installed:false,ready:false,soundfonts}}}
 async render(raw){const input=instrumentInput.parse(raw);const fonts=await this.soundfonts();const selected=input.soundfont||process.env.SONGYU_SOUNDFONT||fonts[0];if(!fonts.includes(selected))throw Error('音源缺失：请选择已安装的 SF2/SF3');
  const sf=path.join(externalRoot,'soundfonts',selected);const bytes=await readFile(sf);const engine=await stat(this.binary).catch(()=>{throw Error('FluidSynth 未安装或路径无效')});
  const key=hash(JSON.stringify({input,sf:hash(bytes),engine:[engine.size,engine.mtimeMs],rate:renderRate,revision:renderRevision}));
  if(this.pending.has(key))return this.pending.get(key);
  const work=this.renderOne(input,sf,key,selected);this.pending.set(key,work);try{return await work}finally{this.pending.delete(key)}
 }
 async renderOne(input,sf,key,name){await mkdir(cacheRoot,{recursive:true});const wav=path.join(cacheRoot,key+'.wav');const result={audioUrl:`/api/audio/${key}.wav`,key,providerId:'fluidsynth',soundfont:name,sampleRate:renderRate,startSeconds:0};
  try{await access(wav);return {...result,cached:true}}catch{}
  const midi=midiFile({bpm:input.bpm,tracks:[input],endBeat:input.endBeat});await writeFile(path.join(cacheRoot,key+'.mid'),midi);
  const temp=path.join(cacheRoot,key+'.pending.wav');try{
   await runProcess(this.binary,['-ni','-r',String(renderRate),'-g','0.6','-R','0','-C','0','-T','wav','-O','s16','-F',temp,sf,path.join(cacheRoot,key+'.mid')],externalRoot);
   const data=await readFile(temp);if(data.subarray(0,4).toString()!=='RIFF'||data.length<100)throw Error('引擎未生成有效 WAV');await rename(temp,wav);await writeFile(path.join(cacheRoot,key+'.json'),JSON.stringify({input,...result},null,2));return {...result,cached:false};
  }finally{await rm(temp,{force:true})}
 }
}
