import {test,expect} from '@playwright/test';
import {creationSettings,projectSettings} from './settings';

const stored=(page:import('@playwright/test').Page)=>page.evaluate(()=>JSON.parse(localStorage.getItem('songyu-project-v1')!));

test('no API: inspiration changes audible PCM at the same seed, and six tracks remain playable',async({page})=>{


 await page.route('**/api/health',route=>route.fulfill({json:{llm:false,llmStatus:'local',ffmpeg:true}}));await page.goto('/');
 await page.getByRole('textbox',{name:'自由创作主题'}).fill('孤独、安静，旋律下行');await creationSettings(page);await page.getByRole('button',{name:'本地搭建积木'}).click();
 await expect(page.locator('.workspace-meta')).toContainText('A 小调');await projectSettings(page);await page.locator('.plan-details summary').click();await expect(page.locator('.plan-details')).toContainText('描述里有孤独');const lonely=await stored(page);
 await page.getByRole('textbox',{name:'自由创作主题'}).fill('明亮热血，副歌爆发，旋律上扬');await creationSettings(page);await page.getByRole('button',{name:'本地搭建积木'}).click();
 await expect(page.locator('.workspace-meta')).toContainText('C 大调');const bright=await stored(page);expect(bright.planning.source).toBe('local-rules');expect(bright.tracks).toHaveLength(24);
 const result=await page.evaluate(async({lonely,bright})=>{
  // @ts-expect-error browser imports
  const {localComposer}=await import('/src/composer.ts');
  // @ts-expect-error browser imports
  const {renderAudio}=await import('/src/audio.ts');
  // Reset IDs and versions to rule out a seed-only or version-only difference.
  const q=structuredClone(lonely);q.songPlan=bright.songPlan;
  q.tracks.forEach((t:any)=>{if(t.kind!=='vocal')t.notes=localComposer.generate(q,t)});
  const a=(await renderAudio(lonely)).buffer.getChannelData(0),b=(await renderAudio(q)).buffer.getChannelData(0);let diff=0,ea=0,eb=0;for(let i=0;i<a.length;i++){diff+=Math.abs(a[i]-b[i]);ea+=a[i]*a[i];eb+=b[i]*b[i]}return {diff,quietRms:Math.sqrt(ea/a.length),brightRms:Math.sqrt(eb/b.length)};
 },{lonely,bright});
 expect(result.diff).toBeGreaterThan(100);expect(result.quietRms).toBeGreaterThan(.005);expect(result.brightRms).toBeGreaterThan(.005);

 await page.getByRole('navigation').getByRole('button',{name:/音乐积木/}).click();await page.getByRole('button',{name:'播放全曲',exact:true}).click();await expect(page.getByRole('button',{name:'暂停全曲',exact:true})).toBeVisible({timeout:20000});
});

test('planning preserves a locked pitched section and reports the compatibility decision',async({page})=>{
 await page.route('**/api/health',route=>route.fulfill({json:{llm:false,llmStatus:'local',ffmpeg:true}}));
 await page.goto('/');await page.getByRole('navigation').getByRole('button',{name:/音乐积木/}).click();await page.getByRole('button',{name:'锁定吉他',exact:true}).click();const before=await stored(page),verse=before.sections[1].id;
 await page.getByRole('navigation').getByRole('button',{name:'创作',exact:true}).click();await page.getByRole('textbox',{name:'自由创作主题'}).fill('孤独安静的小调，旋律缓缓落下');await creationSettings(page);await page.getByRole('button',{name:'本地搭建积木'}).click();await projectSettings(page);await page.locator('.plan-details summary').click();await expect(page.locator('.compatibility-note')).toContainText('保留整段带音高轨道');
 const after=await stored(page);expect(after.tracks.filter((t:any)=>t.sectionId===verse&&t.kind!=='drums')).toEqual(before.tracks.filter((t:any)=>t.sectionId===verse&&t.kind!=='drums'));expect(after.songPlan.key).toEqual(before.songPlan.key);
});

test('LLM statuses and failures are honest; invalid response cannot overwrite saved work (API fixture)',async({page})=>{
 await page.route('**/api/health',route=>route.fulfill({json:{llm:true,llmStatus:'unverified',ffmpeg:true}}));
 let mode='valid';await page.route('**/api/plan',async route=>{
  const p=await stored(page);
  if(mode==='http')return route.fulfill({status:502,json:{error:'fixture failure'}});
  const plan=structuredClone(p.songPlan);plan.key.mode='minor';plan.key.tonic='A';if(mode==='invalid')plan.intensity=9;
  return route.fulfill({json:{title:'测试接口夹具',mood:'孤独',lyrics:['夹具第一句歌词','夹具第二句歌词','夹具第三句歌词','夹具第四句歌词'],songPlan:plan,source:'llm',model:'fixture-not-real-llm'}});
 });
 await page.goto('/');await projectSettings(page);await page.locator('.plan-details summary').click();await expect(page.locator('.honesty')).toContainText('真实调用未验证');await page.getByRole('button',{name:'生成积木方案'}).click();await expect(page.locator('.honesty')).toContainText('最近一次方案已校验');const valid=await stored(page);expect(valid.planning.source).toBe('llm');
 for(mode of ['invalid','http']){await page.getByRole('button',{name:'生成积木方案'}).click();await expect(page.getByRole('alert')).toContainText('当前工程完整保留');expect(await stored(page)).toEqual(valid);await expect(page.locator('.honesty')).toContainText('真实调用未验证');}
 await page.getByRole('button',{name:'使用本地规则生成',exact:true}).click();await expect(page.getByRole('alert')).toHaveCount(0);expect((await stored(page)).planning.source).toBe('local-rules');
 await page.setViewportSize({width:390,height:844});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();
});
