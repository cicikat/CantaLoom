import {legacyMechanicalNotes} from './legacy-melody';
import {readFile,writeFile,copyFile} from 'node:fs/promises';
import path from 'node:path';
import {validateMelody} from '../shared/melody.mjs';
import {validateProject} from '../src/model';
import {singingDependency} from '../src/singing';
import {assetVoice} from '../src/external-audio';
import {lyricNotes} from '../src/composer';
// @ts-expect-error backend module
import {qixuanStatus,renderQixuan} from '../server/services/qixuan.mjs';
const out='D:/ai/hacson/external/runtime/exports/v03-dynamic';
for(const label of ['A','B','C']){
 const record=JSON.parse(await readFile(path.join(out,`${label}-llm.json`),'utf8'));validateMelody(record.request,record.result.draft);
 const p=JSON.parse(await readFile(path.join(out,`${label}-project.json`),'utf8'));
 // The initial acceptance run rendered every missing performance as natural.
 // Persist that exact choice so the saved project describes the audio it contains.
 for(const l of p.lyrics){l.performance??={preset:'natural'};if(label==='B')l.source='llm';p.vocalAssets[l.id].dependency=singingDependency(p,l,assetVoice(p.vocalAssets[l.id]))}
 validateProject(p);await writeFile(path.join(out,`${label}-project.json`),JSON.stringify(p,null,2));
}
const p=JSON.parse(await readFile(path.join(out,'A-project.json'),'utf8')),l=p.lyrics[0];const original=legacyMechanicalNotes(l,p),voice=await qixuanStatus();
const asset=await renderQixuan({lyricId:l.id,lyrics:l.text,start:l.start,end:l.end,bpm:p.bpm,notes:original,runner:'CPU',take:719,engineVersion:voice.engineVersion});
await copyFile(path.join('D:/ai/hacson/external/runtime/cache',asset.key+'.wav'),path.join(out,'original-mechanical.wav'));await copyFile(path.join(out,'A-1.wav'),path.join(out,'dynamic-expressive.wav'));
await writeFile(path.join(out,'comparison.json'),JSON.stringify({text:l.text,originalNotes:original,dynamicNotes:l.notes,original:asset,dynamic:p.vocalAssets[l.id],note:'相同歌词、声库和CPU推理；新版包含动态旋律和natural演唱参数。听感需试听判断。'},null,2));
console.log({comparison:out,originalRms:asset.rms});
