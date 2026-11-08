import {test} from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {mkdir,writeFile,rm} from 'node:fs/promises';
import {temporaryDirectory} from './support/temp.mjs';
import {isStudioProcess,restartExistingStudio,listenerProcess,stopListener} from '../scripts/restart-studio.mjs';

const directory=process.cwd(),externalRoot=path.resolve('temp/resources');
const info={pid:987654,executable:process.execPath,command:`"${process.execPath}" "${path.join(directory,'server/index.mjs')}"`,created:'fixture'};
const state={csrf:'fixture',runtime:{projectRoot:directory,pid:info.pid,root:externalRoot},jobs:[],capabilities:{singing:'fixture'}};
test('restart refuses foreign, mismatched, watch and legacy-unverified services without stopping anything',async()=>{
 assert.equal(isStudioProcess(info,state,{directory,externalRoot}),true);
 const legacy={...state,runtime:{root:externalRoot}};
 assert.equal(isStudioProcess({...info,command:'node server/index.mjs'},legacy,{directory,externalRoot}),true);
 for(const [processInfo,response] of [
  [info,{}],[info,{...state,runtime:{...state.runtime,projectRoot:directory+'-other'}}],
  [info,{...state,runtime:{...state.runtime,pid:info.pid+1}}],
  [{...info,command:'node other-server.mjs'},state],
  [{...info,command:'node --watch server/index.mjs'},state],
  [{...info,executable:'other.exe'},state],
  [info,{...legacy,runtime:{root:externalRoot+'-other'}}],
 ]){
  let stopped=false;
  await assert.rejects(restartExistingStudio({port:3211,directory,externalRoot,platform:'win32',inspect:async()=>processInfo,request:async()=>Response.json(response),stop:async()=>{stopped=true}}),/not a verified/);
  assert.equal(stopped,false);
 }
 let reads=0,stopped=0;
 assert.equal(await restartExistingStudio({port:3211,directory,externalRoot,platform:'win32',inspect:async()=>++reads===1?info:null,request:async()=>Response.json(state),stop:async()=>{stopped++}}),true);
 assert.equal(stopped,1);
 assert.equal(await restartExistingStudio({port:3211,directory,externalRoot,platform:'win32',inspect:async()=>null}),false);
});

test('Windows restart stops only the verified listener and rejects a changed process identity',{skip:process.platform!=='win32',timeout:60000},async()=>{
 const root=await temporaryDirectory('restart-listener-');await mkdir(path.join(root,'server'));
 const file=path.join(root,'server/index.mjs');
 await writeFile(file,`import http from 'node:http';const state={csrf:'test-only',runtime:{projectRoot:${JSON.stringify(root)},pid:process.pid}};const server=http.createServer((req,res)=>{res.setHeader('Content-Type','application/json');res.end(JSON.stringify(state))});server.listen(0,'127.0.0.1',()=>console.log(server.address().port));`);
 const child=spawn(process.execPath,[file],{windowsHide:true,stdio:['ignore','pipe','pipe']});
 const ended=once(child,'exit');
 try{
  const port=Number((await once(child.stdout,'data'))[0].toString().trim());
  const snapshot=await listenerProcess(port);assert.equal(snapshot.pid,child.pid);
  await assert.rejects(stopListener(port,{...snapshot,created:'wrong-process-generation'}));
  assert.equal(child.exitCode,null);
  assert.equal(await restartExistingStudio({port,directory:root,externalRoot}),true);
  await ended;assert.equal(await listenerProcess(port),null);
 }finally{if(child.exitCode===null&&child.signalCode===null){child.kill();await ended}await rm(root,{recursive:true,force:true})}
});
