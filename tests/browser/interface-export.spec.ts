import {test,expect} from '@playwright/test';

test('interface export shows actual response-header values with HTTP fixtures and distinguishes a missing report',async({page})=>{
 await page.route('**/api/health',route=>route.fulfill({json:{ffmpeg:true,llm:false,llmStatus:'local'}}));
 let withReport=true;
 await page.route('**/api/export',route=>route.fulfill({status:200,headers:{'Content-Type':'video/mp4',...(withReport?{'X-Songyu-Loudness':JSON.stringify({input:{integratedLufs:null,truePeakDbtp:null},output:{integratedLufs:-13.6,truePeakDbtp:-1.4},target:{integratedLufs:-14,truePeakDbtp:-1.5,lra:11}})}:{})},body:'HTTP export fixture, not a playable MP4'}));
 await page.goto('/');const button=page.getByRole('button',{name:'导出 MP4',exact:true});await expect(button).toBeEnabled();
 for(const measured of [true,false]){withReport=measured;const download=page.waitForEvent('download');await button.click();await download;const report=page.locator('.chapter-mv .export-report');if(measured){await expect(report).toContainText('-13.6 LUFS');await expect(report).toContainText('-1.4 dBTP');await expect(report).toContainText('无有限测量值')}else await expect(report).toContainText('服务未提供响度报告')}
});

test('interface export downloads a real MP4 and shows the encoded AAC measurements',async({page,request})=>{
 const health=await (await request.get('/api/health')).json();test.skip(!health.ffmpeg,'本机 FFmpeg 不可用，未验证真实 MP4');
 await page.goto('/');await page.getByRole('navigation').getByRole('button',{name:'PV ✦',exact:true}).click();const button=page.getByRole('button',{name:'导出 MP4',exact:true});await expect(button).toBeEnabled();const event=page.waitForEvent('download',{timeout:120000});await button.click();const file=await event;expect(await file.failure()).toBeNull();
 const chunks:Buffer[]=[];for await(const part of (await file.createReadStream())!)chunks.push(Buffer.from(part));const bytes=Buffer.concat(chunks);expect(bytes.subarray(4,8).toString()).toBe('ftyp');expect(bytes.length).toBeGreaterThan(10000);
 const report=page.locator('.chapter-mv .export-report');await expect(report).toContainText('成片 AAC 实测');await expect(report).toContainText('LUFS');await expect(report).toContainText('dBTP');await expect(report).toContainText('以成片实测为准');
});
