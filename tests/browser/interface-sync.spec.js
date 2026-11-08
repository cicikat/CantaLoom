import {test,expect} from '@playwright/test';
import {creationSettings,startMaking,projectSettings} from './settings';
import {readFile} from 'node:fs/promises';
const stored=page=>page.evaluate(()=>JSON.parse(localStorage.getItem('songyu-mock-project-v1')));
async function pvPanel(page){await page.locator('#navpv').click();const panel=page.locator('.pv-design-controls');if(!await panel.evaluate(e=>e.open))await panel.locator('summary').click();return panel}
async function generatePv(page){const panel=await pvPanel(page);await panel.getByRole('button',{name:'生成 AI 画面',exact:true}).click();await expect(page.getByTitle('AI HTML PV 预览')).toBeVisible();return panel}
async function productionScenario(page,scenario){await page.evaluate(async scenario=>{
 const {createMockRequest}=await import('/src/api/mock.ts'),{api}=await import('/src/api/client.ts');
 // Preserve Mock checks by routing through a real client whose results are explicitly parsed by the public schema.
 const request=createMockRequest(scenario),{productionJobSchema}=await import('/shared/contracts/production.mjs');
 const send=async(path,body)=>{const response=await request(path,{method:body===undefined?'GET':'POST',...(body===undefined?{}:{body:JSON.stringify(body)})});return productionJobSchema.parse(await response.json())};
 api.startProduction=input=>send('/api/production',input);api.production=id=>send('/api/production/'+id);api.retryProduction=(id,line)=>send(`/api/production/${id}/retry/${line}`,{});
},scenario)}
test.beforeEach(async({page})=>{await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/')});

test('36 explicit first phoneme zero survives save/reopen and render while blank remains absent',async({page})=>{
 await page.evaluate(async()=>{const {api}=await import('/src/api/client.ts');let job=await api.startProduction({intent:'零偏移页面测试',lyrics:['风吹过小岛','灯照着海岸']});for(let i=0;i<20&&job.state==='running';i++)job=await api.production(job.id);if(job.state!=='succeeded')throw Error('fixture failed');job.project.lyrics[0].performance={preset:'natural',mode:'manual',consonantMs:12};localStorage.setItem('songyu-mock-project-v1',JSON.stringify(job.project))});
 await page.reload();const before=await stored(page);
 async function controls(){await page.getByRole('button',{name:'打开逐句演唱',exact:true}).click();const row=page.locator('.qixuan-line').first(),panel=row.locator('.expression-panel');await panel.locator(':scope > summary').click();await panel.getByText('逐音符人工覆盖',{exact:true}).click();await panel.getByText('音高曲线、颤音与音素',{exact:true}).click();await panel.getByText('逐音素时序与发音',{exact:true}).click();return {row,panel}}
 let {panel}=await controls();await expect(panel).not.toContainText('已交引擎修复');await panel.getByRole('button',{name:'添加音素覆盖',exact:true}).click();await panel.getByLabel('音素1位置',{exact:true}).fill('0');await panel.getByLabel('音素1时序',{exact:true}).fill('0');await panel.getByRole('button',{name:'保存音素覆盖',exact:true}).click();
 expect((await stored(page)).lyrics[0].performance.overrides[0].phonemes).toEqual([{index:0,offsetMs:0}]);await page.reload();const reopened=await controls();panel=reopened.panel;await expect(panel.getByLabel('音素1时序',{exact:true})).toHaveValue('0');
 await page.evaluate(async()=>{const {api}=await import('/src/api/client.ts');const sing=api.sing;api.sing=input=>{window.zeroRequest=input;return sing(input)}});await reopened.row.getByRole('button',{name:'绮萱演唱',exact:true}).click();await expect(reopened.row).toContainText('MOCK 测试音已就绪');
 const request=await page.evaluate(()=>window.zeroRequest);expect(request.performance.consonantMs).toBe(12);expect(request.performance.overrides[0].phonemes[0].offsetMs).toBe(0);
 expect((await stored(page)).lyrics.slice(1)).toEqual(before.lyrics.slice(1));expect((await stored(page)).tracks).toEqual(before.tracks);
 await panel.getByLabel('音素1时序',{exact:true}).fill('');await panel.getByLabel('音素1发音',{exact:true}).fill('zh/ang');await panel.getByRole('button',{name:'保存音素覆盖',exact:true}).click();expect((await stored(page)).lyrics[0].performance.overrides[0].phonemes).toEqual([{index:0,phoneme:'zh/ang'}]);
});

test('36 Groove controls persist, production sends settings and Synth PCM respects all protection flags',async({page})=>{
 const before=await stored(page);await creationSettings(page);await page.getByText('器乐律动',{exact:true}).click();
 await page.getByLabel('启用器乐律动',{exact:true}).check();await page.getByLabel('摇摆',{exact:true}).fill('72');await page.getByLabel('起音变化',{exact:true}).fill('12');await page.getByLabel('力度变化',{exact:true}).fill('0.08');
 const changed=await stored(page);expect(changed.grooveSettings).toEqual({swingTicks:72,timingTicks:12,velocityAmount:.08});expect(changed.tracks).toEqual(before.tracks);
 const report=await page.evaluate(async()=>{
  const {renderAudio}=await import('/src/audio.ts');const p=JSON.parse(localStorage.getItem('songyu-mock-project-v1')),t=p.tracks.find(t=>t.kind==='keys'),section=p.sections.find(s=>s.id===t.sectionId);
  t.notes=[0,.5,1,1.5].map((b,i)=>({id:'groove-pcm-'+i,beat:section.start+b,duration:.28,midi:60,velocity:.18}));t.locked=false;t.manuallyEdited=false;
  const metrics=b=>{let sum=0;for(const x of b.getChannelData(0))sum+=x*x;return sum},diff=(a,b)=>{let d=0;for(let i=0;i<a.length;i++)d+=Math.abs(a[i]-b[i]);return d};
  const render=async next=>(await renderAudio(next,{trackId:t.id})).buffer;
  const plain=structuredClone(p);delete plain.grooveSettings;const a=await render(plain),b=await render(p),again=await render(p);
  const result={audible:metrics(b)>0,diff:diff(a.getChannelData(0),b.getChannelData(0)),stable:diff(b.getChannelData(0),again.getChannelData(0)),protected:[]};
  for(const protection of ['locked','manuallyEdited','note']){const x=structuredClone(p),track=x.tracks.find(v=>v.id===t.id);if(protection==='note')track.notes[0].locked=true;else track[protection]=true;const baseline=structuredClone(x);delete baseline.grooveSettings;result.protected.push(diff((await render(x)).getChannelData(0),(await render(baseline)).getChannelData(0)))}
  const zero=structuredClone(p);zero.grooveSettings={swingTicks:0,timingTicks:0,velocityAmount:0};result.zero=diff((await render(zero)).getChannelData(0),a.getChannelData(0));return result;
 });expect(report.audible).toBe(true);expect(report.diff).toBeGreaterThan(1);expect(report.stable).toBe(0);expect(report.protected).toEqual([0,0,0]);expect(report.zero).toBe(0);
 await page.getByRole('button',{name:'完成',exact:true}).click();await page.reload();expect((await stored(page)).grooveSettings).toEqual(changed.grooveSettings);
 await page.evaluate(async()=>{const {api}=await import('/src/api/client.ts');const start=api.startProduction;api.startProduction=input=>{window.production36=input;return start(input)}});
 await startMaking(page);await expect(page.getByRole('button',{name:'试听这首作品',exact:true})).toBeVisible({timeout:20000});
 expect((await stored(page)).grooveSettings).toEqual(changed.grooveSettings);expect(await page.evaluate(()=>window.production36.grooveSettings)).toEqual(changed.grooveSettings);
 await page.getByRole('button',{name:'打开逐句演唱',exact:true}).click();await page.locator('.mix-panel > summary').click();await page.getByLabel('人声混响',{exact:true}).fill('0');
 // Compare decoded PCM as well as length; browser DSP can differ by a quantization step across contexts.
 await page.evaluate(async()=>{const {renderAudio,wavBlob}=await import('/src/audio.ts'),{api}=await import('/src/api/client.ts');const p=JSON.parse(localStorage.getItem('songyu-mock-project-v1'));const raw=new Uint8Array(await wavBlob((await renderAudio(p)).buffer).arrayBuffer());let base64='';for(let i=0;i<raw.length;i+=8192)base64+=String.fromCharCode(...raw.subarray(i,i+8192));window.grooveWave=btoa(base64);const video=api.exportVideo;api.exportVideo=async(input,...args)=>{window.groovePvWave=input.wav;return video(input,...args)}});
 await projectSettings(page);await page.getByRole('button',{name:'导出作品',exact:true}).click();const wavDownload=page.waitForEvent('download');await page.getByRole('button',{name:'混音音频 · MOCK 测试音 WAV ↓',exact:true}).click();const wave=await wavDownload;const expected=Buffer.from(await page.evaluate(()=>window.grooveWave),'base64'),downloaded=await readFile(await wave.path());const difference=bytes=>{expect(bytes.length).toBe(expected.length);let max=0,total=0;for(let i=44;i<bytes.length;i+=2){const d=Math.abs(bytes.readInt16LE(i)-expected.readInt16LE(i));max=Math.max(max,d);total+=d}return {max,mean:total/((bytes.length-44)/2)}};const wavDifference=difference(downloaded);console.log({wavDifference});expect(wavDifference.max).toBeLessThanOrEqual(1);await page.keyboard.press('Escape');
 const videoDownload=page.waitForEvent('download');await page.getByRole('button',{name:'模拟导出 MP4',exact:true}).click();await videoDownload;const pvDifference=difference(Buffer.from(await page.evaluate(()=>window.groovePvWave),'base64'));console.log({pvDifference});expect(pvDifference.max).toBeLessThanOrEqual(1);
});

test('36 Synth band slider changes actual PCM and exported WAV/PV while keeping vocal controls guarded',async({page})=>{
 await page.getByRole('button',{name:'打开逐句演唱',exact:true}).click();const mix=page.locator('.mix-panel');await mix.locator('summary').click();await mix.getByLabel('启用混音处理',{exact:true}).check();
 await expect(mix.getByLabel('伴奏音量',{exact:true})).toBeEnabled();await expect(mix.getByLabel('人声音量',{exact:true})).toBeDisabled();await expect(mix.getByLabel('人声混响',{exact:true})).toBeDisabled();
 await mix.getByLabel('伴奏音量',{exact:true}).fill('0');const saved=await stored(page);expect(saved.mixSettings.bandGain).toBe(0);
 const metrics=await page.evaluate(async()=>{const {renderAudio}=await import('/src/audio.ts'),p=JSON.parse(localStorage.getItem('songyu-mock-project-v1'));const render=async(g,stem)=>{const next=structuredClone(p);next.mixSettings.bandGain=g;const b=(await renderAudio(next,{stem})).buffer;let sum=0;for(const x of b.getChannelData(0))sum+=x*x;return sum};return {zero:await render(0,'instrumental'),one:await render(1,'instrumental'),two:await render(2,'instrumental'),voice:await render(0,'vocal-processed')}});
 expect(metrics.zero).toBe(0);expect(metrics.one).toBeGreaterThan(0);expect(metrics.two).toBeGreaterThan(metrics.one);expect(metrics.voice).toBeGreaterThan(0);
 await page.reload();expect((await stored(page)).mixSettings).toEqual(saved.mixSettings);
 await page.evaluate(async()=>{const {api}=await import('/src/api/client.ts');const original=api.exportVideo;api.exportVideo=(input,...rest)=>{window.pv36=input;return original(input,...rest)}});
 const download=page.waitForEvent('download');await page.getByRole('button',{name:'模拟导出 MP4',exact:true}).click();await download;
 expect(await page.evaluate(()=>{const bytes=Uint8Array.from(atob(window.pv36.wav),c=>c.charCodeAt(0));return bytes.length>44})).toBe(true);
});

test('36 planning status and trace appear only when provided; planning failure preserves the project',async({page})=>{
 await productionScenario(page,'performance-success');await startMaking(page);await expect(page.getByRole('button',{name:'试听这首作品',exact:true})).toBeVisible({timeout:20000});
 await expect(page.getByLabel('演唱表现规划',{exact:true})).toContainText('已完成');await page.getByText('本次表现规划调用',{exact:true}).click();await expect(page.locator('.production-note')).toContainText('费用：未知');await expect(page.locator('.production-note')).toContainText('MOCK 测试数据');
 const before=await stored(page);await productionScenario(page,'performance-failure');await startMaking(page);await expect(page.locator('.production-note')).toContainText('不能通过单句重唱跳过规划',{timeout:15000});expect(await stored(page)).toEqual(before);await expect(page.getByRole('button',{name:'重试缺失的演唱',exact:true})).toHaveCount(0);
});

test('36 AI HTML PV uses isolated trusted preview, deterministic seek, saved design and HTML export',async({page})=>{
 await page.evaluate(async()=>{const {api}=await import('/src/api/client.ts');const design=api.pvDesign,video=api.exportVideo;window.pvRequests=[];api.pvDesign=p=>{window.pvRequests.push(p);return design(p)};api.exportVideo=(input,...rest)=>{window.pvExport=input;return video(input,...rest)}});
 const panel=await generatePv(page),p=await stored(page),frame=page.frameLocator('iframe[title="AI HTML PV 预览"]');
 expect(p.pvVisual.result.source).toBe('mock');expect(p.pvVisual.result.trace).toBeUndefined();expect(await page.evaluate(()=>window.pvRequests[0])).not.toHaveProperty('tracks');
 await expect(page.getByTitle('AI HTML PV 预览')).toHaveAttribute('sandbox','allow-scripts');
 const seek=Math.round(Math.min(p.lyrics[0].end-.1,p.lyrics[0].start+.2)*60/p.bpm*20)/20;
 await page.getByRole('slider',{name:'PV 进度',exact:true}).fill(String(seek));await expect(frame.locator('#stage')).toHaveAttribute('data-time',String(seek*1000));await expect(frame.getByText(p.lyrics[0].text,{exact:true})).toHaveCount(1);
 await expect(frame.locator('.credit')).toHaveCount(1);await expect(frame.locator('.brand')).toHaveCount(1);
 await page.getByRole('slider',{name:'PV 进度',exact:true}).fill('0');await expect(frame.locator('#stage')).toHaveAttribute('data-time','0');
 const download=page.waitForEvent('download');await page.getByRole('button',{name:'模拟导出 MP4',exact:true}).click();const file=await download;expect(file.suggestedFilename()).toMatch(/mock-export\.json$/);const receipt=JSON.parse(await readFile(await file.path(),'utf8'));expect(receipt.visualMode).toBe('html');
 const input=await page.evaluate(()=>window.pvExport);expect(input.visualMode).toBe('html');expect(input).not.toHaveProperty('scenes');expect(input.inputFingerprint).toBe(p.pvVisual.result.inputFingerprint);expect(input.wav.length).toBeGreaterThan(44);
 await page.reload();await page.locator('#navpv').click();await expect(page.getByTitle('AI HTML PV 预览')).toBeVisible();expect((await stored(page)).pvVisual).toEqual(p.pvVisual);
 // Canvas remains an explicit choice; no extra design call or model fallback.
 await pvPanel(page);await page.getByLabel('PV 画面模式',{exact:true}).selectOption('canvas');await expect(page.getByTitle('AI HTML PV 预览')).toHaveCount(0);await expect(page.locator('.mv-screen canvas')).toBeVisible();
});

test('36 lyric edits invalidate HTML design without discarding it, Canvas and regeneration remain available',async({page})=>{
 await generatePv(page);const before=await stored(page);
 await page.getByRole('button',{name:'打开逐句演唱',exact:true}).click();await page.getByLabel('第1句歌词',{exact:true}).fill('把今天写进一封信里');
 await pvPanel(page);await expect(page.locator('.pv-design-controls')).toContainText('视觉设计已失效');await expect(page.getByRole('button',{name:'模拟导出 MP4',exact:true})).toBeDisabled();expect((await stored(page)).pvVisual).toEqual(before.pvVisual);
 await page.getByRole('button',{name:'重新生成 AI 画面',exact:true}).click();await expect(page.getByTitle('AI HTML PV 预览')).toBeVisible();expect((await stored(page)).pvVisual.result.inputFingerprint).not.toBe(before.pvVisual.result.inputFingerprint);
});

test('36 failed, foreign and late visual responses preserve the current work and previous design',async({page})=>{
 const panel=await generatePv(page),before=await stored(page);
 await page.evaluate(async()=>{const {api}=await import('/src/api/client.ts'),{createMockPvRoutes}=await import('/src/api/mock-pv.ts');const route=createMockPvRoutes('invalid-fingerprint');window.originalPv=api.pvDesign;api.pvDesign=async project=>await(await route('/api/pv/design',{project})).json()});
 await panel.getByRole('button',{name:'重新生成 AI 画面',exact:true}).click();await expect(panel).toContainText('指纹不符');expect(await stored(page)).toEqual(before);
 await page.evaluate(async()=>{const {api}=await import('/src/api/client.ts');api.pvDesign=async project=>{const result=await window.originalPv(project);await new Promise(resolve=>window.releasePv=resolve);return result}});
 await panel.getByRole('button',{name:'重新生成 AI 画面',exact:true}).click();await expect.poll(()=>page.evaluate(()=>typeof window.releasePv)).toBe('function');await panel.getByRole('button',{name:'停止等待视觉设计',exact:true}).click();
 await page.evaluate(()=>window.releasePv());await expect(panel).toContainText('后台请求可能仍在运行');expect(await stored(page)).toEqual(before);
 await page.evaluate(async()=>{const {api}=await import('/src/api/client.ts');api.pvDesign=async()=>{throw Error('PV_NOT_CONFIGURED · 独立视觉模型未配置')}});await panel.getByRole('button',{name:'重新生成 AI 画面',exact:true}).click();await expect(panel).toContainText('独立视觉模型未配置');expect(await stored(page)).toEqual(before);
 await panel.getByLabel('PV 画面模式',{exact:true}).selectOption('canvas');await expect(page.locator('.mv-screen canvas')).toBeVisible();
});
