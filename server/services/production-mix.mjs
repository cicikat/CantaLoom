import {readFile,rename,rm} from 'node:fs/promises';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {cacheRoot,runProcess} from './instruments.mjs';
import {measureLoudness} from './loudness.mjs';
import {fingerprint} from './production-checkpoints.mjs';

export function cacheAudioFile(asset,directory=cacheRoot){
 const key=/^\/api\/audio\/([a-f0-9]{64})\.wav$/.exec(asset?.audioUrl)?.[1];
 if(!key||asset.mock||asset.isDemo)throw Error('无效的真实音频引用');
 return path.join(directory,key+'.wav');
}

export function inspectPcm(bytes,{stereo=false,seconds}={}){
 if(bytes.length<44||bytes.toString('ascii',0,4)!=='RIFF'||bytes.toString('ascii',8,12)!=='WAVE'||
    bytes.readUInt32LE(4)+8!==bytes.length)throw Error('WAV 容器无效');
 let format,data;
 for(let offset=12;offset+8<=bytes.length;){
  const name=bytes.toString('ascii',offset,offset+4),size=bytes.readUInt32LE(offset+4);
  const start=offset+8,end=start+size;
  if(end>bytes.length)throw Error('WAV 数据不完整');
  if(name==='fmt ')format=bytes.subarray(start,end);
  if(name==='data')data=bytes.subarray(start,end);
  offset=end+(size%2);
 }
 if(!format||format.length<16||!data?.length||format.readUInt16LE(0)!==1||format.readUInt16LE(14)!==16)throw Error('需要 PCM 16 位 WAV');
 const channels=format.readUInt16LE(2),rate=format.readUInt32LE(4),alignment=channels*2;
 if(![1,2].includes(channels)||stereo&&channels!==2||rate<8000||rate>192000||
    format.readUInt16LE(12)!==alignment||data.length%alignment)throw Error('WAV 声道或采样格式错误');
 const durationSeconds=data.length/alignment/rate;
 if(seconds!==undefined&&Math.abs(durationSeconds-seconds)>.03)throw Error('WAV 时长与工程不匹配');
 let peak=0,clipped=0;
 for(let offset=0;offset<data.length;offset+=2){
  const amplitude=Math.abs(data.readInt16LE(offset));
  peak=Math.max(peak,amplitude);
  if(amplitude>=32767)clipped++;
 }
 if(peak===0)throw Error('WAV 全静音');
 if(clipped/(data.length/2)>.001)throw Error('WAV 严重削波');
 return {durationSeconds,sampleRate:rate,channels,peak:peak/32768,sha256:fingerprint(bytes)};
}

export function createProductionMixer({binary=()=>process.env.FFMPEG_PATH||'ffmpeg',directory=cacheRoot}={}){
 async function assetHash(asset){
  return inspectPcm(await readFile(cacheAudioFile(asset,directory))).sha256;
 }
 return {assetHash,async mix(job,destination){
  const project=job.project;
  const seconds=Math.max(...project.sections.map(section=>section.start+section.beats))*60/project.bpm;
  if(!Number.isFinite(seconds)||seconds<20||seconds>30.001)throw Error('工程时长无效');
  const band=Object.values(job.instrumentAssets);
  const vocals=project.lyrics.map(line=>({asset:project.vocalAssets[line.id],delay:Math.max(0,Math.round(project.vocalAssets[line.id].startSeconds*1000))}));
  if(!band.length||!vocals.length)throw Error('器乐或人声缺失');
  const tracks=[...band.map(asset=>({asset,delay:0,vocal:false})),...vocals.map(item=>({...item,vocal:true}))];
  const ffmpeg=binary(),cwd=path.dirname(destination);
  const temp=destination+'.'+randomUUID()+'.wav';
  const settings=project.mixSettings?.enabled?project.mixSettings:{reverb:0};
  const args=['-hide_banner','-nostdin','-loglevel','error','-y'];
  const filters=[];
  for(const [index,{asset,delay,vocal}] of tracks.entries()){
   if(!Number.isSafeInteger(delay)||delay<0)throw Error('音轨起点无效');
   await assetHash(asset);
   args.push('-i',cacheAudioFile(asset,directory));
   const gain=vocal?settings.vocalGain??1:settings.bandGain??1;
   const reverb=vocal?(settings.reverb??.08):0;
   filters.push('['+index+':a]aresample=48000,aformat=channel_layouts=stereo,volume='+gain+
    (reverb>0?',aecho=1:1:53|97:'+reverb+'|'+(reverb/2):'')+
    ',adelay='+delay+':all=1[a'+index+']');
  }
  const labels=tracks.map((_,index)=>'[a'+index+']').join('');
  filters.push(labels+'amix=inputs='+tracks.length+':normalize=0,alimiter=limit=0.85:level=false,apad,atrim=duration='+seconds+'[mix]');
  try{
   await runProcess(ffmpeg,[...args,'-filter_complex',filters.join(';'),'-map','[mix]','-ac','2','-ar','48000','-c:a','pcm_s16le',temp],cwd);
   const pcm=inspectPcm(await readFile(temp),{stereo:true,seconds});
   const loudness=await measureLoudness(ffmpeg,temp,cwd);
   const warnings=loudness.truePeakDbtp!==null&&loudness.truePeakDbtp>=0?['TRUE_PEAK_CLIPPING']:[];
   await rename(temp,destination);
   return {...pcm,...loudness,warnings};
  }finally{await rm(temp,{force:true})}
 }};
}
