import {bundle} from '@remotion/bundler';
import {selectComposition,renderStill,openBrowser} from '@remotion/renderer';
const serveUrl=await bundle({entryPoint:'src/index.tsx'});const browser=await openBrowser('chrome');
const out='../../temp/mg-video';
for(const id of ['Preview','Alpha']){const composition=await selectComposition({serveUrl,id,puppeteerInstance:browser});for(const sec of id==='Preview'?[3,7.5,9,24.5,26.5,40,51,53,56.5,65,76,78.5,81.5,90,97,99,101]:[8,16,24,30,40,50,57,65,75,82,90,96,7.5]){await renderStill({serveUrl,composition,puppeteerInstance:browser,frame:sec*30,output:`${out}/${id==='Preview'?'frame':'alpha'}-${sec}.png`});console.log(id,sec)}}await browser.close({silent:true});
