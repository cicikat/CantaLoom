import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import path from 'node:path';
import {setTimeout as delay} from 'node:timers/promises';

const execute=promisify(execFile);
async function powershell(script){
 const encoded=Buffer.from("$ErrorActionPreference='Stop'; [Console]::OutputEncoding=[Text.UTF8Encoding]::new($false); "+script,'utf16le').toString('base64');
 const {stdout}=await execute('powershell.exe',['-NoProfile','-NonInteractive','-EncodedCommand',encoded],{windowsHide:true,timeout:15000,maxBuffer:1024*1024});
 return stdout.trim()?JSON.parse(stdout):null;
}
export async function listenerProcess(port){
 if(!Number.isInteger(port)||port<1||port>65535)throw Error('Invalid restart port');
 return powershell(`$owners=@(Get-NetTCPConnection -LocalPort ${port} -State Listen -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique); if($owners.Count -eq 0){return}; if($owners.Count -ne 1){throw 'Ambiguous listener'}; $p=Get-CimInstance Win32_Process -Filter ('ProcessId='+$owners[0]); if(!$p){throw 'Listener disappeared'}; @{pid=[int]$p.ProcessId;command=$p.CommandLine;executable=$p.ExecutablePath;created=$p.CreationDate.ToUniversalTime().ToString('o')} | ConvertTo-Json -Compress`);
}
export async function stopListener(port,processInfo){
 const encoded=Buffer.from(JSON.stringify(processInfo)).toString('base64');
 await powershell(`$expected=[Text.Encoding]::UTF8.GetString([Convert]::FromBase64String('${encoded}')) | ConvertFrom-Json; $p=Get-CimInstance Win32_Process -Filter ('ProcessId='+$expected.pid); $owners=@(Get-NetTCPConnection -LocalPort ${port} -State Listen -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique); if(!$p -or $owners.Count -ne 1 -or $owners[0] -ne $expected.pid -or $p.CommandLine -cne $expected.command -or $p.CreationDate.ToUniversalTime().ToString('o') -ne $expected.created){throw 'Listener changed; refusing to stop it'}; Stop-Process -Id $expected.pid -ErrorAction Stop`);
}
const samePath=(a,b)=>typeof a==='string'&&path.resolve(a).toLowerCase()===path.resolve(b).toLowerCase();
export function isStudioProcess(info,state,{directory,externalRoot}){
 if(!info||!Number.isInteger(info.pid)||info.pid<=0||info.pid===process.pid||!samePath(info.executable,process.execPath)||typeof info.command!=='string'||typeof state?.csrf!=='string')return false;
 // Current servers identify their repository and PID. The pre-restart launcher used
 // a relative server entry; accept that legacy form only with its matching local admin resource root.
 if(state.runtime?.projectRoot!==undefined||state.runtime?.pid!==undefined){
  if(!samePath(state.runtime.projectRoot,directory)||state.runtime.pid!==info.pid)return false;
 }else if(!samePath(state.runtime?.root,externalRoot)||!state.capabilities?.singing||!Array.isArray(state.jobs))return false;
 const command=info.command.replaceAll('\\','/');
 const absolute=path.resolve(directory,'server/index.mjs').replaceAll('\\','/');
 const entry=command.match(/(?:^|\s)(?:"([^"]*server\/index\.mjs)"|([^\s"]*server\/index\.mjs))(?=\s|$)/i);
 return !!entry&&!/\s--watch(?:\s|=|$)/i.test(command)&&((entry[1]||entry[2]).toLowerCase()===absolute.toLowerCase()||(entry[1]||entry[2])==='server/index.mjs');
}
export async function restartExistingStudio({port,directory,externalRoot,request=fetch,inspect=listenerProcess,stop=stopListener,wait=delay,platform=process.platform}){
 if(platform!=='win32')throw Error('Automatic service restart is supported on Windows only.');
 const info=await inspect(port);
 if(!info)return false;
 let state;
 try{const response=await request(`http://127.0.0.1:${port}/api/admin/state`,{signal:AbortSignal.timeout(2500)});if(response.ok)state=await response.json()}catch{}
 if(!isStudioProcess(info,state,{directory,externalRoot}))throw Error(`Port ${port} is not a verified CantaLoom service. No process was stopped.`);
 await stop(port,info);
 for(let i=0;i<40;i++){if(!await inspect(port))return true;await wait(250)}
 throw Error(`The old service did not release port ${port}. Restart cancelled.`);
}
