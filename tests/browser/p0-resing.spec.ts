import {test,expect} from '@playwright/test';
import {writeFile,mkdir} from 'node:fs/promises';
const output='D:/ai/hacson/external/runtime/exports/p0-resing';
// P0 acceptance on the real engine: edit phrase 2 (lyrics keeping the melody, note pitch, custom pitch curve),
// re-sing only that phrase, and verify it blends back into the full mix while siblings, instrument assets and old takes stay intact.
test('P0 fine tuning: re-sing one edited phrase, blends into mix, siblings/instruments stable, old takes restorable',async({page,request})=>{
 test.setTimeout(1500000);
 const status=await (await request.get('/api/singing/qixuan')).json();
 test.skip(!status.available,'需要已安装的绮萱引擎、声码器与桥接器');
 const engines=await (await request.get('/api/engines')).json();
 await page.goto('/');
 // Two sung lines are enough for splice verification; the chorus vocal track is emptied so unsung lines cannot affect the full mix.
 const project=await page.evaluate(async()=>{
  // @ts-expect-error Vite browser module
  const {createProject}=await import('/src/composer.ts');
  const p=createProject(120);
  p.lyrics=p.lyrics.slice(0,2);
  const chorusVocal=p.tracks.find((t:any)=>t.kind==='vocal'&&t.sectionId===p.sections[2].id);if(chorusVocal)chorusVocal.notes=[];
  return p;
 });
 const [line1,line2]=project.lyrics;
 const sing=async(p:any,l:any,take:number)=>{
  const res=await (await request.post('/api/singing/qixuan/render',{data:{lyricId:l.id,lyrics:l.text,start:l.start,end:l.end,bpm:p.bpm,notes:l.notes.map((n:any)=>({beat:n.beat,duration:n.duration,midi:n.midi,velocity:n.velocity,syllable:n.syllable})),runner:'CPU',take,engineVersion:status.engineVersion,...(l.performance?{performance:l.performance}:{})}})).json();
  if(!res.audioUrl)throw new Error('渲染失败：'+(res.error??'未知'));expect(res.isDemo).toBe(false);return res;
 };
 const applyInPage=async(p:any,render:any,lineId:string)=>page.evaluate(async({p,render,lineId})=>{
  // @ts-expect-error Vite browser module
  const {applyVocalResult}=await import('/src/features/singing/qixuan.ts');
  // @ts-expect-error Vite browser module
  const {singingDependency}=await import('/src/singing.ts');
  // @ts-expect-error Vite browser module
  const {assetVoice}=await import('/src/external-audio.ts');
  const l=p.lyrics.find((x:any)=>x.id===lineId);
  const asset={...render,projectVersion:p.metadata.updatedAt};
  // assetVoice restores the canonical dependency serialization order (Zod-parsed responses reorder renderParameters keys).
  return applyVocalResult(p,lineId,{...asset,dependency:singingDependency(p,l,assetVoice(asset))});
 },{p,render,lineId});
 const attach=async(p:any,lines:Record<string,any>)=>{let q=p;for(const [id,r] of Object.entries(lines))q=await applyInPage(q,r,id);return q;};

 // 1. Sing both lines; re-sing line 2 unchanged and restore the old take (version rollback while dependencies match).
 const r1=await sing(project,line1,0),r2=await sing(project,line2,0);
 const before=await attach(project,{[line1.id]:r1,[line2.id]:r2});
 const retake=await applyInPage(before,await sing(project,line2,1),line2.id);
 expect(retake.vocalHistory[line2.id]).toHaveLength(1);
 const restored=await page.evaluate(({p,lineId})=>{
  // @ts-expect-error Vite browser module
  return import('/src/features/singing/qixuan.ts').then(m=>m.restoreVocalAsset(p,lineId,0));
 },{p:retake,lineId:line2.id});
 expect(restored.vocalAssets[line2.id].audioUrl).toBe(before.vocalAssets[line2.id].audioUrl);

 // 2. Edit phrase 2: new lyrics keeping the melody, raised first note, custom pitch curve on the first note.
 const edited=await page.evaluate(async({p,lineId})=>{
  // @ts-expect-error Vite browser module
  const {setLyricText,editPhraseNotes,setPhrasePerformance}=await import('/src/melody.ts');
  const l=p.lyrics.find((x:any)=>x.id===lineId),sung=l.notes.filter((n:any)=>n.syllable!=='+').length;
  let q=setLyricText(p,lineId,'改词保留旋律不变测试新词'.slice(0,sung),{keepMelody:true});
  q=editPhraseNotes(q,lineId,q.lyrics.find((x:any)=>x.id===lineId).notes.map((n:any,i:number)=>i===0?{...n,midi:n.midi+2}:n));
  q=setPhrasePerformance(q,lineId,{preset:'natural',mode:'manual',overrides:[{index:0,origin:'manual',pitch:[{x:-80,y:-60,shape:'io'},{x:30,y:0,shape:'io'},{x:200,y:40,shape:'l'}]}]});
  return q;
 },{p:before,lineId:line2.id});
 const editedLine=edited.lyrics.find((x:any)=>x.id===line2.id);

 // 3. Re-sing only phrase 2; sibling asset and history semantics hold; stale take restore is rejected.
 const resung=await sing(edited,editedLine,2);
 const after=await applyInPage(edited,resung,line2.id);
 expect(after.vocalAssets[line1.id].audioUrl).toBe(before.vocalAssets[line1.id].audioUrl);
 expect(after.vocalAssets[line2.id].audioUrl).not.toBe(before.vocalAssets[line2.id].audioUrl);
 expect(after.vocalHistory[line2.id]).toHaveLength(1);
 const stale=await page.evaluate(({p,lineId})=>{
  // @ts-expect-error Vite browser module
  return import('/src/features/singing/qixuan.ts').then(m=>{try{m.restoreVocalAsset(p,lineId,0);return 'restored'}catch(e){return (e as Error).message}});
 },{p:after,lineId:line2.id});
 expect(stale).toContain('不能恢复');
 expect((await request.get(before.vocalAssets[line2.id].audioUrl)).status()).toBe(200);

 // 4. Instrument assets are not re-rendered by a vocal edit (FluidSynth cache keys identical).
 if(engines.instruments?.ready){
  const instrumentCheck=await page.evaluate(async({before,after})=>{
   // @ts-expect-error Vite browser module
   const {instrumentAudio}=await import('/src/external-audio.ts');
   const keys=async(p:any)=>{const out:string[]=[];for(const t of p.tracks.filter((t:any)=>t.kind!=='vocal'&&t.notes.length).slice(0,4))out.push((await instrumentAudio(p,t)).audioUrl);return out;};
   return {a:await keys(before),b:await keys(after)};
  },{before,after});
  expect(instrumentCheck.b).toEqual(instrumentCheck.a);
 }

 // 5. The re-sung phrase blends into the full mix: identical sibling region, real difference in phrase 2, no clipping or seam clicks.
 const mix=await page.evaluate(async({before,after,line1,line2,bpm})=>{
  // @ts-expect-error Vite browser module
  const {renderAudio,wavBlob}=await import('/src/audio.ts');
  const A=await renderAudio(before,{stem:'vocal-dry'}),B=await renderAudio(after,{stem:'vocal-dry'}),M=await renderAudio(after,{stem:'mix'});
  const sr=A.buffer.sampleRate,chA=A.buffer.getChannelData(0),chB=B.buffer.getChannelData(0),chM=M.buffer.getChannelData(0);
  const s=(x:number)=>Math.max(0,Math.round(x*sr)),sec=(b:number)=>b*60/bpm;
  let identical=chA.length===chB.length;const from=s(sec(line1.start)-.1),to=s(sec(line2.start)-.3);
  for(let i=from;i<to&&identical;i++)if(chA[i]!==chB[i])identical=false;
  const w0=s(sec(line2.start)),w1=s(sec(line2.end));let diff=0,rms=0;
  for(let i=w0;i<w1;i++){diff+=Math.abs(chA[i]-chB[i]);rms+=chB[i]*chB[i]}
  rms=Math.sqrt(rms/Math.max(1,w1-w0));
  let peak=0,clipped=0;for(let i=0;i<chB.length;i++){const v=Math.abs(chB[i]);peak=Math.max(peak,v);if(v>=.999)clipped++}
  let peakM=0;for(let i=0;i<chM.length;i++)peakM=Math.max(peakM,Math.abs(chM[i]));
  const edge=(c:number)=>{let m=0;const a=s(sec(c)-.05),b=s(sec(c)+.05);for(let i=a+1;i<b;i++)m=Math.max(m,Math.abs(chB[i]-chB[i-1]));return m};
  const encode=async(blob:Blob)=>{const bytes=new Uint8Array(await blob.arrayBuffer());let out='';for(let i=0;i<bytes.length;i+=8192)out+=String.fromCharCode(...bytes.subarray(i,i+8192));return btoa(out)};
  return {identical,diff,rms,peak,clipped,peakM,edgeIn:edge(line2.start),edgeOut:edge(line2.end),durationA:A.buffer.duration,durationB:B.buffer.duration,wav:await encode(wavBlob(B.buffer))};
 },{before,after,line1:{start:line1.start},line2:{start:line2.start,end:line2.end},bpm:project.bpm});
 expect(mix.durationA).toBe(mix.durationB);
 expect(mix.identical).toBe(true);
 expect(mix.rms).toBeGreaterThan(.01);
 expect(mix.diff).toBeGreaterThan(1);
 expect(mix.peak).toBeLessThanOrEqual(1);expect(mix.clipped).toBe(0);
 expect(mix.peakM).toBeLessThanOrEqual(.980001);
 expect(mix.edgeIn).toBeLessThan(.5);
 expect(mix.edgeOut).toBeLessThan(.5);
 await mkdir(output,{recursive:true});
 await writeFile(output+'/p0-resung-mix.wav',Buffer.from(mix.wav,'base64'));
 await writeFile(output+'/p0-acceptance.json',JSON.stringify({siblingAssetPreserved:mix.identical,oldTakeRestored:true,staleRestoreRejected:true,instrumentCacheChecked:!!engines.instruments?.ready,durationSeconds:mix.durationB,phrase2Rms:mix.rms,phrase2Diff:mix.diff,peak:mix.peak,clippedSamples:mix.clipped,mixPeak:mix.peakM,edgeIn:mix.edgeIn,edgeOut:mix.edgeOut},null,2));
});
