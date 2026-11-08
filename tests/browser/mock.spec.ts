import {test,expect} from '@playwright/test';
import {creationSettings,projectSettings,startMaking,tapRhythm} from './settings';


async function productionScenario(page:import('@playwright/test').Page,scenario:string){
 await page.evaluate(async scenario=>{
  // @ts-expect-error browser fixture transport
  const {createMockRequest}=await import('/src/api/mock.ts');
  // @ts-expect-error browser client
  const {api,ApiError}=await import('/src/api/client.ts');
  // @ts-expect-error browser schema
  const {productionJobSchema}=await import('/shared/contracts/production.mjs');
  const request=createMockRequest(scenario);
  async function send(path:string,body?:unknown){const res=await request(path,{method:body===undefined?'GET':'POST',...(body===undefined?{}:{body:JSON.stringify(body)})});const value=await res.json();if(!res.ok)throw new ApiError(value.error,res.status);return productionJobSchema.parse(value)}
  api.startProduction=(input:unknown)=>send('/api/production',input);api.production=(id:string)=>send('/api/production/'+id);api.retryProduction=(id:string,line:string)=>send(`/api/production/${id}/retry/${line}`,{});
 },scenario);
}
async function holdProduction(page:import('@playwright/test').Page){
 await page.evaluate(async()=>{
  // @ts-expect-error browser client
  const {api}=await import('/src/api/client.ts');const original=api.startProduction;
  api.startProduction=async(input:unknown)=>{const result=await original(input);await new Promise<void>(resolve=>{(window as any).releaseProduction=resolve});(window as any).productionDelivered=true;return result};
 });
}
const mockStored=(page:import('@playwright/test').Page)=>page.evaluate(()=>JSON.parse(localStorage.getItem('songyu-mock-project-v1')!));

test('lyrics from creation settings sync to stickers, MV canvas and saved project',async({page})=>{
 await page.goto('/');const before=await mockStored(page);
 const lyrics=before.lyrics.map((l:any,i:number)=>i===0?'把今天写进一封信里':l.text);
 await creationSettings(page);await page.getByLabel('自由创作歌词',{exact:true}).fill(lyrics.join('\n'));
 await page.getByRole('button',{name:'同步歌词到当前作品',exact:true}).click();
 await expect(page.getByLabel('第1句歌词',{exact:true})).toHaveValue(lyrics[0]);
 expect((await mockStored(page)).lyrics.map((l:any)=>l.text)).toEqual(lyrics);
 await page.evaluate(()=>{
  const drawn:string[]=[];const original=CanvasRenderingContext2D.prototype.fillText;
  CanvasRenderingContext2D.prototype.fillText=function(text:string,...args:any[]){drawn.push(text);return original.call(this,text,...args as [number,number])};
  (window as any).lyricDrawn=drawn;
 });
 const current=await mockStored(page),time=current.lyrics[0].start*60/current.bpm+.1;
 await page.getByRole('slider',{name:'PV 进度',exact:true}).fill(String(time));
 await expect.poll(()=>page.evaluate(()=>(window as any).lyricDrawn)).toContain(lyrics[0]);
 expect((await mockStored(page)).lyrics.slice(1)).toEqual(before.lyrics.slice(1));
 await page.evaluate(async()=>{
  // @ts-expect-error Vite browser module
  const {api}=await import('/src/api/client.ts');const original=api.exportVideo;
  api.exportVideo=async(input:any,...args:any[])=>{(window as any).exportedLyrics=input.lyrics;return original(input,...args)};
 });
 const download=page.waitForEvent('download');await page.getByRole('button',{name:'模拟导出 MP4',exact:true}).click();await download;
 expect((await page.evaluate(()=>(window as any).exportedLyrics)).map((l:any)=>l.text)).toEqual(lyrics);
 await page.reload();await expect(page.getByLabel('第1句歌词',{exact:true})).toHaveValue(lyrics[0]);
});

test('local blocks use entered lyrics instead of replacing them with template text',async({page})=>{
 await page.goto('/');const before=await mockStored(page),lyrics=before.lyrics.map((l:any,i:number)=>i===0?'我把星星放进口袋':l.text);
 await page.getByRole('button',{name:'🌙 深夜宇宙',exact:true}).click();
 await creationSettings(page);await page.getByLabel('自由创作歌词',{exact:true}).fill(lyrics.join('\n'));
 await page.getByRole('button',{name:'本地搭建积木',exact:true}).click();
 await expect(page.getByLabel('第1句歌词',{exact:true})).toHaveValue(lyrics[0]);
 expect((await mockStored(page)).lyrics.map((l:any)=>l.text)).toEqual(lyrics);
});

test('free lyric synchronization keeps its melody editable and rejects mismatches without changing the project',async({page})=>{
 const before=await openPiano(page),lyrics=before.lyrics.map((l:any,i:number)=>i===0?'风吹过海面':l.text);
 await creationSettings(page);await page.getByLabel('自由创作歌词',{exact:true}).fill(lyrics.join('\n'));
 await page.getByRole('button',{name:'同步歌词到当前作品',exact:true}).click();
 await expect(page.getByLabel('第1句歌词',{exact:true})).toHaveValue(lyrics[0]);
 const current=await mockStored(page);expect(current.lyrics.slice(1)).toEqual(before.lyrics.slice(1));
 expect(current.melodyDraft.phrases[0].text).toBe(lyrics[0]);expect(current.melodyDraft.phrases[0].notes).toEqual(current.lyrics[0].notes);
 await creationSettings(page);lyrics[0]+='远处';await page.getByLabel('自由创作歌词',{exact:true}).fill(lyrics.join('\n'));
 await page.getByRole('button',{name:'同步歌词到当前作品',exact:true}).click();
 await expect(page.getByRole('status').filter({hasText:'字数一致'})).toBeVisible();expect(await mockStored(page)).toEqual(current);
});
// Clicking while the asynchronous environment check is still running opens its settings instead of producing.
// The workbench's first screen sits under the Music Blocks curtain until it is pulled away (ticket 29);
// enter it through the nav as a reader would before touching the board, TAP or vocal cards.
async function enterWorkbench(page:import('@playwright/test').Page){
 await page.getByRole('navigation').getByRole('button',{name:'音乐积木',exact:true}).click();await expect(page.locator('.bench-pin')).toHaveClass(/is-open/);
}
async function openPiano(page:import('@playwright/test').Page,withOverrides=false){
 await page.goto('/');
 await page.evaluate(async withOverrides=>{
  // @ts-expect-error browser API; fresh fixture creation, not real inference
  const {api}=await import('/src/api/client.ts');
  let job=await api.startProduction({intent:'钢琴卷帘页面夹具',lyrics:['甲乙丙丁戊','己庚辛壬癸','云上明月光']});
  for(let i=0;i<20&&job.state==='running';i++)job=await api.production(job.id);
  if(job.state!=='succeeded')throw Error('Fixture production failed');
  const p=job.project;
  if(withOverrides){p.lyrics[0].performance.overrides=[{index:0,dynamics:8,origin:'manual'}];p.performanceHistory={[p.lyrics[0].id]:[{preset:'soft',overrides:[{index:0,dynamics:2}]}]}}
  localStorage.setItem('songyu-mock-project-v1',JSON.stringify(p));
 },withOverrides);
 await page.reload();await page.getByRole('button',{name:'编辑第1句旋律',exact:true}).click();await expect(page.getByRole('region',{name:'单句钢琴卷帘'})).toBeVisible();
 return mockStored(page);
}

