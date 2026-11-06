import {test,expect} from '@playwright/test';

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

test('frontend alone supports planning, locks, singing, sibling cache, playback, reload and exports with zero API requests',async({page})=>{
 const requests:string[]=[],errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/api/**',route=>{if(!new URL(route.request().url()).pathname.startsWith('/api/'))return route.continue();requests.push(route.request().url());return route.abort()});
 await page.goto('/');await expect(page.getByRole('note')).toContainText('MOCK 开发模式');await expect(page.locator('.honesty')).toContainText('未调用 LLM');
 await page.getByRole('button',{name:'让灵感发芽'}).click();await expect(page.locator('.workspace-meta')).toContainText('MOCK 固定测试作品');
 const stored=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('songyu-mock-project-v1')!));
 expect((await stored()).planning.mock).toBe(true);expect(await page.evaluate(()=>localStorage.getItem('songyu-project-v1'))).toBeNull();
 await page.getByRole('navigation').getByRole('button',{name:/音乐积木/}).click();await page.getByRole('button',{name:'锁定吉他',exact:true}).click();const locked=(await stored()).tracks.filter((t:any)=>t.locked);
 await page.getByRole('button',{name:'重做未锁定积木'}).click();expect((await stored()).tracks.filter((t:any)=>t.locked)).toEqual(locked);
 await page.getByRole('navigation').getByRole('button',{name:/虚拟歌姬/}).click();const rows=page.locator('.qixuan-line');
 await expect(page.locator('.qixuan-controls')).toContainText('MOCK 测试声库');await rows.nth(0).getByRole('button',{name:'绮萱演唱',exact:true}).click();await expect(rows.nth(0)).toContainText('MOCK 测试音已就绪');
 const first=(await stored()).vocalAssets;await page.getByLabel('第2句歌词',{exact:true}).fill('修改第二句的歌词');await rows.nth(1).getByRole('button',{name:'绮萱演唱',exact:true}).click();await expect(rows.nth(1)).toContainText('MOCK 测试音已就绪');
 expect((await stored()).vocalAssets[(await stored()).lyrics[0].id]).toEqual(first[(await stored()).lyrics[0].id]);
 await rows.nth(1).getByRole('button',{name:'重新演唱这一句',exact:true}).click();await expect(rows.nth(1)).toContainText('v2');expect((await stored()).vocalHistory[(await stored()).lyrics[1].id]).toHaveLength(1);
 await page.getByRole('button',{name:'生成缺失的演唱',exact:true}).click();await expect(rows.nth(3)).toContainText('MOCK 测试音已就绪');
 await rows.nth(0).getByRole('button',{name:'试听这一句',exact:true}).click();await expect(page.getByRole('button',{name:'暂停全曲',exact:true})).toBeVisible();await page.getByRole('button',{name:'暂停全曲',exact:true}).click();
 await page.locator('.engine-panel summary').click();await page.getByLabel('乐器音源',{exact:true}).selectOption('fluidsynth');
 await page.reload();await expect(page.getByRole('note')).toBeVisible();
 await page.getByRole('button',{name:'导出作品',exact:true}).click();const wav=page.waitForEvent('download');await page.getByRole('button',{name:/混音音频/}).click();expect((await wav).suggestedFilename()).toContain('.mock.wav');
 const project=page.waitForEvent('download');await page.getByRole('button',{name:/完整工程/}).click();expect((await project).suggestedFilename()).toContain('.mock.songyu.json');
 await page.getByRole('button',{name:'关闭导出',exact:true}).click();await page.getByRole('navigation').getByRole('button',{name:/歌词 PV/}).click();await expect(page.locator('.export-status')).toContainText('未运行 FFmpeg');const exported=page.waitForEvent('download');await page.getByRole('button',{name:'模拟导出 MP4',exact:true}).click();expect((await exported).suggestedFilename()).toContain('.mock-export.json');await expect(page.getByRole('status').filter({hasText:'未生成 MP4'})).toBeVisible();
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
 await page.getByLabel('自由创作歌词',{exact:true}).fill(lyrics.join('\n'));
 await page.getByLabel('自由创作速度',{exact:true}).fill('100');await page.getByLabel('自由创作时长',{exact:true}).selectOption('30');
 await page.getByRole('button',{name:'制作新作品',exact:true}).click();await expect(page.getByLabel('制作状态')).toContainText('MOCK 测试阶段');
 expect((await mockStored(page)).id).toBe(before.id);
 await expect(page.getByRole('button',{name:'试听这首作品',exact:true})).toBeVisible({timeout:25000});
 const p=await mockStored(page);expect(p.id).not.toBe(before.id);expect(p.mode).toBe('free');expect(p.bpm).toBe(100);expect(p.lyrics.map((l:any)=>l.text)).toEqual(lyrics);expect(p.planning.mock).toBe(true);
 expect(await page.evaluate(()=>localStorage.getItem('songyu-project-v1'))).toBe(JSON.stringify(before));
 await page.getByRole('button',{name:'试听这首作品',exact:true}).click();await expect(page.getByRole('button',{name:'暂停这首作品',exact:true})).toBeVisible({timeout:20000});
 await expect.poll(async()=>Number(await page.getByRole('slider',{name:'播放进度'}).inputValue())).toBeGreaterThan(.1);
 await page.getByRole('button',{name:'暂停这首作品',exact:true}).click();
 await page.screenshot({path:'D:/vibe-coding_/temp/songyu-a2-desktop.png',fullPage:true});
 await page.setViewportSize({width:390,height:844});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
 await page.screenshot({path:'D:/vibe-coding_/temp/songyu-a2-mobile.png',fullPage:true});
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
 if(edit==='input')await page.getByLabel('自由创作歌词',{exact:true}).fill('这句是我刚改的词');
 if(edit==='project'){await page.locator('.engine-panel summary').click();await page.getByLabel('bass GM',{exact:true}).fill('34')}
 if(edit==='navigate')await page.getByRole('navigation').getByRole('button',{name:/音乐积木/}).click();
 if(edit==='cancel')await page.getByRole('button',{name:'停止等待，保留当前工程',exact:true}).click();
 const expected=await mockStored(page);await page.evaluate(()=>(window as any).releaseProduction());
 await expect.poll(()=>page.evaluate(()=>(window as any).productionDelivered)).toBe(true);
 expect(await mockStored(page)).toEqual(expected);expect((await mockStored(page)).id).toBe(before.id);
 if(edit==='navigate')await page.getByRole('navigation').getByRole('button',{name:/灵感空间/}).click();
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
