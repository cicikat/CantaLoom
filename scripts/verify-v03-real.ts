import {mkdir,writeFile,copyFile,readFile} from 'node:fs/promises';
import path from 'node:path';
import {createProject} from '../src/composer';
import {melodyRequest,applyMelodyDraft,setPhrasePerformance} from '../src/melody';
import {localMelody} from '../shared/melody.mjs';
import {singingDependency} from '../src/singing';
// @ts-expect-error server module
import {createConfigStore} from '../server/admin-config.mjs';
// @ts-expect-error server module
import {createMelodyComposer} from '../server/services/melody.mjs';
// @ts-expect-error server module
import {renderQixuan,qixuanStatus} from '../server/services/qixuan.mjs';
const out=path.resolve('D:/ai/hacson/external/runtime/exports/v03-dynamic');await mkdir(out,{recursive:true});
await createConfigStore({directory:'D:/ai/hacson/external/runtime/config'});const composer=createMelodyComposer(),voice=await qixuanStatus();
const reports:unknown[]=JSON.parse(await readFile(path.join(out,'report.json'),'utf8').catch(()=>'[]'));
const samples=JSON.parse(await readFile(path.join(out,'requests.json'),'utf8'));
const selected=process.argv.find(v=>v.startsWith('--case='))?.split('=')[1];
if(!process.argv.includes('--performance-only'))for(const label of ['A','B','C'].filter(label=>!selected||label===selected)){
 let p=createProject();p.lyrics.forEach((l,i)=>{l.text=label==='B'?'':samples[label].lyrics[i];l.source=label==='B'?'local-template':'manual';l.notes=[]});
 let request=melodyRequest(p,samples[label].intent);
 if(label==='C'){request.source='local-rules';const local=localMelody(request);p=applyMelodyDraft(p,request,local);p.lyrics[0].notes[0].locked=true;request=melodyRequest(p,'保留第一句首音的全部字段，只续写第一句其余音符；忧伤中逐渐坚定',[p.lyrics[0].id])}
 const result=await composer.compose(request);await writeFile(path.join(out,`${label}-llm.json`),JSON.stringify({request,result},null,2));p=applyMelodyDraft(p,request,result.draft);for(const line of p.lyrics)p=setPhrasePerformance(p,line.id,{preset:'natural'});
 for(const l of p.lyrics){const asset=await renderQixuan({lyricId:l.id,lyrics:l.text,start:l.start,end:l.end,bpm:p.bpm,notes:l.notes,runner:'CPU',take:710,engineVersion:voice.engineVersion,performance:l.performance||{preset:'natural'}});const dependency=singingDependency(p,l,{...voice,renderParameters:{runner:'CPU',...voice.parameters}});p.vocalAssets={...p.vocalAssets,[l.id]:{...asset,dependency,projectVersion:p.metadata.updatedAt}};await copyFile(path.join('D:/ai/hacson/external/runtime/cache',asset.key+'.wav'),path.join(out,`${label}-${p.lyrics.indexOf(l)+1}.wav`));console.log({label,line:p.lyrics.indexOf(l)+1,rms:asset.rms,cached:asset.cached})}
 p.vocalMode='external';p.instrumentMode='fluidsynth';await writeFile(path.join(out,`${label}-project.json`),JSON.stringify(p,null,2));reports.push({label,model:result.model,metrics:result.metrics,phrases:result.draft.phrases.map((l:any)=>({id:l.id,text:l.text,notes:l.notes.length,durations:[...new Set(l.notes.map((n:any)=>n.duration))],rests:l.notes.filter((n:any,i:number)=>i&&n.beat>l.notes[i-1].beat+l.notes[i-1].duration+.001).length,repetitions:l.notes.filter((n:any,i:number)=>i&&n.midi===l.notes[i-1].midi).length,motif:l.motif,variationOf:l.variationOf}))});await writeFile(path.join(out,'report.json'),JSON.stringify(reports,null,2));
}
// Same notes, three real parameter sets: compare audio, not labels.
const p=createProject(),l=p.lyrics[0];const manual=JSON.parse(await readFile('D:/ai/hacson/external/runtime/exports/v03-p0/report.json','utf8')).reports.find((r:any)=>r.label==='manual');l.notes=manual.notes;l.text=l.notes.map(n=>n.syllable).join('');for(const preset of ['natural','soft','strong'] as const){const asset=await renderQixuan({lyricId:l.id,lyrics:l.text,start:l.start,end:l.end,bpm:p.bpm,notes:l.notes,runner:'CPU',take:711,engineVersion:voice.engineVersion,performance:{preset}});await copyFile(path.join('D:/ai/hacson/external/runtime/cache',asset.key+'.wav'),path.join(out,`performance-${preset}.wav`));await writeFile(path.join(out,`performance-${preset}.json`),JSON.stringify(asset,null,2));console.log({preset,rms:asset.rms,cached:asset.cached})}
