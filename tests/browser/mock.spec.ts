import {test,expect} from '@playwright/test';

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
