import {test,expect} from '@playwright/test';
import {pvDesign} from '../support/pv-fixture.mjs';
import {pvFingerprint} from '../../shared/contracts/pv.mjs';

test('HTTP fixture: official page projects public PV input, previews HTML and keeps design on export resource failure',async({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'});
 // Explicit HTTP fixtures; no model, singer or encoder runs in this test.
 await page.route('**/api/health',route=>route.fulfill({json:{llm:false,llmStatus:'local',ffmpeg:true}}));
 let project,exported;const downloads=[];page.on('download',d=>downloads.push(d));
 await page.route('**/api/pv/design',async route=>{project=route.request().postDataJSON().project;await route.fulfill({json:{source:'llm',inputFingerprint:await pvFingerprint(project),pvDesign:pvDesign(project)}})});
 await page.route('**/api/export',async route=>{exported=route.request().postDataJSON();await route.fulfill({status:503,json:{code:'PV_CHROMIUM_UNAVAILABLE',error:'HTTP fixture: HTML 视频组件不可用'}})});
 await page.goto('/');await page.locator('#navpv').click();await page.locator('.pv-design-controls > summary').click();await page.getByRole('button',{name:'生成 AI 画面',exact:true}).click();
 await expect(page.getByTitle('AI HTML PV 预览')).toBeVisible();expect(project).not.toHaveProperty('tracks');expect(project).not.toHaveProperty('vocalAssets');
 const before=await page.evaluate(()=>JSON.parse(localStorage.getItem('songyu-project-v1')));expect(before.pvVisual.result.source).toBe('llm');
 await page.getByRole('button',{name:'导出 MP4',exact:true}).click();await expect(page.locator('.toast')).toContainText('HTML 视频组件不可用');expect(exported.visualMode).toBe('html');expect(exported).not.toHaveProperty('scenes');expect(exported.inputFingerprint).toBe(before.pvVisual.result.inputFingerprint);expect(downloads).toHaveLength(0);
 expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('songyu-project-v1')))).toEqual(before);
 await page.reload();await page.locator('#navpv').click();await expect(page.getByTitle('AI HTML PV 预览')).toBeVisible();
});
