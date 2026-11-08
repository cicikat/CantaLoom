import {test,expect} from '@playwright/test';
import {pvDocument} from '../../shared/pv-render.mjs';
import {pvProject,pvDesign} from '../support/pv-fixture.mjs';
test('trusted HTML PV seeks deterministically, changes dynamically, binds real lyrics once and respects boundaries',async({page})=>{
 const p=pvProject(),d=pvDesign(p);const {shape,type,...base}=d.scenes[0].layers[0];d.scenes[0].layers.push({...base,id:'seek-particles',type:'particles',seed:17,count:24,motion:'fall'});await page.setViewportSize({width:1280,height:720});await page.setContent(pvDocument(p,d));await page.evaluate(()=>document.fonts.ready);
 await page.evaluate(()=>window.renderAt(1250));const first=await page.screenshot();
 for(let t=0;t<=1250;t+=50)await page.evaluate(t=>window.renderAt(t),t);expect(await page.screenshot()).toEqual(first);
 await page.evaluate(()=>window.renderAt(2500));expect(await page.screenshot()).not.toEqual(first);
 await page.evaluate(()=>window.renderAt(5000));await expect(page.locator('#stage')).toHaveAttribute('data-section',p.sections[1].id);await expect(page.getByText(p.lyrics[1].text,{exact:true})).toHaveCount(1);await expect(page.getByText(p.lyrics[0].text,{exact:true})).toHaveCount(0);
 await page.evaluate(()=>window.renderAt(1250));expect(await page.screenshot()).toEqual(first);await expect(page.locator('.brand')).toHaveCount(1);await expect(page.locator('.credit')).toHaveCount(1);
});
test('PV user text cannot close scripts, create DOM, fetch URLs or execute code in an opaque sandbox',async({page})=>{
 const p=pvProject();p.title='</script><script>window.hacked=1</script>';p.lyrics[0].text='<img src="https://evil.invalid/x" onerror="window.hacked=1">';const html=pvDocument(p,pvDesign(p));expect(html).not.toContain('</script><script>window.hacked');
 const requests=[];page.on('request',r=>requests.push(r.url()));await page.setContent('<iframe sandbox="allow-scripts" style="width:1280px;height:720px"></iframe>');await page.locator('iframe').evaluate((node,html)=>node.srcdoc=html,html);
 const frame=page.frameLocator('iframe');await expect(frame.getByText(p.lyrics[0].text,{exact:true})).toBeVisible();await expect(frame.locator('img')).toHaveCount(0);
 expect(await page.locator('iframe').evaluate(node=>{try{return !!node.contentWindow.document}catch{return false}})).toBe(false);
 await page.locator('iframe').evaluate(node=>node.contentWindow.postMessage({type:'cantaloom-pv-seek',timeMs:5000},'*'));await expect(frame.getByText(p.lyrics[1].text,{exact:true})).toBeVisible();expect(await frame.locator('#stage').evaluate(async()=>{try{await fetch('https://evil.invalid/network');return true}catch{return false}})).toBe(false);expect(requests).toEqual([]);
});
