import {test,expect,type Page} from '@playwright/test';
import {creationSettings} from './settings';


async function readinessFixture(page:Page,ready:()=>boolean){
 // Explicit capability fixtures; these tests never request inference or rendering.
 await page.route('**/api/health',route=>route.fulfill({json:{llm:ready(),ffmpeg:ready(),llmStatus:ready()?'unverified':'local'}}));
 await page.route('**/api/engines',route=>route.fulfill({json:{instruments:{installed:ready(),ready:ready(),soundfonts:ready()?['fixture.sf2']:[]},singing:'launch test fixture; no real engine'}}));
 await page.route('**/api/singing/qixuan',route=>route.fulfill({json:ready()?{available:true,id:'qixuan',version:'fixture',providerId:'openutau-diffsinger',label:'接口夹具，未运行引擎',engineVersion:'fixture-no-inference',parameters:{steps:20,depth:.6}}:{available:false,id:'qixuan',version:'fixture',message:'fixture: not installed'}}));
}

test('real page explains missing setup before production and keeps local creation usable',async({page})=>{
 await readinessFixture(page,()=>false);let calls=0;await page.route('**/api/production',route=>{calls++;return route.abort()});
 await page.goto('/');await creationSettings(page);const setup=page.getByLabel('制作前准备');await expect(setup).toContainText('AI 作曲服务尚未配置');await expect(setup).toContainText('中文演唱声库尚未准备好');
 await expect(setup.getByRole('link',{name:'打开本机设置'})).toHaveAttribute('href','http://127.0.0.1:3001/admin');
 await page.getByLabel('自由创作主题',{exact:true}).fill('现在还不能自动制作');await expect(page.getByRole('button',{name:'制作新作品',exact:true})).toBeDisabled();
 await page.locator('.patchlab-creation form').evaluate((form:HTMLFormElement)=>form.requestSubmit());expect(calls).toBe(0);
 await page.getByLabel('自由创作主题',{exact:true}).fill('孤独、安静，旋律下行');await creationSettings(page);await page.getByRole('button',{name:'本地搭建积木',exact:true}).click();
 await expect(page.locator('.workspace-meta')).toContainText('A 小调');expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('songyu-project-v1')!).planning.source)).toBe('local-rules');
 await page.screenshot({path:'temp/songyu-loop-launch-setup.png',fullPage:true});expect(calls).toBe(0);await creationSettings(page);await setup.getByRole('button',{name:'先玩音乐积木',exact:true}).click();await expect(page.getByRole('heading',{name:/你的音乐积木/})).toBeVisible();
});

test('rechecking configured capability fixtures enables production without claiming an LLM call succeeded',async({page})=>{
 let ready=false;await readinessFixture(page,()=>ready);await page.goto('/');await creationSettings(page);await expect(page.getByLabel('制作前准备')).toContainText('AI 作曲服务尚未配置');
 await page.getByLabel('自由创作主题',{exact:true}).fill('设置完成后制作');ready=true;await creationSettings(page);await page.getByRole('button',{name:'重新检查',exact:true}).click();
 await expect(page.getByRole('button',{name:'制作新作品',exact:true})).toBeEnabled();await expect(page.getByLabel('制作前准备')).toHaveCount(0);await expect(page.locator('.honesty')).toContainText('真实调用未验证');
});

test('unavailable services show a recoverable connection state while the current project stays intact',async({page})=>{
 await page.route('**/api/**',route=>new URL(route.request().url()).pathname.startsWith('/api/')?route.abort():route.continue());
 await page.goto('/');await creationSettings(page);await expect(page.getByLabel('制作前准备')).toContainText('无法连接本机创作服务');
 const before=await page.evaluate(()=>localStorage.getItem('songyu-project-v1'));await page.getByRole('button',{name:'重新检查',exact:true}).click();await expect(page.getByLabel('制作前准备')).toContainText('无法连接本机创作服务');expect(await page.evaluate(()=>localStorage.getItem('songyu-project-v1'))).toBe(before);
});

test('original sample links to the wired LOOP homepage',async({page})=>{
 await page.goto('/03_patchlab_playful.html');await expect(page).toHaveTitle(/原始静态样稿/);await expect(page.getByLabel('原始样稿说明')).toContainText('实际创作已接入正式首页');
});
