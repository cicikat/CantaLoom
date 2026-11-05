import {writeFile,mkdir,readFile} from 'node:fs/promises';
import path from 'node:path';
import {createProject,lyricNotes} from '../src/composer';
import {midiFile} from '../shared/midi.mjs';
import {InstrumentRenderer,externalRoot,runProcess} from '../server/instruments.mjs';
import {openUtauProject,diffSingerInput} from '../src/singing';
import {stringify} from 'yaml';
const output=path.join(externalRoot,'runtime/exports/acceptance');await mkdir(output,{recursive:true});
const p=createProject();const l=p.lyrics[0];l.text='海风吹过我的窗';l.notes=lyricNotes(l,p.vocalPreset,1,p);
await writeFile(path.join(output,'chinese-line.ustx'),stringify(openUtauProject(p,[l])));
const dictionary=Object.fromEntries((await readFile(path.join(externalRoot,'DiffSinger/dictionaries/opencpop-extension.txt'),'utf8')).trim().split(/\r?\n/).map(l=>l.split('\t')));
await writeFile(path.join(output,'chinese-line.ds'),JSON.stringify(diffSingerInput(p,l,dictionary),null,2));
await writeFile(path.join(output,'project.json'),JSON.stringify(p,null,2));
const renderer=new InstrumentRenderer();const records=[];
for(const kind of ['drums','bass','guitar','keys'] as const){const notes=kind==='drums'?['kick','snare','hat'].flatMap((sound,i)=>[0,1,2,3].map(beat=>({beat:beat+i*.25,duration:.2,midi:36,velocity:.8,sound:sound as 'kick'|'snare'|'hat'}))):[60,64,67,72].map((midi,i)=>({beat:i,duration:.8,midi:kind==='bass'?midi-24:midi,velocity:.8}));const input={bpm:96,kind,notes,endBeat:4};await writeFile(path.join(output,kind+'.mid'),midiFile({bpm:96,tracks:[input],endBeat:4}));const start=performance.now();const a=await renderer.render(input);const bytes=await readFile(path.join(externalRoot,'runtime/cache',a.key+'.wav'));await writeFile(path.join(output,kind+'.wav'),bytes);const analysis=await runProcess(process.env.FFMPEG_PATH||'D:/aii/ffmpeg-master-latest-win64-gpl-shared/bin/ffmpeg.exe',['-hide_banner','-i',path.join(output,kind+'.wav'),'-af','astats=metadata=1:reset=0','-f','null','-'],output);const record={kind,milliseconds:Math.round(performance.now()-start),bytes:bytes.length,rms:analysis.match(/RMS level dB: (-?[\d.]+)/)?.[1],...a};records.push(record);console.log(record)}
await writeFile(path.join(output,'render-report.json'),JSON.stringify(records,null,2));
