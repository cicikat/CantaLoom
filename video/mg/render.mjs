import {bundle} from '@remotion/bundler';
import {selectComposition,renderMedia,renderStill} from '@remotion/renderer';
import fs from 'node:fs';
import path from 'node:path';
const out=path.resolve('../../temp/mg-video');fs.mkdirSync(out,{recursive:true});
const serveUrl=await bundle({entryPoint:path.resolve('src/index.tsx')});
const mode=process.argv[2]||'all';
const render=async(id,alpha)=>{const composition=await selectComposition({serveUrl,id});console.log('Rendering',id);await renderMedia({serveUrl,composition,codec:alpha?'prores':'h264',proResProfile:alpha?'4444':undefined,pixelFormat:alpha?'yuva444p10le':'yuv420p',imageFormat:alpha?'png':'jpeg',outputLocation:path.join(out,id==='Preview'?'cantaloom-mg-preview.mp4':id==='Alpha'?'cantaloom-mg-alpha.mov':`${id}.mov`),concurrency:4,crf:alpha?undefined:18,onProgress:({progress})=>{let n=Math.floor(progress*100);if(n%10===0&&n!==render.last){console.log(id,n+'%');render.last=n}}});};
if(mode==='stills'){for(const sec of [0,1,3,6,7.5,9,24.5,26.5,29.5,40,51,53,56.5,65,76,78.5,81.5,90,97,99,101]){const composition=await selectComposition({serveUrl,id:'Preview'});await renderStill({serveUrl,composition,frame:Math.floor(sec*30),output:path.join(out,`frame-${sec}.png`)});}const composition=await selectComposition({serveUrl,id:'Alpha'});for(const sec of [8,16,24,30,40,50,57,65,75,82,90,96,7.5])await renderStill({serveUrl,composition,frame:sec*30,output:path.join(out,`alpha-${sec}.png`)});}
else if(mode==='all'){await render('Preview',false);await render('Alpha',true);for(const id of ['opening','ingredients','singing','showcase','ending'])await render(id,true)}
else await render(mode,mode!=='Preview');
