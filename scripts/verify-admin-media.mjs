import {chromium,expect} from '@playwright/test';
import {readFile,mkdir} from 'node:fs/promises';
import path from 'node:path';
const directory=path.resolve(process.env.ADMIN_MEDIA_INPUT||path.join(process.env.SONGYU_EXTERNAL_ROOT||path.resolve('../external'),'runtime/exports/admin-pipeline-20261107'));
const output=path.join(directory,'media-regression');await mkdir(output,{recursive:true});
const mp4=await readFile(path.join(directory,'pipeline.mp4')),wav=await readFile(path.join(directory,'pipeline.wav'));
const browser=await chromium.launch();const page=await browser.newPage({viewport:{width:1100,height:1000},reducedMotion:'reduce'});const errors=[];page.on('pageerror',e=>errors.push(e.message));
try{
 // Replay prior real media only; this fixture does not run or claim new composition.
 await page.route('**/admin-assets/admin-pipeline.js',route=>route.fulfill({contentType:'application/javascript',body:`export async function runPipeline(ui){await ui.onMedia('mix',await (await fetch('/regression.wav')).blob());await ui.onMedia('pv',await (await fetch('/regression.mp4')).blob());ui.onComplete()}`}));
 await page.route('**/regression.wav',route=>route.fulfill({contentType:'audio/wav',body:wav}));await page.route('**/regression.mp4',route=>route.fulfill({contentType:'video/mp4',body:mp4}));
 await page.goto('http://127.0.0.1:3001/admin#test');await expect(page.locator('#notice')).toContainText('本地服务已连接');await page.locator('#run-pipeline').click();await expect(page.locator('#test-result')).toHaveText('整条链路通过',{timeout:120000});
 await expect(page.locator('#test-mix-output audio')).toBeVisible();await expect(page.locator('#test-pv-output video')).toBeVisible();await expect(page.locator('#test-pv-output a')).toHaveAttribute('download','cantaloom-test.mp4');
 const decoded=await page.locator('#test-pv-output video').evaluate(async v=>{v.muted=true;await v.play();await new Promise(r=>setTimeout(r,1200));v.pause();const canvas=document.createElement('canvas');canvas.width=64;canvas.height=36;const c=canvas.getContext('2d');c.drawImage(v,0,0,64,36);const data=c.getImageData(0,0,64,36).data;const colors=new Set();for(let i=0;i<data.length;i+=4)colors.add(`${data[i]},${data[i+1]},${data[i+2]}`);return {width:v.videoWidth,height:v.videoHeight,frames:v.getVideoPlaybackQuality().totalVideoFrames,colors:colors.size,time:v.currentTime}});
 if(decoded.width!==960||decoded.frames<1||decoded.colors<10||decoded.time===0)throw Error('Video frames not decoded: '+JSON.stringify(decoded));
 await page.locator('#test-pv-output').scrollIntoViewIfNeeded();await page.screenshot({path:path.join(output,'inline-pv.png')});
 await page.setViewportSize({width:390,height:600});await page.locator('#nav-toggle').click();const scrollbar=await page.locator('#sidebar').evaluate(s=>({width:getComputedStyle(s).scrollbarWidth,overflow:getComputedStyle(s).overflowY}));if(scrollbar.width!=='none'||scrollbar.overflow!=='auto')throw Error('Sidebar scrolling regression');await page.screenshot({path:path.join(output,'hidden-scrollbar.png')});
 if(errors.length)throw Error(errors.join('; '));console.log(JSON.stringify({decoded,scrollbar,result:'Inline playback and MP4 download controls passed; preview converted by real FFmpeg'},null,2));
}finally{await browser.close()}
