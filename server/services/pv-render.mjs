import {access,writeFile} from 'node:fs/promises';
export async function pvRenderStatus(){try{if(process.env.SONGYU_HTML_PV_DISABLED==='1')throw Error();const {chromium}=await import('@playwright/test');await access(chromium.executablePath());return {available:true,width:1280,height:720,fps:24,maxSeconds:35}}catch{return {available:false,width:1280,height:720,fps:24,maxSeconds:35,code:'PV_CHROMIUM_UNAVAILABLE'}}}

import {pvDocument} from '../../shared/pv-render.mjs';
import path from 'node:path';
export async function renderPvFrames(data,directory){
 if(!(await pvRenderStatus()).available)throw Object.assign(Error('Chromium unavailable'),{code:'PV_CHROMIUM_UNAVAILABLE'});
 const {chromium}=await import('@playwright/test'),started=performance.now();let browser;let peakRss=process.memoryUsage().rss;const watchdog=setTimeout(()=>{if(browser)void browser.close().catch(()=>{})},150000);
 try{try{browser=await chromium.launch({headless:true,chromiumSandbox:true,timeout:10000})}catch{throw Object.assign(Error('Chromium launch unavailable'),{code:'PV_CHROMIUM_UNAVAILABLE'})}const context=await browser.newContext({viewport:{width:1280,height:720},deviceScaleFactor:1,offline:true,serviceWorkers:'block',acceptDownloads:false,permissions:[]});await context.route('**/*',route=>route.abort());const page=await context.newPage();
 await page.setContent(pvDocument(data.pvProject,data.pvDesign,data.singingCredit),{waitUntil:'load'});await page.evaluate(()=>document.fonts.ready);
 const cdp=await context.newCDPSession(page);let frameBytes=0;const frames=Math.ceil(data.duration*24);for(let i=0;i<frames;i++){if(performance.now()-started>145000)throw Error('HTML render budget exceeded');await page.evaluate(t=>window.renderAt(t),i*1000/24);const capture=await cdp.send('Page.captureScreenshot',{format:'png',fromSurface:true,captureBeyondViewport:false,optimizeForSpeed:true});const png=Buffer.from(capture.data,'base64');frameBytes+=png.length;if(frameBytes>512*1024*1024)throw Error('HTML frame storage budget exceeded');await writeFile(path.join(directory,`frame${String(i).padStart(6,'0')}.png`),png);peakRss=Math.max(peakRss,process.memoryUsage().rss)}
 return {frames,frameBytes,fps:24,milliseconds:Math.round(performance.now()-started),nodePeakRssBytes:peakRss};
 }finally{clearTimeout(watchdog);await browser?.close()}
}
