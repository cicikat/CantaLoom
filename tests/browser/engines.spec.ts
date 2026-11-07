import {test,expect} from '@playwright/test';
import {projectSettings} from './settings';

test('FluidSynth WAV enters the same track/full-song mix, survives locks and save, and changes after regeneration',async({page})=>{
 test.setTimeout(360000);await page.goto('/');const result=await page.evaluate(async()=>{
 // @ts-expect-error Vite browser module
 const {createProject,regenerate}=await import('/src/composer.ts');
 // @ts-expect-error Vite browser module
 const {renderAudio,wavBlob}=await import('/src/audio.ts');
 const p=createProject();p.instrumentMode='fluidsynth';p.soundfont='FluidR3Mono_GM.sf3';const t=p.tracks.find((t:any)=>t.kind==='guitar'&&t.notes.length);const drum=p.tracks.find((t:any)=>t.kind==='drums');drum.locked=true;
 const a=await renderAudio(p,{trackId:t.id});const next=regenerate(p,t.id);const b=await renderAudio(next,{trackId:t.id});let diff=0,energy=0;const x=a.buffer.getChannelData(0),y=b.buffer.getChannelData(0);for(let i=0;i<x.length;i++){diff+=Math.abs(x[i]-y[i]);energy+=x[i]*x[i]}
 // Real full mix through the same renderAudio used by WAV and PV export.
 const mix=await renderAudio(p);const blob=wavBlob(mix.buffer);const bytes=new Uint8Array(await blob.arrayBuffer());let binary='';for(let i=0;i<bytes.length;i+=8192)binary+=String.fromCharCode(...bytes.subarray(i,i+8192));
 localStorage.setItem('songyu-project-v1',JSON.stringify(p));return {rms:Math.sqrt(energy/x.length),diff,duration:mix.buffer.duration,expected:p.sections.reduce((s:number,x:any)=>s+x.beats,0)*60/p.bpm,locked:JSON.stringify(drum)===JSON.stringify(next.tracks.find((t:any)=>t.id===drum.id)),wav:btoa(binary)};
 });expect(result.rms).toBeGreaterThan(.0001);expect(result.diff).toBeGreaterThan(1);expect(result.locked).toBeTruthy();expect(Math.abs(result.duration-result.expected)).toBeLessThan(.001);
 const fs=await import('node:fs/promises');await fs.mkdir('exports',{recursive:true});await fs.writeFile('exports/fluidsynth-full-mix.wav',Buffer.from(result.wav,'base64'));
 await page.reload();await projectSettings(page);await page.locator('.engine-panel summary').click();await expect(page.getByLabel('乐器音源',{exact:true})).toHaveValue('fluidsynth');await page.screenshot({path:'test-results/local-engines.png',fullPage:true});
 await page.getByRole('navigation').getByRole('button',{name:'PV ✦',exact:true}).click();const dl=page.waitForEvent('download',{timeout:180000});await page.getByRole('button',{name:'导出 MP4',exact:true}).click();await (await dl).saveAs('exports/fluidsynth-pv.mp4');
});
test('external vocal WAV fixture is reused by timeline mix; editing one line invalidates only that line',async({page})=>{
 await page.goto('/');const result=await page.evaluate(async()=>{
 // @ts-expect-error Vite browser module
 const {createProject}=await import('/src/composer.ts');
 // @ts-expect-error Vite browser module
 const {renderAudio,wavBlob}=await import('/src/audio.ts');
 // @ts-expect-error Vite browser module
 const {importSinging,currentVocalAsset}=await import('/src/external-audio.ts');
 const p=createProject();const voice={id:'TEST FIXTURE — synthesized vowel, not real singing',version:'1',label:'test',providerId:'openutau-exchange'};
 for(const l of p.lyrics){const audio=await renderAudio(p,{lyricId:l.id});const file=new File([wavBlob(audio.buffer)],'fixture.wav',{type:'audio/wav'});const asset=await importSinging(p,l,file,voice);p.vocalAssets={...p.vocalAssets,[l.id]:asset}}
 p.vocalMode='external';p.tracks.forEach((t:any)=>t.muted=t.kind!=='vocal');const mix=await renderAudio(p);const first=currentVocalAsset(p,p.lyrics[0]).audioUrl;p.lyrics[1].text+='变';let stale=false;try{currentVocalAsset(p,p.lyrics[1])}catch{stale=true}const energy=mix.buffer.getChannelData(0).reduce((s:number,x:number)=>s+x*x,0);return {energy,stale,firstUnchanged:first===currentVocalAsset(p,p.lyrics[0]).audioUrl};
 });expect(result.energy).toBeGreaterThan(1);expect(result.stale&&result.firstUnchanged).toBeTruthy();
});
