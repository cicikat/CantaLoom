import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile} from 'node:fs/promises';
import {reuseStudio} from '../scripts/reuse-studio.mjs';

test('launcher reuses only the same compiled app and respects check/no-open',async()=>{
 const directory=await mkdtemp('D:/vibe-coding_/temp/songyu-launcher-');await mkdir(directory+'/dist/assets',{recursive:true});
 const html='<title>声屿 SONGYU</title><div id="root"></div><script src="/assets/index-fixture.js"></script>',js='// launcher identity fixture';
 await writeFile(directory+'/dist/index.html',html);await writeFile(directory+'/dist/assets/index-fixture.js',js);
 let mode='current',opened=0;
 const request=async input=>{
  const path=new URL(input).pathname;
  if(mode==='offline')throw Error('fixture unavailable');
  if(path==='/api/health')return Response.json(mode==='foreign'?{ok:true}:{llm:false,ffmpeg:false});
  if(path.endsWith('.js'))return new Response(mode==='wrong-js'?'other script':js);
  return new Response(mode==='old-build'?html.replace('index-fixture','index-old'):html);
 };
 const options={directory,port:3210,request,open:url=>{assert.equal(url,'http://127.0.0.1:3210/');opened++}};
 assert.equal(await reuseStudio(options),true);assert.equal(opened,1);
 assert.equal(await reuseStudio({...options,check:true}),true);assert.equal(await reuseStudio({...options,noOpen:true}),true);assert.equal(opened,1);
 for(mode of ['foreign','wrong-js','old-build','offline'])assert.equal(await reuseStudio(options),false);
 assert.equal(opened,1);
});
