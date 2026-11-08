import {test,expect} from '@playwright/test';
import {projectSettings,tapRhythm} from './settings';

test('real creative workflow: taps, lock, regenerate, lyrics, persistence and audio',async({page},testInfo)=>{


 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('/');await expect(page.getByRole('heading',{name:/变成一首歌/})).toBeVisible();

 await tapRhythm(page);await expect(page.locator('.bpmbig')).not.toContainText('—');await page.getByRole('button',{name:/变成鼓点/}).click();
 await expect(page.getByRole('heading',{name:/你的音乐积木/})).toBeVisible();
 await page.getByRole('button',{name:'锁定鼓点',exact:true}).click();const before=await page.evaluate(()=>JSON.parse(localStorage.getItem('songyu-project-v1')!).tracks.filter((t:any)=>t.locked));
 await page.getByRole('button',{name:'重新生成吉他',exact:true}).click();const after=await page.evaluate(()=>JSON.parse(localStorage.getItem('songyu-project-v1')!).tracks.filter((t:any)=>t.locked));expect(after).toEqual(before);
 await page.getByRole('button',{name:'播放全曲',exact:true}).click();await expect(page.getByRole('button',{name:'暂停全曲',exact:true})).toBeVisible({timeout:20000});await expect.poll(async()=>Number(await page.getByRole('slider',{name:'播放进度'}).inputValue())).toBeGreaterThan(.8);await page.getByRole('button',{name:'暂停全曲',exact:true}).click();
 // Lyric stickers live on the workbench's side page, opened from the vocal card.
 await page.getByRole('button',{name:'打开逐句演唱',exact:true}).click();await page.getByRole('textbox',{name:'第2句歌词'}).fill('把今天的心跳写成歌');await page.reload();await page.getByRole('button',{name:'打开逐句演唱',exact:true}).click();await expect(page.getByRole('textbox',{name:'第2句歌词'})).toHaveValue('把今天的心跳写成歌');
 await page.getByRole('navigation').getByRole('button',{name:'PV ✦',exact:true}).click();await page.getByLabel('字幕样式',{exact:true}).selectOption('poster');
 await projectSettings(page);await page.getByRole('button',{name:'导出作品',exact:true}).click();const downloadEvent=page.waitForEvent('download');await page.getByRole('button',{name:/混音音频/}).click();const dl=await downloadEvent;await dl.saveAs(testInfo.outputPath('real-mix.wav'));expect(await dl.failure()).toBeNull();expect(errors).toEqual([]);
});
test('mobile layouts and navigation fit without horizontal overflow',async({page})=>{await page.setViewportSize({width:390,height:844});await page.goto('/');for(const label of ['创作','音乐积木','PV ✦']){await page.getByRole('navigation').getByRole('button',{name:label,exact:true}).click();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBeTruthy();}});
test('offline synthesis is audible and regeneration changes PCM; subtitle boundaries use beats',async({page})=>{await page.goto('/');const result=await page.evaluate(async()=>{
 // @ts-expect-error Vite serves browser TS modules directly.
 const {createProject,regenerate}=await import('/src/composer.ts');
 // @ts-expect-error browser module
 const {renderAudio}=await import('/src/audio.ts');
 // @ts-expect-error browser module
 const {activeLyric}=await import('/src/visual.ts');
 const p=createProject(),t=p.tracks.find((t:any)=>t.kind==='guitar');const first=await renderAudio(p,{trackId:t.id}),second=await renderAudio(regenerate(p,t.id),{trackId:t.id});const a=first.buffer.getChannelData(0),b=second.buffer.getChannelData(0);let energy=0,diff=0;for(let i=0;i<a.length;i++){energy+=a[i]*a[i];diff+=Math.abs(a[i]-b[i])}const l=p.lyrics[0],start=l.start*60/p.bpm,end=l.end*60/p.bpm;return {rms:Math.sqrt(energy/a.length),diff,at:activeLyric(p,start)?.id===l.id,before:activeLyric(p,start-.001)?.id!==l.id,after:activeLyric(p,end)?.id!==l.id};});expect(result.rms).toBeGreaterThan(.005);expect(result.diff).toBeGreaterThan(1);expect(result.at&&result.before&&result.after).toBeTruthy()});
test('FFmpeg exports a real playable MP4 from generated audio and four backgrounds',{tag:'@acceptance'},async({page},testInfo)=>{
 await page.goto('/');await page.getByRole('navigation').getByRole('button',{name:'PV ✦',exact:true}).click();const exportButton=page.getByRole('button',{name:'导出 MP4',exact:true});await expect(exportButton).toBeEnabled();const event=page.waitForEvent('download',{timeout:120000});await exportButton.click();const video=await event;await video.saveAs(testInfo.outputPath('songyu-demo.mp4'));expect(await video.failure()).toBeNull();await expect(page.getByRole('status').filter({hasText:'PV 导出完成'})).toBeVisible();
});
