import {test,expect} from '@playwright/test';
import {creationSettings,projectSettings} from './settings';


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
 expect(requests).toEqual([]);expect(errors).toEqual([]);await page.screenshot({path:'mock-test-results/frontend.png',fullPage:true});
});

test('Vite cannot proxy administration in standalone mode',async({request})=>{for(const path of ['/admin','/api/admin/state','/admin-assets/admin.js'])expect((await request.get(path)).status()).toBe(403)});

test('new Mock API builds, restores and mixes a free project in the browser without a backend',async({page})=>{
 const requests:string[]=[],errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/api/**',route=>{if(!new URL(route.request().url()).pathname.startsWith('/api/'))return route.continue();requests.push(route.request().url());return route.abort()});
 await page.goto('/');
 const result=await page.evaluate(async()=>{
  // @ts-expect-error Vite serves browser modules directly.
  const {api}=await import('/src/api/client.ts');
  // @ts-expect-error browser module
  const {validateProject}=await import('/src/model.ts');
  // @ts-expect-error browser module
  const {initialProject,canAutoSave,STORAGE,readProject}=await import('/src/features/project/files.ts');
  // @ts-expect-error browser module
  const {renderAudio}=await import('/src/audio.ts');
  let job=await api.startProduction({intent:'MOCK 浏览器新流程测试',lyrics:['风吹过小岛','灯照着海岸']});
  for(let i=0;i<20&&job.state==='running';i++)job=await api.production(job.id);
  const p=validateProject(job.project),audio=await renderAudio(p),samples=audio.buffer.getChannelData(0);
  let energy=0;for(const sample of samples)energy+=sample*sample;
  localStorage.setItem(STORAGE,JSON.stringify(p));
  const restored=initialProject(),imported=await readProject(new File([JSON.stringify(p)],'fixture.mock.songyu.json'));
  return {state:job.state,stage:job.stage,mock:restored.planning.mock,draftMock:restored.melodyDraft.mock,source:restored.planning.source,lyrics:restored.lyrics.map((l:any)=>l.text),same:restored.id===p.id&&imported.id===p.id,canAutoSave:canAutoSave(),rms:Math.sqrt(energy/samples.length),realStorage:localStorage.getItem('songyu-project-v1')};
 });
 expect(result).toMatchObject({state:'succeeded',stage:'ready-for-mix',mock:true,draftMock:true,source:'local-rules',same:true,canAutoSave:true,realStorage:null,lyrics:['风吹过小岛','灯照着海岸']});
 expect(result.rms).toBeGreaterThan(.001);expect(requests).toEqual([]);expect(errors).toEqual([]);
});

test('A2 page makes a new five-line song, reports fixture stages, plays and restores isolated storage',async({page})=>{
 const requests:string[]=[],errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/api/**',route=>{if(!new URL(route.request().url()).pathname.startsWith('/api/'))return route.continue();requests.push(route.request().url());return route.abort()});
 await page.goto('/');const before=await mockStored(page);
 await page.evaluate(before=>localStorage.setItem('songyu-project-v1',JSON.stringify(before)),before);
 const lyrics=['  风吹过小岛  ','灯照着海岸','雨停在窗边','我走向明天','把心事放下'];
 await page.getByLabel('自由创作主题',{exact:true}).fill('雨后释然，前半段安静，后半段明亮');
 await creationSettings(page);await page.getByLabel('自由创作歌词',{exact:true}).fill(lyrics.join('\n'));
 await page.getByLabel('自由创作速度',{exact:true}).fill('100');await page.getByLabel('自由创作时长',{exact:true}).selectOption('30');
 await page.getByRole('button',{name:'制作新作品',exact:true}).click();await expect(page.getByLabel('制作状态')).toContainText('MOCK 测试阶段');
 expect((await mockStored(page)).id).toBe(before.id);
 await expect(page.getByRole('button',{name:'试听这首作品',exact:true})).toBeVisible({timeout:25000});
 const p=await mockStored(page);expect(p.id).not.toBe(before.id);expect(p.mode).toBe('free');expect(p.bpm).toBe(100);expect(p.lyrics.map((l:any)=>l.text)).toEqual(lyrics);expect(p.planning.mock).toBe(true);
 expect(await page.evaluate(()=>localStorage.getItem('songyu-project-v1'))).toBe(JSON.stringify(before));
 await page.getByRole('button',{name:'试听这首作品',exact:true}).click();await expect(page.getByRole('button',{name:'暂停这首作品',exact:true})).toBeVisible({timeout:20000});
 await expect.poll(async()=>Number(await page.getByRole('slider',{name:'播放进度'}).inputValue())).toBeGreaterThan(.1);
 await page.getByRole('button',{name:'暂停这首作品',exact:true}).click();
 await page.screenshot({path:'temp/songyu-loop-a2-desktop.png',fullPage:true});
 await page.setViewportSize({width:390,height:844});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
 await page.screenshot({path:'temp/songyu-loop-a2-mobile.png',fullPage:true});
 await page.reload();expect((await mockStored(page)).id).toBe(p.id);await page.getByRole('button',{name:'播放全曲',exact:true}).click();await expect(page.getByRole('button',{name:'暂停全曲',exact:true})).toBeVisible({timeout:20000});
 expect(requests).toEqual([]);expect(errors).toEqual([]);
});

for(const scenario of ['planning-failure','lost'])test(`A2 page preserves the saved project after ${scenario}`,async({page})=>{
 await page.goto('/');await productionScenario(page,scenario);const before=await mockStored(page);
 await page.getByLabel('自由创作主题',{exact:true}).fill('失败保护测试');await page.getByRole('button',{name:'制作新作品',exact:true}).click();
 await expect(page.locator('.production-error')).toBeVisible({timeout:20000});
 if(scenario==='lost')await expect(page.locator('.production-error')).toContainText('任务已丢失');
 expect(await mockStored(page)).toEqual(before);await expect(page.getByRole('button',{name:'试听这首作品',exact:true})).toHaveCount(0);
});

test('A2 page retries missing singing and only applies the completed project',async({page})=>{
 await page.goto('/');await productionScenario(page,'singing-failure');const before=await mockStored(page);
 await page.getByLabel('自由创作主题',{exact:true}).fill('测试单句失败后重试');await page.getByRole('button',{name:'制作新作品',exact:true}).click();
 await expect(page.getByRole('button',{name:'重试缺失的演唱',exact:true})).toBeVisible({timeout:20000});expect(await mockStored(page)).toEqual(before);
 await page.getByRole('button',{name:'重试缺失的演唱',exact:true}).click();await expect(page.getByRole('button',{name:'试听这首作品',exact:true})).toBeVisible();expect((await mockStored(page)).mode).toBe('free');
});

for(const edit of ['input','project','navigate','cancel'])test(`A2 page discards late production after ${edit}`,async({page})=>{
 await page.goto('/');await holdProduction(page);const before=await mockStored(page);
 await page.getByLabel('自由创作主题',{exact:true}).fill('迟到结果测试');await page.getByRole('button',{name:'制作新作品',exact:true}).click();
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
 await page.getByLabel('自由创作主题',{exact:true}).fill('错误工程夹具');await page.getByRole('button',{name:'制作新作品',exact:true}).click();
 await expect(page.locator('.production-error')).toContainText('当前工程已保留');expect(await mockStored(page)).toEqual(before);
});

test('A2 page applies the newer creation even when an older request returns later',async({page})=>{
 await page.goto('/');
 await page.evaluate(async()=>{
  // @ts-expect-error browser client
  const {api}=await import('/src/api/client.ts');const original=api.startProduction;let count=0;
  api.startProduction=async(input:unknown)=>{const first=++count===1,result=await original(input);if(first)await new Promise<void>(resolve=>{(window as any).releaseProduction=resolve});return result};
 });
 await page.getByLabel('自由创作主题',{exact:true}).fill('较早的主题');await page.getByRole('button',{name:'制作新作品',exact:true}).click();
 await expect.poll(()=>page.evaluate(()=>typeof (window as any).releaseProduction)).toBe('function');
 await page.getByLabel('自由创作主题',{exact:true}).fill('最新的主题');await page.getByRole('button',{name:'制作新作品',exact:true}).click();
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
  await page.getByLabel('自由创作主题',{exact:true}).fill(message);await page.getByRole('button',{name:'制作新作品',exact:true}).click();
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
 await page.screenshot({path:'temp/songyu-loop-c-piano-desktop.png',fullPage:true});
 await page.setViewportSize({width:390,height:844});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);await page.screenshot({path:'temp/songyu-loop-c-piano-mobile.png',fullPage:true});
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
 await page.goto('/');const before=await mockStored(page),sectionId=before.sections[1].id;
 const rows=page.locator('#tracks .track');await expect(rows).toHaveCount(before.tracks.filter((t:any)=>t.sectionId===sectionId).length);
 const step=page.getByRole('button',{name:'吉他 第2格',exact:true}),wasOn=await step.getAttribute('aria-pressed');await step.click();await expect(step).toHaveAttribute('aria-pressed',wasOn==='true'?'false':'true');
 const edited=await mockStored(page),guitar=edited.tracks.find((t:any)=>t.sectionId===sectionId&&t.kind==='guitar');expect(guitar.manuallyEdited).toBe(true);expect(guitar.notes).not.toEqual(before.tracks.find((t:any)=>t.id===guitar.id).notes);
 await page.getByRole('button',{name:'锁定吉他',exact:true}).click();const locked=(await mockStored(page)).tracks.find((t:any)=>t.id===guitar.id);await expect(step).toBeDisabled();await page.getByRole('button',{name:'重做未锁定积木',exact:true}).click();expect((await mockStored(page)).tracks.find((t:any)=>t.id===guitar.id)).toEqual(locked);
 const order=await rows.evaluateAll(elements=>elements.map(el=>el.getAttribute('data-track')));await rows.nth(0).dragTo(rows.nth(2));await expect.poll(()=>rows.evaluateAll(elements=>elements.map(el=>el.getAttribute('data-track')))).toEqual([order[1],order[2],order[0],...order.slice(3)]);
 await page.getByRole('button',{name:'上移鼓点',exact:true}).click();const saved=await mockStored(page),expected=saved.tracks.filter((t:any)=>t.sectionId===sectionId).map((t:any)=>t.id);await page.reload();expect(await rows.evaluateAll(elements=>elements.map(el=>el.getAttribute('data-track')))).toEqual(expected);
 await page.locator('input[accept=".json"]').setInputFiles({name:'restored.mock.songyu.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(saved))});await expect(page.getByRole('status').filter({hasText:'工程已恢复'})).toBeVisible();expect(await mockStored(page)).toEqual(saved);
});

test('LOOP tap uses recorded timing; PV canvas uses the project clock and dialogs return focus',async({page})=>{
 await page.goto('/');const pad=page.getByRole('button',{name:'敲击节奏',exact:true});for(let i=0;i<5;i++){await pad.click();if(i<4)await page.waitForTimeout(500)}
 await page.getByRole('button',{name:/变成鼓点/}).click();const p=await mockStored(page);expect(p.tapTimes).toHaveLength(5);expect(p.bpm).toBeGreaterThan(90);expect(p.bpm).toBeLessThan(130);
 await page.getByRole('slider',{name:'播放进度',exact:true}).fill('10');await page.getByRole('navigation').getByRole('button',{name:'PV ✦',exact:true}).click();const pv=page.getByRole('dialog',{name:'歌词 PV',exact:true});await expect(pv).toBeVisible();await expect(pv.locator('.pvfoot')).toContainText('00:10');
 const matches=await pv.locator('canvas').evaluate(async canvas=>{
  // @ts-expect-error Vite browser module
  const {drawPV}=await import('/src/visual.ts');const project=JSON.parse(localStorage.getItem('songyu-mock-project-v1')!),expected=document.createElement('canvas');expected.width=1280;expected.height=720;drawPV(expected,project,10);return (canvas as HTMLCanvasElement).toDataURL()===expected.toDataURL();
 });expect(matches).toBe(true);
 await page.getByLabel('字幕样式',{exact:true}).selectOption('poster');expect((await mockStored(page)).subtitleStyle).toBe('poster');await page.keyboard.press('Escape');await expect(pv).not.toBeVisible();await expect(page.getByRole('navigation').getByRole('button',{name:'PV ✦',exact:true})).toBeFocused();
 await projectSettings(page);await page.getByRole('button',{name:'导出作品',exact:true}).click();await expect(page.getByRole('dialog',{name:'导出作品',exact:true})).toBeVisible();await page.keyboard.press('Escape');await expect(page.getByLabel('作品设置',{exact:true})).toBeFocused();
});

test('LOOP retains prototype layout on desktop and phone and opens the selected lyric card',async({page})=>{
 await page.goto('/03_patchlab_playful.html');await page.getByLabel('原始样稿说明').evaluate(el=>el.remove());
 const original=await page.evaluate(()=>({hero:document.querySelector('.hero')!.getBoundingClientRect().height,board:document.querySelector('#board')!.getBoundingClientRect().top,lyric:document.querySelector('.lyric')!.getBoundingClientRect().height}));
 await page.screenshot({path:'temp/songyu-loop-original-layout.png',fullPage:true});
 await page.goto('/');const actual=await page.evaluate(()=>({hero:document.querySelector('.hero')!.getBoundingClientRect().height,board:document.querySelector('#board')!.getBoundingClientRect().top,lyric:document.querySelector('.lyric')!.getBoundingClientRect().height}));
 expect(Math.abs(actual.hero-original.hero)).toBeLessThanOrEqual(2);expect(Math.abs(actual.board-original.board)).toBeLessThanOrEqual(2);expect(actual.lyric).toBeLessThanOrEqual(original.lyric+8);
 await expect(page.locator('.workspace-meta')).not.toBeVisible();await expect(page.locator('.engine-panel')).not.toBeVisible();await expect(page.locator('.transport')).toHaveCount(0);await expect(page.locator('.lyric').first().locator(':scope > button')).toHaveCount(1);
 await expect(page.getByRole('heading',{name:/敲一下.*变成一首歌/})).toBeVisible();await expect(page.locator('.hero .bigcard')).toBeVisible();await expect(page.locator('.creation-options')).not.toHaveAttribute('open');
 await page.screenshot({path:'temp/songyu-loop-restored-desktop.png',fullPage:true});
 await page.setViewportSize({width:390,height:844});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.screenshot({path:'temp/songyu-loop-restored-mobile.png',fullPage:true});
 const p=await openPiano(page);await page.getByRole('button',{name:'编辑第2句旋律',exact:true}).click();await expect(page.getByRole('region',{name:'单句钢琴卷帘'}).locator('.phrase-toolbar>b')).toHaveText(p.lyrics[1].text);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