test('frontend alone supports planning, locks, singing, sibling cache, playback, reload and exports with zero API requests',async({page})=>{
 const requests:string[]=[],errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/api/**',route=>{if(!new URL(route.request().url()).pathname.startsWith('/api/'))return route.continue();requests.push(route.request().url());return route.abort()});
 await page.goto('/');await expect(page.getByRole('note')).toContainText('MOCK');await expect(page.locator('.honesty')).toContainText('未调用 LLM');
 await creationSettings(page);await page.getByRole('button',{name:'本地搭建积木',exact:true}).click();await expect(page.locator('.workspace-meta')).toContainText('把夏天唱成一座岛');
 const stored=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('songyu-mock-project-v1')!));
 expect((await stored()).planning.source).toBe('local-rules');expect(await page.evaluate(()=>localStorage.getItem('songyu-project-v1'))).toBeNull();
 await page.getByRole('navigation').getByRole('button',{name:/音乐积木/}).click();await page.getByRole('button',{name:'锁定吉他',exact:true}).click();const locked=(await stored()).tracks.filter((t:any)=>t.locked);
 await page.getByRole('button',{name:'重做未锁定积木'}).click();expect((await stored()).tracks.filter((t:any)=>t.locked)).toEqual(locked);
 await page.getByRole('button',{name:'打开逐句演唱',exact:true}).click();const rows=page.locator('.qixuan-line');
 await expect(page.locator('.qixuan-controls')).toContainText('MOCK 测试声库');await rows.nth(0).getByRole('button',{name:'绮萱演唱',exact:true}).click();await expect(rows.nth(0)).toContainText('MOCK 测试音已就绪');
 const first=(await stored()).vocalAssets;await page.getByLabel('第2句歌词',{exact:true}).fill('修改第二句的歌词');await rows.nth(1).getByRole('button',{name:'绮萱演唱',exact:true}).click();await expect(rows.nth(1)).toContainText('MOCK 测试音已就绪');
 expect((await stored()).vocalAssets[(await stored()).lyrics[0].id]).toEqual(first[(await stored()).lyrics[0].id]);
 await rows.nth(1).getByRole('button',{name:'重新演唱这一句',exact:true}).click();await expect(rows.nth(1)).toContainText('v2');expect((await stored()).vocalHistory[(await stored()).lyrics[1].id]).toHaveLength(1);
 await page.getByRole('button',{name:'生成缺失的演唱',exact:true}).click();await expect(rows.nth(3)).toContainText('MOCK 测试音已就绪');
 await rows.nth(0).getByRole('button',{name:'试听这一句',exact:true}).click();await expect(page.getByRole('button',{name:'暂停全曲',exact:true})).toBeVisible();await page.getByRole('button',{name:'暂停全曲',exact:true}).click();
 await projectSettings(page);await page.locator('.engine-panel summary').click();await page.getByLabel('乐器音源',{exact:true}).selectOption('fluidsynth');
 await page.reload();await expect(page.getByRole('note')).toBeVisible();
 await projectSettings(page);await page.getByRole('button',{name:'导出作品',exact:true}).click();const wav=page.waitForEvent('download');await page.getByRole('button',{name:/混音音频/}).click();expect((await wav).suggestedFilename()).toContain('.mock.wav');
 const project=page.waitForEvent('download');await page.getByRole('button',{name:/完整工程/}).click();expect((await project).suggestedFilename()).toContain('.mock.songyu.json');
 await page.getByRole('button',{name:'关闭导出',exact:true}).click();await page.getByRole('navigation').getByRole('button',{name:'PV ✦',exact:true}).click();await expect(page.locator('.export-status')).toContainText('未运行 FFmpeg');const exported=page.waitForEvent('download');await page.getByRole('button',{name:'模拟导出 MP4',exact:true}).click();expect((await exported).suggestedFilename()).toContain('.mock-export.json');await expect(page.getByRole('status').filter({hasText:'未生成 MP4'})).toBeVisible();
 expect(requests).toEqual([]);expect(errors).toEqual([]);
});

test('Vite cannot proxy administration in standalone mode',async({request})=>{for(const path of ['/admin','/api/admin/state','/admin-assets/admin.js'])expect((await request.get(path)).status()).toBe(403)});

test('A2 page makes a new five-line song, reports fixture stages, plays and restores isolated storage',async({page})=>{
 const requests:string[]=[],errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/api/**',route=>{if(!new URL(route.request().url()).pathname.startsWith('/api/'))return route.continue();requests.push(route.request().url());return route.abort()});
 await page.goto('/');const before=await mockStored(page);
 await page.evaluate(async()=>{
  // @ts-expect-error Vite serves browser modules directly.
  const {api}=await import('/src/api/client.ts');const original=api.production;
  const completion=new Promise<void>(resolve=>{(window as any).completeProduction=resolve});
  api.production=async(id:string)=>{const job=await original(id);if(job.state==='succeeded')await completion;return job};
 });
 await page.evaluate(before=>localStorage.setItem('songyu-project-v1',JSON.stringify(before)),before);
 const lyrics=['  风吹过小岛  ','灯照着海岸','雨停在窗边','我走向明天','把心事放下'];
 await page.getByLabel('自由创作主题',{exact:true}).fill('雨后释然，前半段安静，后半段明亮');
 await creationSettings(page);await page.getByLabel('自由创作歌词',{exact:true}).fill(lyrics.join('\n'));
 await page.getByLabel('自由创作速度',{exact:true}).fill('100');await page.getByLabel('自由创作时长',{exact:true}).selectOption('30');
 await startMaking(page);await expect(page.getByLabel('制作状态')).toContainText('MOCK 测试阶段');
 expect((await mockStored(page)).id).toBe(before.id);
 await page.evaluate(()=>(window as any).completeProduction());
 await expect(page.getByRole('button',{name:'试听这首作品',exact:true})).toBeVisible({timeout:25000});
 const p=await mockStored(page);expect(p.id).not.toBe(before.id);expect(p.mode).toBe('free');expect(p.bpm).toBe(100);expect(p.lyrics.map((l:any)=>l.text)).toEqual(lyrics);expect(p.planning.mock).toBe(true);
 expect(await page.evaluate(()=>localStorage.getItem('songyu-project-v1'))).toBe(JSON.stringify(before));
 const restored=await page.evaluate(async()=>{
  // @ts-expect-error Vite browser module
  const {initialProject,canAutoSave,readProject}=await import('/src/features/project/files.ts');
  // @ts-expect-error Vite browser module
  const {renderAudio}=await import('/src/audio.ts');
  const p=initialProject(),imported=await readProject(new File([JSON.stringify(p)],'fixture.mock.songyu.json'));
  const samples=(await renderAudio(p)).buffer.getChannelData(0);
  return {id:p.id,imported:imported.id,auto:canAutoSave(),mock:p.melodyDraft.mock,source:p.planning.source,rms:Math.sqrt(samples.reduce((sum:number,v:number)=>sum+v*v,0)/samples.length)};
 });
 expect(restored).toMatchObject({id:p.id,imported:p.id,auto:true,mock:true,source:'local-rules'});expect(restored.rms).toBeGreaterThan(.001);

 await page.getByRole('button',{name:'试听这首作品',exact:true}).click();await expect(page.getByRole('button',{name:'暂停这首作品',exact:true})).toBeVisible({timeout:20000});
 await expect.poll(async()=>Number(await page.getByRole('slider',{name:'播放进度'}).inputValue())).toBeGreaterThan(.1);
 await page.getByRole('button',{name:'暂停这首作品',exact:true}).click();

 await page.setViewportSize({width:390,height:844});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
 await page.reload();expect((await mockStored(page)).id).toBe(p.id);await enterWorkbench(page);await page.getByRole('button',{name:'播放全曲',exact:true}).click();await expect(page.getByRole('button',{name:'暂停全曲',exact:true})).toBeVisible({timeout:20000});
 expect(requests).toEqual([]);expect(errors).toEqual([]);
});

for(const scenario of ['planning-failure','lost'])test(`A2 page preserves the saved project after ${scenario}`,async({page})=>{
 await page.goto('/');await productionScenario(page,scenario);const before=await mockStored(page);
 await page.getByLabel('自由创作主题',{exact:true}).fill('失败保护测试');await startMaking(page);
 await expect(page.locator('.production-error')).toBeVisible({timeout:20000});
 if(scenario==='lost')await expect(page.locator('.production-error')).toContainText('任务已丢失');
 expect(await mockStored(page)).toEqual(before);await expect(page.getByRole('button',{name:'试听这首作品',exact:true})).toHaveCount(0);
});

test('A2 page retries missing singing and only applies the completed project',async({page})=>{
 await page.goto('/');await productionScenario(page,'singing-failure');const before=await mockStored(page);
 await page.getByLabel('自由创作主题',{exact:true}).fill('测试单句失败后重试');await startMaking(page);
 await expect(page.getByRole('button',{name:'重试缺失的演唱',exact:true})).toBeVisible({timeout:20000});expect(await mockStored(page)).toEqual(before);
 await page.getByRole('button',{name:'重试缺失的演唱',exact:true}).click();await expect(page.getByRole('button',{name:'试听这首作品',exact:true})).toBeVisible();expect((await mockStored(page)).mode).toBe('free');
});

for(const edit of ['input','project','navigate','cancel'])test(`A2 page discards late production after ${edit}`,async({page})=>{
 await page.goto('/');await holdProduction(page);const before=await mockStored(page);
 await page.getByLabel('自由创作主题',{exact:true}).fill('迟到结果测试');await startMaking(page);
 await expect.poll(()=>page.evaluate(()=>typeof (window as any).releaseProduction)).toBe('function');
 if(edit==='input'){await creationSettings(page);await page.getByLabel('自由创作歌词',{exact:true}).fill('这句是我刚改的词')}
 if(edit==='project'){await projectSettings(page);await page.locator('.engine-panel summary').click();await page.getByLabel('bass GM',{exact:true}).fill('34')}
 if(edit==='navigate')await page.getByRole('navigation').getByRole('button',{name:/音乐积木/}).click();
 if(edit==='cancel')await page.getByRole('button',{name:'停止等待，保留当前工程',exact:true}).click();
 const expected=await mockStored(page);await page.evaluate(()=>(window as any).releaseProduction());
 await expect.poll(()=>page.evaluate(()=>(window as any).productionDelivered)).toBe(true);
 expect(await mockStored(page)).toEqual(expected);expect((await mockStored(page)).id).toBe(before.id);
 if(edit==='navigate')await page.getByRole('navigation').getByRole('button',{name:'创作',exact:true}).click();
 await expect(page.getByLabel('制作状态')).toContainText(/不会|已改变/);await expect(page.getByRole('button',{name:'试听这首作品',exact:true})).toHaveCount(0);
});

test('A2 page rejects a succeeded job with an invalid project without replacing saved data',async({page})=>{
 await page.goto('/');const before=await mockStored(page);
 await page.evaluate(async()=>{
  // @ts-expect-error browser client
  const {api}=await import('/src/api/client.ts');api.startProduction=async()=>({mock:true,id:crypto.randomUUID(),state:'succeeded',stage:'ready-for-mix',project:{}});
 });
 await page.getByLabel('自由创作主题',{exact:true}).fill('错误工程夹具');await startMaking(page);
 await expect(page.locator('.production-error')).toContainText('当前工程已保留');expect(await mockStored(page)).toEqual(before);
});

test('A2 page applies the newer creation even when an older request returns later',async({page})=>{
 await page.goto('/');
 // The first click must happen after the asynchronous environment check, not open its settings.
 await expect(page.getByRole('button',{name:'制作新作品',exact:true})).not.toHaveAttribute('title');
 await page.evaluate(async()=>{
  // @ts-expect-error browser client
  const {api}=await import('/src/api/client.ts');const original=api.startProduction;let count=0;
  api.startProduction=async(input:unknown)=>{const first=++count===1,result=await original(input);if(first)await new Promise<void>(resolve=>{(window as any).releaseProduction=resolve});return result};
 });
 await page.getByLabel('自由创作主题',{exact:true}).fill('较早的主题');await startMaking(page);
 await expect.poll(()=>page.evaluate(()=>typeof (window as any).releaseProduction)).toBe('function');
 await page.getByLabel('自由创作主题',{exact:true}).fill('最新的主题');await startMaking(page);
 await page.evaluate(()=>(window as any).releaseProduction());
 await expect(page.getByRole('button',{name:'试听这首作品',exact:true})).toBeVisible({timeout:25000});expect((await mockStored(page)).metadata.idea).toBe('最新的主题');
});

test('A2 page retains the project on request timeout or invalid response and never falls back to old templates',async({page})=>{
 await page.goto('/');const before=await mockStored(page);
 for(const message of ['请求超时，请重试','API 响应格式无效','制作结果校验失败']){
  await page.evaluate(async message=>{
   // @ts-expect-error browser client
   const {api,ApiError}=await import('/src/api/client.ts');api.startProduction=async()=>{const error=new ApiError(message==='制作结果校验失败'?'internal_schema_details':message);if(message==='制作结果校验失败')error.name='ZodError';throw error};
  },message);
  await page.getByLabel('自由创作主题',{exact:true}).fill(message);await startMaking(page);
  await expect(page.locator('.production-error')).toContainText(message);await expect(page.locator('.production-error')).not.toContainText('internal_schema_details');expect(await mockStored(page)).toEqual(before);
 }
});

test('C piano editor saves pitch/length, honors locks and persists edits without losing sibling assets',async({page})=>{
 const before=await openPiano(page),roll=page.getByRole('region',{name:'单句钢琴卷帘'});
 await roll.getByLabel('选中音符音高',{exact:true}).fill('72');await roll.getByLabel('选中音符长度',{exact:true}).fill('.125');await roll.getByRole('button',{name:'保存音符修改',exact:true}).click();
 await expect.poll(async()=>(await mockStored(page)).lyrics[0].notes[0].midi).toBe(72);
 const edited=await mockStored(page);expect(edited.lyrics[0].notes[0].id).toBe(before.lyrics[0].notes[0].id);expect(edited.lyrics.slice(1)).toEqual(before.lyrics.slice(1));expect(edited.vocalAssets).toEqual(before.vocalAssets);
 await expect(page.locator('.qixuan-line').nth(0)).toContainText('需要重新演唱');await expect(page.locator('.qixuan-line').nth(1)).toContainText('演唱已就绪');
 await roll.getByRole('button',{name:'锁定这个音符',exact:true}).click();await expect(roll.getByLabel('选中音符音高',{exact:true})).toBeDisabled();
 await roll.getByRole('button',{name:'解锁这个音符',exact:true}).click();await roll.getByRole('button',{name:'锁定这一句',exact:true}).click();await expect(roll.getByLabel('选中音符音高',{exact:true})).toBeDisabled();
 await roll.getByRole('button',{name:'解锁这一句',exact:true}).click();

 await page.setViewportSize({width:390,height:844});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
 await page.reload();expect((await mockStored(page)).lyrics[0].notes[0].midi).toBe(72);
});

test('C piano editor reorders stable notes and expression indices, rejects overlaps atomically',async({page})=>{
 const before=await openPiano(page,true),roll=page.getByRole('region',{name:'单句钢琴卷帘'}),line=before.lyrics[0];
 await roll.getByLabel('选中音符长度',{exact:true}).fill('.125');await roll.getByRole('button',{name:'保存音符修改',exact:true}).click();
 await roll.getByLabel('选中音符位置',{exact:true}).fill(String(line.end-line.start-.125));await roll.getByRole('button',{name:'保存音符修改',exact:true}).click();
 await expect.poll(async()=>(await mockStored(page)).lyrics[0].notes.at(-1).id).toBe(line.notes[0].id);
 const p=await mockStored(page);expect(p.lyrics[0].notes.map((n:any)=>n.syllable)).toEqual(Array.from(line.text));expect(p.lyrics[0].performance.overrides[0].index).toBe(4);expect(p.performanceHistory[line.id][0].overrides[0].index).toBe(4);
 await roll.getByLabel('选中音符位置',{exact:true}).fill(String(p.lyrics[0].notes[0].beat-line.start));await roll.getByRole('button',{name:'保存音符修改',exact:true}).click();
 await expect(roll.locator('.phrase-status')).toContainText('不能重叠');expect(await mockStored(page)).toEqual(p);
});

test('C piano notes support pointer movement, resizing and keyboard changes',async({page})=>{
 const before=await openPiano(page),roll=page.getByRole('region',{name:'单句钢琴卷帘'}),first=roll.getByRole('button',{name:/^音符1 /});
 await first.scrollIntoViewIfNeeded();let box=(await first.boundingBox())!;
 await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.down();await page.mouse.move(box.x+box.width/2,box.y+box.height/2-20,{steps:3});await page.mouse.up();
 await expect.poll(async()=>(await mockStored(page)).lyrics[0].notes[0].midi).toBe(before.lyrics[0].notes[0].midi+1);
 const handle=roll.getByRole('button',{name:'调整音符1长度',exact:true});await handle.scrollIntoViewIfNeeded();box=(await handle.boundingBox())!;
 const beatWidth=(await roll.locator('.piano-ruler').boundingBox())!.width/(before.lyrics[0].end-before.lyrics[0].start);
 await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.down();await page.mouse.move(box.x+box.width/2-beatWidth*.125,box.y+box.height/2,{steps:3});await page.mouse.up();
 await expect.poll(async()=>(await mockStored(page)).lyrics[0].notes[0].duration).toBeCloseTo(before.lyrics[0].notes[0].duration-.125,6);
 await first.focus();await first.press('ArrowDown');await expect.poll(async()=>(await mockStored(page)).lyrics[0].notes[0].midi).toBe(before.lyrics[0].notes[0].midi);
});

test('C targeted melody preserves the other phrases and accompaniment, then re-sings only that line',async({page})=>{
 const before=await openPiano(page),roll=page.getByRole('region',{name:'单句钢琴卷帘'});
 await roll.getByLabel('局部旋律要求',{exact:true}).fill('第一句更高一点');await roll.getByRole('button',{name:'只重作这一句',exact:true}).click();await expect(roll.locator('.phrase-status')).toContainText('已应用');
 const next=await mockStored(page);expect(next.lyrics[0].notes).not.toEqual(before.lyrics[0].notes);expect(next.lyrics[0].text).toBe(before.lyrics[0].text);expect(next.lyrics.slice(1)).toEqual(before.lyrics.slice(1));expect(next.melodyDraft.phrases.slice(1)).toEqual(before.melodyDraft.phrases.slice(1));expect(next.tracks.filter((t:any)=>t.kind!=='vocal')).toEqual(before.tracks.filter((t:any)=>t.kind!=='vocal'));expect(next.vocalAssets).toEqual(before.vocalAssets);
 const rows=page.locator('.qixuan-line');await rows.nth(0).getByRole('button',{name:'绮萱演唱',exact:true}).click();await expect(rows.nth(0)).toContainText('MOCK 测试音已就绪');
 expect((await mockStored(page)).vocalAssets[before.lyrics[1].id]).toEqual(before.vocalAssets[before.lyrics[1].id]);await roll.getByRole('button',{name:'试听当前演唱',exact:true}).click();await expect(page.getByRole('button',{name:'暂停全曲',exact:true})).toBeVisible({timeout:20000});
});

for(const action of ['edit','phrase','navigate','cancel'])test(`C piano editor discards a late melody after ${action}`,async({page})=>{
 await openPiano(page);
 await page.evaluate(async()=>{
  // @ts-expect-error browser client
  const {api}=await import('/src/api/client.ts');const original=api.melody;
  api.melody=async(input:unknown)=>{const result=await original(input);await new Promise<void>(resolve=>{(window as any).releaseMelody=resolve});(window as any).melodyDelivered=true;return result};
 });
 const roll=page.getByRole('region',{name:'单句钢琴卷帘'});await roll.getByLabel('局部旋律要求',{exact:true}).fill('迟到的局部旋律');await roll.getByRole('button',{name:'只重作这一句',exact:true}).click();
 await expect.poll(()=>page.evaluate(()=>typeof (window as any).releaseMelody)).toBe('function');
 if(action==='edit'){await roll.getByLabel('选中音符音高',{exact:true}).fill('72');await roll.getByRole('button',{name:'保存音符修改',exact:true}).click()}
 if(action==='phrase')await roll.getByRole('button',{name:/^第 2 句/}).click();
 if(action==='navigate')await page.getByRole('navigation').getByRole('button',{name:/音乐积木/}).click();
 if(action==='cancel')await roll.getByRole('button',{name:'停止等待',exact:true}).click();
 const expected=await mockStored(page);await page.evaluate(()=>(window as any).releaseMelody());await expect.poll(()=>page.evaluate(()=>(window as any).melodyDelivered)).toBe(true);expect(await mockStored(page)).toEqual(expected);
});

test('C piano editor rejects a response that changes a sibling and preserves the project',async({page})=>{
 await openPiano(page);const before=await mockStored(page),roll=page.getByRole('region',{name:'单句钢琴卷帘'});
 await page.evaluate(async()=>{
  // @ts-expect-error browser client
  const {api}=await import('/src/api/client.ts');const original=api.melody;
  api.melody=async(input:unknown)=>{const result=await original(input);result.draft.phrases[1].notes[0].midi++;return result};
 });
 await roll.getByLabel('局部旋律要求',{exact:true}).fill('错误响应测试');await roll.getByRole('button',{name:'只重作这一句',exact:true}).click();await expect(roll.locator('.phrase-status')).toContainText('原工程已保留');expect(await mockStored(page)).toEqual(before);
});

test('LOOP board edits real steps, preserves locks, persists drag order and imports the same project',async({page})=>{
 await page.goto('/');await enterWorkbench(page);const before=await mockStored(page),sectionId=before.sections[1].id;
 const rows=page.locator('#tracks .track');await expect(rows).toHaveCount(before.tracks.filter((t:any)=>t.sectionId===sectionId).length);
 const step=page.getByRole('button',{name:'吉他 第2格',exact:true}),wasOn=await step.getAttribute('aria-pressed');await step.click();await expect(step).toHaveAttribute('aria-pressed',wasOn==='true'?'false':'true');
 const edited=await mockStored(page),guitar=edited.tracks.find((t:any)=>t.sectionId===sectionId&&t.kind==='guitar');expect(guitar.manuallyEdited).toBe(true);expect(guitar.notes).not.toEqual(before.tracks.find((t:any)=>t.id===guitar.id).notes);
 await page.getByRole('button',{name:'锁定吉他',exact:true}).click();const locked=(await mockStored(page)).tracks.find((t:any)=>t.id===guitar.id);await expect(step).toBeDisabled();await page.getByRole('button',{name:'重做未锁定积木',exact:true}).click();expect((await mockStored(page)).tracks.find((t:any)=>t.id===guitar.id)).toEqual(locked);
 const order=await rows.evaluateAll(elements=>elements.map(el=>el.getAttribute('data-track')));await rows.nth(0).dragTo(rows.nth(2));await expect.poll(()=>rows.evaluateAll(elements=>elements.map(el=>el.getAttribute('data-track')))).toEqual([order[1],order[2],order[0],...order.slice(3)]);
 await page.getByRole('button',{name:'上移鼓点',exact:true}).click();const saved=await mockStored(page),expected=saved.tracks.filter((t:any)=>t.sectionId===sectionId).map((t:any)=>t.id);await page.reload();expect(await rows.evaluateAll(elements=>elements.map(el=>el.getAttribute('data-track')))).toEqual(expected);
 await page.locator('input[accept=".json"]').setInputFiles({name:'restored.mock.songyu.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(saved))});await expect(page.getByRole('status').filter({hasText:'工程已恢复'})).toBeVisible();expect(await mockStored(page)).toEqual(saved);
});

test('LOOP tap uses recorded timing; the PV chapter follows the project clock and dialogs return focus',async({page})=>{
 await page.goto('/');await enterWorkbench(page);await tapRhythm(page);
 await page.getByRole('button',{name:/变成鼓点/}).click();const p=await mockStored(page);expect(p.tapTimes).toHaveLength(5);expect(p.tapTimes.slice(1).map((t:number,i:number)=>t-p.tapTimes[i])).toEqual([500,500,500,500]);expect(p.bpm).toBe(120);
 await page.getByRole('slider',{name:'播放进度',exact:true}).fill('10');await page.getByRole('navigation').getByRole('button',{name:'PV ✦',exact:true}).click();const pv=page.getByRole('region',{name:'歌词 PV',exact:true});await expect(pv).toBeInViewport({ratio:.5});await expect(pv.locator('.mv-time')).toContainText('00:10');
 const matches=await pv.locator('canvas').evaluate(async canvas=>{
  // @ts-expect-error Vite browser module
  const {drawPV}=await import('/src/visual.ts');const project=JSON.parse(localStorage.getItem('songyu-mock-project-v1')!),expected=document.createElement('canvas');expected.width=1280;expected.height=720;drawPV(expected,project,10);return (canvas as HTMLCanvasElement).toDataURL()===expected.toDataURL();
 });expect(matches).toBe(true);
 await pv.getByRole('slider',{name:'PV 进度',exact:true}).fill('5');await expect(pv.locator('.mv-time')).toContainText('00:05');await expect(page.getByRole('slider',{name:'播放进度',exact:true})).toHaveValue('5');
 await page.getByLabel('字幕样式',{exact:true}).selectOption('poster');expect((await mockStored(page)).subtitleStyle).toBe('poster');await expect(page.getByRole('dialog',{name:'歌词 PV'})).toHaveCount(0);
 await projectSettings(page);await page.getByRole('button',{name:'导出作品',exact:true}).click();await expect(page.getByRole('dialog',{name:'导出作品',exact:true})).toBeVisible();await page.keyboard.press('Escape');await expect(page.getByLabel('作品设置',{exact:true})).toBeFocused();
});

test('LOOP keeps the prototype pieces in three chapters on desktop and phone and opens the selected lyric card',async({page})=>{
 await page.goto('/03_patchlab_playful.html');await page.getByLabel('原始样稿说明').evaluate(el=>el.remove());
 const original=await page.evaluate(()=>({lyric:document.querySelector('.lyric')!.getBoundingClientRect().height}));

 await page.goto('/');const actual=await page.evaluate(()=>{const top=(s:string)=>document.querySelector(s)!.getBoundingClientRect().top+scrollY;return {heroBottom:document.querySelector('.hero')!.getBoundingClientRect().bottom+scrollY,viewport:innerHeight,board:top('#board'),lyrics:top('#lyrics'),pv:top('#pv'),lyric:document.querySelector('.lyric')!.getBoundingClientRect().height}});
 // Chapter 1 fills the first screen, the Music Blocks bridge sits before the workbench, and the MV chapter comes last.
 expect(Math.abs(actual.heroBottom-actual.viewport)).toBeLessThanOrEqual(2);expect(actual.board).toBeGreaterThan(actual.viewport*1.5);expect(actual.board<actual.lyrics&&actual.lyrics<actual.pv).toBe(true);expect(actual.lyric).toBeLessThanOrEqual(original.lyric+8);
 // The two scroll acts are decorative, driven by scroll position, and play back in reverse (ticket 29).
 const bench=page.locator('.act-bench'),benchStage=bench.locator('.act-stage'),say=page.locator('.act-mv');
 await expect(bench).toHaveAttribute('aria-hidden','true');await expect(say).toHaveAttribute('aria-hidden','true');await expect(benchStage).not.toHaveClass(/is-titled/);
 const into=(selector:string,share:number)=>page.evaluate(([s,k])=>{const a=document.querySelector(s as string)!;scrollTo(0,a.getBoundingClientRect().top+scrollY+(a.clientHeight-innerHeight)*(k as number))},[selector,share]);
 await into('.act-bench',.45);await expect(benchStage).toHaveClass(/is-covered/);await expect(benchStage).toHaveClass(/is-titled/);
 await into('.act-mv',.75);await expect(say).toHaveClass(/is-swapped/);
 await page.evaluate(()=>scrollTo(0,0));await expect(say).not.toHaveClass(/is-swapped/);await expect(benchStage).not.toHaveClass(/is-titled/);
 await expect(page.locator('.workspace-meta')).not.toBeVisible();await expect(page.locator('.engine-panel')).not.toBeVisible();await expect(page.locator('.transport')).toHaveCount(0);await expect(page.locator('.lyric').first().locator(':scope > button')).toHaveCount(1);
 await expect(page.getByRole('heading',{name:/敲一下.*变成一首歌/})).toBeVisible();await expect(page.locator('.hero .bigcard')).toBeVisible();await expect(page.locator('.creation-options')).not.toHaveAttribute('open');

 await page.setViewportSize({width:390,height:844});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 const p=await openPiano(page);await page.getByRole('button',{name:'编辑第2句旋律',exact:true}).click();await expect(page.getByRole('region',{name:'单句钢琴卷帘'}).locator('.phrase-toolbar>b')).toHaveText(p.lyrics[1].text);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});

test('both chapter openers restore the original overlapping circles, timed title pop and full-screen hold',async({page})=>{
 await page.goto('/');
 for(const viewport of [{width:1280,height:800},{width:390,height:844}]){
  await page.setViewportSize(viewport);
  for(const selector of ['.act-bench','.act-mv']){
   const track=page.locator(selector),stage=track.locator('.act-stage');
   const metrics=await track.evaluate(el=>{
    const top=el.getBoundingClientRect().top+scrollY,h=innerHeight;
    return {top,h,overlap:el.previousElementSibling!.getBoundingClientRect().bottom+scrollY-top};
   });
   expect(Math.abs(metrics.overlap-metrics.h)).toBeLessThanOrEqual(1);
   await page.evaluate(y=>scrollTo(0,y),metrics.top);
   await expect(stage).not.toHaveClass(/is-titled/);
   expect(await page.evaluate(()=>!!document.elementFromPoint(innerWidth/2,innerHeight*.47)?.closest('.act'))).toBe(false);
   await page.evaluate(y=>scrollTo(0,y),metrics.top+metrics.h*1.8*.2);
   await expect.poll(()=>stage.evaluate(el=>parseFloat((el as HTMLElement).style.getPropertyValue('--p')))).toBeCloseTo(.2,2);
   const ring=await stage.locator('.act-ring').first().evaluate(el=>{
    const css=getComputedStyle(el),matrix=new DOMMatrixReadOnly(css.transform);
    return {diameter:parseFloat(css.width),scale:matrix.d,y:matrix.f,p:parseFloat((el.parentElement as HTMLElement).style.getPropertyValue('--p'))};
   });
   const diameter=Math.max(viewport.width,viewport.height*.85)*1.5,e=ring.p/.24;
   expect(ring.diameter).toBeCloseTo(diameter,0);
   expect(ring.scale).toBeCloseTo(.55+.45*e,2);
   expect(Math.abs(ring.y-e*(-viewport.height-.15*diameter))).toBeLessThan(1);
   // Stop scrolling just after the threshold: the final letter must finish popping in on its own clock.
   await page.evaluate(y=>scrollTo(0,y),metrics.top+metrics.h*1.8*.43);
   await expect(stage).toHaveClass(/is-titled/);
   const last=stage.locator(selector==='.act-bench'?'.bridge-blocks>span:last-child':'.say-lets');
   await expect(last).toHaveCSS('opacity','1');
   await expect(last).toHaveCSS('translate','0px');
   await page.evaluate(y=>scrollTo(0,y),metrics.top+metrics.h*1.8*.5);
   await expect(stage).toHaveClass(/is-covered/);
   const pin=track.locator('xpath=following-sibling::*[1]');
   await expect(pin).not.toHaveClass(/is-open/);
   await page.evaluate(y=>scrollTo(0,y),metrics.top+metrics.h*1.8);
   await expect(pin).not.toHaveClass(/is-open/);
   expect(metrics.h*1.8*(1-.43)).toBeGreaterThan(metrics.h);
   await page.evaluate(y=>scrollTo(0,y),metrics.top);
   await expect(stage).not.toHaveClass(/is-titled/);
  }
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 }
 await page.emulateMedia({reducedMotion:'reduce'});
 await page.evaluate(()=>scrollTo(0,0));
 for(const selector of ['.act-bench','.act-mv']){
  await expect(page.locator(`${selector} .act-stage`)).toHaveCSS('position','relative');
  await expect(page.locator(selector)).toHaveCSS('margin-top','0px');
 }
 await page.getByRole('button',{name:'音乐积木',exact:true}).click();
 await expect(page.locator('.bench-pin')).toHaveClass(/is-open/);
});

test('Lets plays and completes its phrase animation after entry without further scrolling, then replays on return',async({page})=>{
 const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
 await page.goto('/');
 const act=page.locator('.act-mv'),stage=act.locator('.act-stage'),block=stage.locator('.say-block');
 const outgoing=stage.locator('.say-phrase').first().locator('.say-ch').first();
 const incoming=stage.locator('.say-phrase').last().locator('.say-ch').last();
 for(const viewport of [{width:1280,height:800},{width:390,height:844}]){
  await page.setViewportSize(viewport);
  const top=await act.evaluate(el=>el.getBoundingClientRect().top+scrollY);
  const enter=top+viewport.height*1.8*.5;
  await page.evaluate(y=>scrollTo(0,y),top);
  await expect(act).not.toHaveClass(/is-swapped/);
  // One scroll enters the yellow page. No wheel/mouse/scroll calls until the whole phrase has finished.
  await page.evaluate(y=>scrollTo(0,y),enter);
  await expect(stage).toHaveClass(/is-titled/);
  await expect(outgoing).toHaveCSS('opacity','1');
  const initialWidth=await block.evaluate(el=>el.getBoundingClientRect().width),stoppedAt=await page.evaluate(()=>scrollY);
  await expect(act).toHaveClass(/is-swapped/,{timeout:6000});
  await expect(outgoing).toHaveCSS('opacity','0');await expect(incoming).toHaveCSS('opacity','1');
  await expect(block).toHaveCSS('background-color','rgb(187, 164, 248)');
  expect(await block.evaluate(el=>el.getBoundingClientRect().width)).toBeGreaterThan(initialWidth);
  expect(await page.evaluate(()=>scrollY)).toBe(stoppedAt);
  await expect(stage.locator('.say-hint')).toHaveCSS('opacity','1');
  // Small movements within the page preserve the completed phrase; leaving and returning starts it again.
  await page.evaluate(y=>scrollTo(0,y),enter+20);await expect(act).toHaveClass(/is-swapped/);
  await page.evaluate(y=>scrollTo(0,y),top+viewport.height*1.8*.2);
  await expect(act).not.toHaveClass(/is-swapped/);await expect(incoming).toHaveCSS('opacity','0');
  await page.evaluate(y=>scrollTo(0,y),enter);
  await expect(outgoing).toHaveCSS('opacity','1');
  await expect(act).toHaveClass(/is-swapped/,{timeout:6000});
  expect(Math.abs(await page.evaluate(()=>scrollY)-enter)).toBeLessThanOrEqual(1);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 }
 await page.getByRole('navigation').getByRole('button',{name:'PV ✦',exact:true}).click();
 await expect(page.locator('.mv-pin')).toHaveClass(/is-open/);
 await expect(page.getByRole('region',{name:'歌词 PV',exact:true})).toBeInViewport({ratio:.5});
 await page.emulateMedia({reducedMotion:'reduce'});
 await expect(act).toHaveClass(/is-swapped/);await expect(incoming).toHaveCSS('opacity','1');
 expect(errors).toEqual([]);
});

test('one downward gesture plays the complete Lets to MV reveal and one upward gesture returns to Lets',async({page})=>{
 const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
 await page.goto('/');
 const act=page.locator('.act-mv'),stage=act.locator('.act-stage'),pin=page.locator('.mv-pin'),curtain=stage.locator('.say-curtain');
 const pv=page.getByRole('region',{name:'歌词 PV',exact:true});
 for(const viewport of [{width:1280,height:800},{width:390,height:844}]){
  await page.setViewportSize(viewport);
  const top=await act.evaluate(el=>el.getBoundingClientRect().top+scrollY),enter=top+viewport.height*1.8*.5;
  await page.evaluate(y=>scrollTo(0,y),top);await expect(act).not.toHaveClass(/is-swapped/);
  await page.evaluate(y=>scrollTo(0,y),enter);await expect(act).toHaveClass(/is-swapped/,{timeout:6000});
  // One real wheel input, then no more scrolling until the actual MV is uncovered and usable.
  await page.mouse.wheel(0,100);
  await expect(act).toHaveClass(/is-exiting/);
  await expect(stage).toHaveClass(/is-filled/);
  await expect(pin).toHaveClass(/is-open/,{timeout:6000});
  await expect(act).not.toHaveClass(/is-exiting/);
  await expect(pv).toBeInViewport({ratio:.5});
  expect(await curtain.evaluate(el=>new DOMMatrixReadOnly(getComputedStyle(el).transform).m42)).toBeGreaterThan(viewport.height);
  expect(await page.evaluate(()=>!!document.elementFromPoint(innerWidth/2,innerHeight/2)?.closest('.act'))).toBe(false);
  await pv.getByLabel('字幕样式',{exact:true}).selectOption('poster');
  await expect(pv.getByLabel('字幕样式',{exact:true})).toHaveValue('poster');
  // Scroll within MV normally; the finished transition must not pull the page back to its landing point.
  const {landed,maxScroll}=await page.evaluate(()=>({landed:scrollY,maxScroll:document.documentElement.scrollHeight-innerHeight}));
  await page.mouse.wheel(0,120);
  await expect.poll(()=>page.evaluate(()=>scrollY)).toBeGreaterThanOrEqual(Math.min(landed+60,maxScroll)-1);
  await page.evaluate(y=>scrollTo(0,y),landed);
  await page.mouse.wheel(0,-100);
  await expect(act).toHaveClass(/is-exiting/);
  await expect.poll(()=>curtain.evaluate(el=>new DOMMatrixReadOnly(getComputedStyle(el).transform).m42),{timeout:6000}).toBe(0);
  await expect(act).not.toHaveClass(/is-exiting/);await expect(pin).not.toHaveClass(/is-open/);
  await expect(stage.locator('.say-hint')).toHaveCSS('opacity','1');
  expect(Math.abs(await page.evaluate(()=>scrollY)-(enter+100))).toBeLessThanOrEqual(2);
  // Reversing before the colour block fills the screen also returns to a complete, stable title.
  await page.mouse.wheel(0,100);await expect(act).toHaveClass(/is-exiting/);
  await expect.poll(()=>stage.locator('.say-block').evaluate(el=>el.getBoundingClientRect().height)).toBeGreaterThan(viewport.height*.4);
  await page.mouse.wheel(0,-100);
  await expect(stage.locator('.say-hint')).toHaveCSS('opacity','1',{timeout:6000});
  await expect(act).not.toHaveClass(/is-exiting/);await expect(pin).not.toHaveClass(/is-open/);
  // A fresh downward gesture replays the exit without needing continuous wheel input.
  await page.mouse.wheel(0,100);await expect(pin).toHaveClass(/is-open/,{timeout:6000});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 }
 expect(errors).toEqual([]);
});

test('C expression controls preserve notes and siblings, re-sing one line, recover history and honor locks',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 const before=await openPiano(page),row=page.locator('.qixuan-line').first(),panel=row.locator('.expression-panel');
 await panel.locator(':scope > summary').click();
 await panel.getByLabel('演唱风格',{exact:true}).selectOption('soft');
 await panel.getByLabel('调教方式',{exact:true}).selectOption('manual');
 await panel.getByRole('button',{name:'应用这句调教',exact:true}).click();
 await expect(row).toContainText('需要重新演唱');
 let next=await mockStored(page);expect(next.lyrics[0].performance.preset).toBe('soft');expect(next.lyrics[0].notes).toEqual(before.lyrics[0].notes);expect(next.lyrics.slice(1)).toEqual(before.lyrics.slice(1));expect(next.tracks).toEqual(before.tracks);expect(next.vocalAssets).toEqual(before.vocalAssets);
 // Observe the actual mock Client calls: expression changes never call compose/melody.
 await page.evaluate(async()=>{
  // @ts-expect-error Vite browser module
  const {api}=await import('/src/api/client.ts');(window as any).tuningCalls=[];
  for(const method of ['sing','melody','compose','instruments']){const original=api[method];api[method]=async(input:any)=>{(window as any).tuningCalls.push({method,id:input.lyricId});return original(input)}}
 });
 await row.getByRole('button',{name:'绮萱演唱',exact:true}).click();await expect(row).toContainText('MOCK 测试音已就绪');
 next=await mockStored(page);expect(next.vocalAssets[before.lyrics[1].id]).toEqual(before.vocalAssets[before.lyrics[1].id]);
 expect(await page.evaluate(()=>(window as any).tuningCalls)).toEqual([{method:'sing',id:before.lyrics[0].id}]);
 await panel.getByText('高级调教',{exact:true}).click();await panel.getByLabel('音高过渡（毫秒）',{exact:true}).first().fill('75');await panel.getByRole('button',{name:'应用这句调教',exact:true}).click();
 await expect.poll(async()=>(await mockStored(page)).lyrics[0].performance.transitionMs).toBe(75);
 await panel.getByText('逐音符人工覆盖',{exact:true}).click();const notes=panel.locator('details').filter({has:page.locator('summary').filter({hasText:'逐音符人工覆盖'})});
 await notes.getByLabel('演唱力度',{exact:true}).fill('12');await notes.getByRole('button',{name:'保存音符表达',exact:true}).click();
 await panel.getByRole('button',{name:'锁定音符表达',exact:true}).click();await expect(notes.getByLabel('演唱力度',{exact:true})).toBeDisabled();
 await panel.getByRole('button',{name:'自动调教这一句',exact:true}).click();
 next=await mockStored(page);expect(next.lyrics[0].performance.mode).toBe('auto');expect(next.lyrics[0].performance.overrides.find((o:any)=>o.index===0)).toMatchObject({origin:'manual',dynamics:12,locked:true});expect(next.performanceHistory[before.lyrics[0].id]).toHaveLength(3);
 await panel.getByRole('button',{name:'锁定表达',exact:true}).click();const locked=await mockStored(page);await expect(panel.getByRole('button',{name:'自动调教这一句',exact:true})).toBeDisabled();await expect(panel.getByRole('button',{name:/恢复上一版调教/})).toBeDisabled();
 await panel.getByRole('button',{name:'解锁表达',exact:true}).click();await panel.getByRole('button',{name:/恢复上一版调教/}).click();
 expect((await mockStored(page)).lyrics[0].performance.mode).toBe('manual');expect((await mockStored(page)).lyrics[0].notes).toEqual(locked.lyrics[0].notes);
 await page.setViewportSize({width:390,height:844});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 const saved=await mockStored(page);await page.reload();expect(await mockStored(page)).toEqual(saved);expect(errors).toEqual([]);
});

test('C tuning rejects invalid controls and a failed re-sing preserves the previous assets',async({page})=>{
 const before=await openPiano(page),row=page.locator('.qixuan-line').first(),panel=row.locator('.expression-panel');await panel.locator(':scope > summary').click();await panel.getByText('高级调教',{exact:true}).click();
 const field=panel.getByLabel('音高过渡（毫秒）',{exact:true}).first();await field.fill('999');await panel.getByRole('button',{name:'应用这句调教',exact:true}).click();expect(await mockStored(page)).toEqual(before);
 await field.fill('90');await panel.getByRole('button',{name:'应用这句调教',exact:true}).click();const edited=await mockStored(page);
 await page.evaluate(async()=>{
  // @ts-expect-error Vite browser module
  const {api}=await import('/src/api/client.ts');api.sing=async()=>{throw Error('MOCK 重唱失败，旧资产保留')};
 });
 await row.getByRole('button',{name:'绮萱演唱',exact:true}).click();await expect(row).toContainText('MOCK 重唱失败');expect(await mockStored(page)).toEqual(edited);expect(edited.vocalAssets).toEqual(before.vocalAssets);
});

test('P1 advanced tuning reaches the single-line render request and survives save, locks and invalid edits',async({page})=>{
 const before=await openPiano(page),row=page.locator('.qixuan-line').first(),panel=row.locator('.expression-panel');
 await panel.locator(':scope > summary').click();await panel.getByText('逐音符人工覆盖',{exact:true}).click();await panel.getByText('音高曲线、颤音与音素',{exact:true}).click();
 await panel.getByText('音符音高曲线',{exact:true}).click();
 await panel.getByRole('button',{name:'添加音高曲线点',exact:true}).click();await panel.getByRole('button',{name:'添加音高曲线点',exact:true}).click();await panel.getByLabel('音高曲线点2数值',{exact:true}).fill('10');await panel.getByRole('button',{name:'保存音高曲线',exact:true}).click();
 await panel.getByText('逐音符颤音形态',{exact:true}).click();
 for(const [label,n] of [['颤音长度','70'],['颤音周期','180'],['颤音淡入','20'],['颤音淡出','30'],['颤音漂移','10'],['颤音音量联动','-5']])await panel.getByLabel(label,{exact:true}).fill(n);
 await panel.getByRole('button',{name:'保存颤音形态',exact:true}).click();
 await panel.getByText('逐音素时序与发音',{exact:true}).click();await panel.getByRole('button',{name:'添加音素覆盖',exact:true}).click();await panel.getByLabel('音素1位置',{exact:true}).fill('0');await panel.getByLabel('音素1时序',{exact:true}).fill('50');await panel.getByLabel('音素1发音',{exact:true}).fill('zh/ang');await panel.getByRole('button',{name:'保存音素覆盖',exact:true}).click();
 await panel.getByText('整句表现与力度曲线',{exact:true}).click();
 for(const [abbr,label,y] of [['dyn','力度曲线','-80'],['brec','气声曲线','50']]){await panel.getByLabel('表现曲线',{exact:true}).selectOption(abbr);await panel.getByRole('button',{name:`添加${label}点`,exact:true}).click();await panel.getByRole('button',{name:`添加${label}点`,exact:true}).click();await panel.getByLabel(`${label}点2数值`,{exact:true}).fill(y);await panel.getByRole('button',{name:`保存${label}`,exact:true}).click()}
 const edited=await mockStored(page),override=edited.lyrics[0].performance.overrides.find((o:any)=>o.index===0);
 expect(override).toMatchObject({pitch:[{x:0,y:0,shape:'io'},{x:100,y:10,shape:'io'}],vibratoLength:70,vibratoPeriod:180,vibratoIn:20,vibratoOut:30,vibratoDrift:10,vibratoVolLink:-5,phonemes:[{index:0,offsetMs:50,phoneme:'zh/ang'}]});
 expect(edited.lyrics[0].performance.dynCurve).toEqual([{x:0,y:0},{x:100,y:-80}]);expect(edited.lyrics[0].performance.curves).toContainEqual({abbr:'brec',points:[{x:0,y:0},{x:100,y:50}]});expect(edited.lyrics.slice(1)).toEqual(before.lyrics.slice(1));expect(edited.tracks).toEqual(before.tracks);expect(edited.vocalAssets).toEqual(before.vocalAssets);
 await panel.getByLabel('颤音淡入',{exact:true}).fill('90');await panel.getByRole('button',{name:'保存颤音形态',exact:true}).click();await expect(panel).toContainText('颤音淡入与淡出合计');expect(await mockStored(page)).toEqual(edited);
 await page.evaluate(async()=>{
  // @ts-expect-error Vite browser module
  const {api}=await import('/src/api/client.ts');const original=api.sing;(window as any).advancedRequests=[];api.sing=async(input:any)=>{(window as any).advancedRequests.push(input);return original(input)};
 });
 await row.getByRole('button',{name:'绮萱演唱',exact:true}).click();await expect(row).toContainText('MOCK 测试音已就绪');await expect(panel).toContainText('MOCK/SP');const calls=await page.evaluate(()=>(window as any).advancedRequests);expect(calls).toHaveLength(1);expect(calls[0].performance).toEqual(edited.lyrics[0].performance);expect(calls[0].lyricId).toBe(before.lyrics[0].id);
 const take=(await mockStored(page)).vocalAssets[before.lyrics[0].id];await row.getByRole('button',{name:'重新演唱这一句',exact:true}).click();await expect.poll(async()=>(await mockStored(page)).vocalAssets[before.lyrics[0].id].take).toBe(take.take+1);await row.getByText('对比之前的演唱（最多 3 版）',{exact:true}).click();await row.getByRole('button',{name:'恢复历史演唱1',exact:true}).click();await expect.poll(async()=>(await mockStored(page)).vocalAssets[before.lyrics[0].id].audioUrl).toBe(take.audioUrl);
 await panel.getByRole('button',{name:'锁定音符表达',exact:true}).click();await expect(panel.getByRole('button',{name:'保存颤音形态',exact:true})).toBeDisabled();await expect(panel.getByRole('button',{name:'保存音高曲线',exact:true})).toBeDisabled();const saved=await mockStored(page);await page.setViewportSize({width:390,height:844});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await panel.screenshot({path:'temp/task27-advanced-mobile.png'});await page.reload();expect(await mockStored(page)).toEqual(saved);
});

test('P1 missing singer capabilities keep unsupported phoneme and expression controls unavailable',async({page})=>{
 await openPiano(page);await page.locator('.singing-details>summary').click();await page.evaluate(async()=>{
  // @ts-expect-error Vite browser module
  const {api}=await import('/src/api/client.ts');const original=api.qixuan;api.qixuan=async()=>{const v=await original();delete v.capabilities;return v};
 });
 await page.getByRole('button',{name:'打开逐句演唱',exact:true}).click();const panel=page.locator('.expression-panel').first();await panel.locator(':scope > summary').click();await panel.getByText('逐音符人工覆盖',{exact:true}).click();await panel.getByText('音高曲线、颤音与音素',{exact:true}).click();await panel.getByText('逐音素时序与发音',{exact:true}).click();await expect(panel.getByRole('button',{name:'添加音素覆盖',exact:true})).toBeDisabled();await expect(panel).toContainText('服务未报告音素能力');await panel.getByText('整句表现与力度曲线',{exact:true}).click();await expect(panel.getByLabel('表现曲线',{exact:true}).locator('option[value=brec]')).toHaveJSProperty('disabled',true);
});

test('P1 artifact downloads use current sources, label mock reports and preserve the project after failures',async({page})=>{
 const before=await openPiano(page);await projectSettings(page);await page.getByRole('button',{name:'导出作品',exact:true}).click();const dialog=page.getByRole('dialog',{name:'导出作品',exact:true}),files=dialog.locator('.artifact-downloads');await files.locator(':scope>summary').click();
 await expect(files.getByRole('button',{name:'准备器乐分轨（FluidSynth）',exact:true})).toBeDisabled();await expect(files).toContainText('MOCK 文件');
 const download=page.waitForEvent('download');await files.getByRole('button',{name:'下载 USTX',exact:true}).first().click();expect((await download).suggestedFilename()).toContain('.mock.ustx');
 await files.getByRole('button',{name:'测量响度',exact:true}).first().click();await expect(files).toContainText('MOCK 固定数值，非实测');
 await page.evaluate(async()=>{
  // @ts-expect-error Vite browser module
  const {api}=await import('/src/api/client.ts');(window as any).originalArtifact=api.artifact;(window as any).originalLoudness=api.loudness;api.artifact=async()=>{throw Error('缓存不存在')};api.loudness=async()=>{throw Error('响度测量不可用')};
 });
 await files.getByRole('button',{name:'下载 WAV',exact:true}).first().click();await expect(files).toContainText('缓存不存在');await files.getByRole('button',{name:'测量响度',exact:true}).first().click();await expect(files).toContainText('响度测量不可用');expect(await mockStored(page)).toEqual(before);
 await page.keyboard.press('Escape');await projectSettings(page);await page.locator('.engine-panel summary').click();await page.getByLabel('乐器音源',{exact:true}).selectOption('fluidsynth');await page.getByRole('button',{name:'导出作品',exact:true}).click();await files.getByRole('button',{name:'准备器乐分轨（FluidSynth）',exact:true}).click();await expect(files.getByRole('button',{name:'下载 MID',exact:true}).first()).toBeVisible({timeout:20000});
 await page.evaluate(async()=>{
  // @ts-expect-error Vite browser module
  const {api}=await import('/src/api/client.ts');api.artifact=(window as any).originalArtifact;api.loudness=(window as any).originalLoudness;
 });
 const midi=page.waitForEvent('download');await files.getByRole('button',{name:'下载 MID',exact:true}).first().click();expect((await midi).suggestedFilename()).toContain('.mock.mid');
 const pv=page.waitForEvent('download');await dialog.getByRole('button',{name:/歌词视频 PV/}).click();expect((await pv).suggestedFilename()).toContain('.mock-export.json');await expect(dialog.getByRole('region',{name:'MP4 响度报告'})).toContainText('没有成片响度实测');
 await page.setViewportSize({width:390,height:844});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await dialog.screenshot({path:'temp/task27-artifacts-mobile.png'});
});

test('C mix controls forward all preview stems and persist real PCM changes through WAV/PV export',async({page})=>{
 test.setTimeout(90000);
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await openPiano(page);
 const mix=page.locator('.mix-panel');await mix.locator(':scope > summary').click();
 await expect(mix.getByLabel('伴奏音量',{exact:true})).toBeDisabled();await expect(mix).toContainText('当前浏览器伴奏暂不支持音量调整');
 await mix.getByLabel('人声音量',{exact:true}).fill('0');await mix.getByLabel('人声混响',{exact:true}).fill('0.12');
 await page.evaluate(async()=>{
  // @ts-expect-error Vite browser module
  const {AudioEngine}=await import('/src/audio.ts');const original=AudioEngine.prototype.play;(window as any).previewStems=[];
  AudioEngine.prototype.play=async function(p:any,offset:number,options:any){(window as any).previewStems.push(options.stem);return original.call(this,p,offset,options)};
 });
 for(const stem of ['vocal-dry','vocal-processed','instrumental','mix']){
  await mix.getByLabel('试听内容',{exact:true}).selectOption(stem);await mix.getByRole('button',{name:'试听所选分轨',exact:true}).click();await expect(mix.getByRole('button',{name:'停止分轨试听',exact:true})).toBeEnabled();await mix.getByRole('button',{name:'停止分轨试听',exact:true}).click();
 }
 expect(await page.evaluate(()=>(window as any).previewStems)).toEqual(['vocal-dry','vocal-processed','instrumental','mix']);
 const pcm=await page.evaluate(async()=>{
  // @ts-expect-error Vite browser module
  const {renderAudio}=await import('/src/audio.ts');const p=JSON.parse(localStorage.getItem('songyu-mock-project-v1')!);
  const power=(buffer:AudioBuffer)=>{const samples=buffer.getChannelData(0);return samples.reduce((sum,v)=>sum+v*v,0)/samples.length};
  const dry=power((await renderAudio(p,{stem:'vocal-dry'})).buffer),processed=power((await renderAudio(p,{stem:'vocal-processed'})).buffer);
  p.mixSettings.vocalGain=1;p.mixSettings.reverb=0;const plain=(await renderAudio(p,{stem:'vocal-processed'})).buffer.getChannelData(0);
  p.mixSettings.reverb=.12;const wet=(await renderAudio(p,{stem:'vocal-processed'})).buffer.getChannelData(0);
  let difference=0;for(let i=0;i<plain.length;i++)difference+=Math.abs(wet[i]-plain[i]);
  return {dry,processed,difference};
 });expect(pcm.dry).toBeGreaterThan(0);expect(pcm.processed).toBe(0);expect(pcm.difference).toBeGreaterThan(0);
 // Existing source selector enables the already supported external-instrument gain path.
 await projectSettings(page);await page.locator('.engine-panel summary').click();await page.getByLabel('乐器音源',{exact:true}).selectOption('fluidsynth');await projectSettings(page);await page.getByLabel('作品设置',{exact:true}).click();
 await expect(mix.getByLabel('伴奏音量',{exact:true})).toBeEnabled();await mix.getByLabel('伴奏音量',{exact:true}).fill('0');
 // Both audible buses are now zero; verify the existing exports receive silence, not just settings JSON.
 await projectSettings(page);await page.getByRole('button',{name:'导出作品',exact:true}).click();
 const dialog=page.getByRole('dialog',{name:'导出作品',exact:true}),download=page.waitForEvent('download');await dialog.getByRole('button',{name:/混音音频/}).click();const file=await download,stream=(await file.createReadStream())!,chunks:Buffer[]=[];for await(const part of stream)chunks.push(Buffer.from(part));const bytes=Buffer.concat(chunks);expect(bytes.length).toBeGreaterThan(44);expect(bytes.subarray(44).every(v=>v===0)).toBe(true);
 await page.evaluate(async()=>{
  // @ts-expect-error Vite browser module
  const {api}=await import('/src/api/client.ts');const original=api.exportVideo;api.exportVideo=async(input:any)=>{const bytes=Uint8Array.from(atob(input.wav),(c:string)=>c.charCodeAt(0));(window as any).pvSilent=bytes.slice(44).every(v=>v===0);return original(input)};
 });
 const pv=page.waitForEvent('download');await dialog.getByRole('button',{name:/歌词视频 PV/}).click();expect((await pv).suggestedFilename()).toContain('.mock-export.json');expect(await page.evaluate(()=>(window as any).pvSilent)).toBe(true);
 await page.keyboard.press('Escape');const saved=await mockStored(page);await page.reload();expect(await mockStored(page)).toEqual(saved);await page.locator('.mix-panel>summary').click();expect((await mockStored(page)).mixSettings).toMatchObject({vocalGain:0,bandGain:0,reverb:.12});
 await page.setViewportSize({width:390,height:844});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);expect(errors).toEqual([]);
});
