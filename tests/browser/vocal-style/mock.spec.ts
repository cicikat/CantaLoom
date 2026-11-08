import {test,expect,type Page} from '@playwright/test';
const stored=(page:Page)=>page.evaluate(()=>JSON.parse(localStorage.getItem('songyu-mock-project-v1')!));
async function setup(page:Page){
 await page.goto('/');
 await page.evaluate(async()=>{
  // @ts-expect-error Vite fixture API
  const {api}=await import('/src/api/client.ts');
  let job=await api.startProduction({intent:'风格切换测试夹具',lyrics:['甲乙丙丁戊','己庚辛壬癸','云上明月光']});
  for(let i=0;i<20&&job.state==='running';i++)job=await api.production(job.id);
  if(job.state!=='succeeded')throw Error('fixture failed');
  let p=job.project;p.lyrics[1].performance.locked=true;
  p.lyrics[0].performance.overrides=[{index:0,dynamics:8,origin:'manual',locked:true}];
  // Refresh the fixture after editing performance; the production assets predate these edits.
  // @ts-expect-error Vite singing helpers
  const {generateLine,applyVocalResult}=await import('/src/features/singing/qixuan.ts');
  const voice=await api.qixuan();
  for(const line of p.lyrics)p=applyVocalResult(p,line.id,await generateLine(p,line.id,voice));
  localStorage.setItem('songyu-mock-project-v1',JSON.stringify(p));
 });
 await page.reload();
 await page.getByRole('navigation').getByRole('button',{name:'音乐积木',exact:true}).click();
 await expect(page.locator('.bench-pin')).toHaveClass(/is-open/);
 return stored(page);
}
for(const preset of ['轻柔','强烈'])test(`vocal style ${preset} re-sings unlocked phrases and persists playable assets`,async({page})=>{
 const before=await setup(page);
 await page.evaluate(async()=>{
  // @ts-expect-error Vite audio module
  const {renderAudio}=await import('/src/audio.ts');
  const p=JSON.parse(localStorage.getItem('songyu-mock-project-v1')!);
  (window as any).beforeStylePcm=Array.from((await renderAudio(p,{lyricId:p.lyrics[0].id})).buffer.getChannelData(0));
  // @ts-expect-error Vite browser module
  const {api}=await import('/src/api/client.ts');const sing=api.sing;(window as any).requests=[];
  api.sing=async(input:any)=>{(window as any).requests.push(input);return sing(input)};
  api.compose=async()=>{throw Error('must not compose')};api.melody=async()=>{throw Error('must not change melody')};
 });
 await page.locator('.voice-options').getByRole('button',{name:preset}).click();
 await expect(page.getByRole('status').filter({hasText:'演唱风格已更新'})).toBeVisible();
 const next=await stored(page);
 expect(next.lyrics[0].performance.preset).toBe(preset==='轻柔'?'soft':'strong');
 expect(next.lyrics[0].performance.overrides).toEqual(before.lyrics[0].performance.overrides);
 expect(next.lyrics[1]).toEqual(before.lyrics[1]);expect(next.vocalAssets[next.lyrics[1].id]).toEqual(before.vocalAssets[before.lyrics[1].id]);
 expect(next.tracks).toEqual(before.tracks);
 for(let i=0;i<next.lyrics.length;i++)expect(next.lyrics[i].notes).toEqual(before.lyrics[i].notes);
 expect(next.vocalAssets[next.lyrics[0].id].audioUrl).not.toBe(before.vocalAssets[before.lyrics[0].id].audioUrl);
 expect((await page.evaluate(()=>(window as any).requests)).length).toBe(2);
 const audio=await page.evaluate(async()=>{
  // @ts-expect-error Vite audio module
  const {renderAudio}=await import('/src/audio.ts');
  // @ts-expect-error Vite asset validation
  const {currentVocalAsset}=await import('/src/external-audio.ts');
  const p=JSON.parse(localStorage.getItem('songyu-mock-project-v1')!);
  p.lyrics.forEach((l:any)=>currentVocalAsset(p,l));
  const pcm=(await renderAudio(p,{lyricId:p.lyrics[0].id})).buffer.getChannelData(0),old=(window as any).beforeStylePcm;
  return {audible:pcm.some((v:number)=>Math.abs(v)>.001),changed:pcm.some((v:number,i:number)=>Math.abs(v-old[i])>.001)};
 });expect(audio).toEqual({audible:true,changed:true});
 await page.reload();expect((await stored(page)).vocalAssets).toEqual(next.vocalAssets);
});
for(const scenario of ['failure','stale'])test(`vocal style keeps current project on ${scenario}`,async({page})=>{
 const before=await setup(page);
 await page.evaluate(async scenario=>{
  // @ts-expect-error Vite API module
  const {api}=await import('/src/api/client.ts');const sing=api.sing;
  api.sing=async(input:any)=>{if(scenario==='failure')throw Error('风格重唱失败');const asset=await sing(input);(window as any).waiting=true;await new Promise<void>(resolve=>{(window as any).release=resolve});return asset};
 },scenario);
 await page.locator('.voice-options').getByRole('button',{name:'轻柔'}).click();
 if(scenario==='stale'){
  await expect.poll(()=>page.evaluate(()=>(window as any).waiting)).toBe(true);
  await page.getByRole('button',{name:'静音鼓点',exact:true}).click();
  const current=await stored(page);await page.evaluate(()=>(window as any).release());
  await expect(page.getByRole('alert').filter({hasText:'作品已变化'})).toBeVisible();expect(await stored(page)).toEqual(current);
 }else{await expect(page.getByRole('alert').filter({hasText:'风格重唱失败'})).toBeVisible();expect(await stored(page)).toEqual(before)}
});
