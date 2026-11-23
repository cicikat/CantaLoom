import {test} from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {once} from 'node:events';
import {copyFile,mkdir,writeFile,rm,readFile} from 'node:fs/promises';
import {temporaryDirectory} from './support/temp.mjs';
import {isStudioProcess,restartExistingStudio,listenerProcess,stopListener} from '../scripts/restart-studio.mjs';

const directory=process.cwd(),externalRoot=path.resolve('temp/resources');
const info={pid:987654,executable:process.execPath,command:`"${process.execPath}" "${path.join(directory,'server/index.mjs')}"`,created:'fixture'};
const state={csrf:'fixture',runtime:{projectRoot:directory,pid:info.pid,root:externalRoot},jobs:[],capabilities:{singing:'fixture'}};
test('Windows shortcuts select setup on first use and forward options on repeat launches',{skip:process.platform!=='win32'},async()=>{
 const sandbox=await temporaryDirectory('launch-windows-');
 const root=path.join(sandbox,'studio with spaces'),scripts=path.join(root,'scripts');
 try {
  await mkdir(scripts,{recursive:true});
  for(const filename of ['打开织声机.bat','打开管理面板.bat','scripts/launch-windows.ps1']){
   await writeFile(path.join(root,filename),await readFile(new URL('../'+filename,import.meta.url)));
  }
  await writeFile(path.join(scripts,'install-local.ps1'),"param([switch]$Restart,[switch]$Admin,[switch]$Check,[switch]$NoOpen)\nWrite-Output \"setup $Restart $Admin $Check $NoOpen\"\nexit 7");
  await writeFile(path.join(scripts,'start-local.mjs'),"console.log('started',...process.argv.slice(2));process.exitCode=7;");
  const env={...process.env};delete env.SONGYU_EXTERNAL_ROOT;
  async function run(filename,expected){
   await assert.rejects(promisify(execFile)(process.env.ComSpec||'cmd.exe',['/d','/s','/c',`"call "${path.join(root,filename)}" --check --no-open"`],{cwd:sandbox,env,windowsHide:true,windowsVerbatimArguments:true}),error=>{
    assert.equal(error.code,7,error.stderr);assert.match(error.stdout,expected);return true;
   });
  }
  await run('打开织声机.bat',/setup True False True True/);
  await run('打开管理面板.bat',/setup True True True True/);
  await mkdir(path.join(root,'node_modules'));
  await writeFile(path.join(root,'node_modules/.package-lock.json'),'{}');
  await run('打开织声机.bat',/started --restart --check --no-open/);
  await run('打开管理面板.bat',/started --restart --admin --check --no-open/);
  const name='node-v22.12.0-win-x64';
  const tools=path.join(sandbox,'CantaLoom-resources','tools',name);
  await mkdir(path.join(tools,name),{recursive:true});
  await writeFile(path.join(tools,'.cantaloom-installed'),'fixture');
  await copyFile(process.execPath,path.join(tools,name,'node.exe'));
  await writeFile(path.join(tools,name,'npm.cmd'),'@exit /b 0');
  await writeFile(path.join(scripts,'start-local.mjs'),"console.log('portable',process.execPath,process.env.SONGYU_EXTERNAL_ROOT);process.exitCode=7;");
  await run('打开织声机.bat',/portable .*CantaLoom-resources.*node\.exe .*CantaLoom-resources/);
 } finally {await rm(sandbox,{recursive:true,force:true})}
});
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
