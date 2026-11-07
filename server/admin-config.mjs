import {readFile,writeFile,mkdir,rename} from 'node:fs/promises';
import {randomBytes,createHash} from 'node:crypto';
import {spawn} from 'node:child_process';
import path from 'node:path';
import {z} from 'zod';
import {routesSchema} from './services/llm-router.mjs';
export const configFields=['LLM_BASE_URL','LLM_MODEL','LLM_ROUTES','FFMPEG_PATH','FLUIDSYNTH_PATH','SONGYU_SOUNDFONT','DIFFSINGER_PYTHON','DIFFSINGER_DICTIONARY','OPENUTAU_PATH'];
const value=z.string().max(2048).refine(v=>!/[\r\n\0]/.test(v));
export const settingsSchema=z.object(Object.fromEntries(configFields.map(k=>[k,value.optional()]))).extend({LLM_ROUTES:z.string().max(30000).optional(),LLM_API_KEY:value.optional(),clearKey:z.boolean().optional()}).strict().superRefine((v,ctx)=>{
 if(v.LLM_BASE_URL){try{const u=new URL(v.LLM_BASE_URL);if(!['https:','http:'].includes(u.protocol)||u.username||u.password||u.search||u.hash)throw Error();if(u.protocol==='http:'&&!['localhost','127.0.0.1','[::1]'].includes(u.hostname))throw Error()}catch{ctx.addIssue({code:'custom',path:['LLM_BASE_URL'],message:'URL 必须为 HTTPS（本机可用 HTTP），不能含密码、查询参数或片段'})}}
 if(v.clearKey&&v.LLM_API_KEY)ctx.addIssue({code:'custom',path:['clearKey'],message:'不能同时清除和设置密钥'});
 if(v.LLM_ROUTES){try{routesSchema.parse(JSON.parse(v.LLM_ROUTES))}catch{ctx.addIssue({code:'custom',path:['LLM_ROUTES'],message:'任务路由格式无效'})}}
});
// DPAPI binds the encrypted value to the current Windows account. Secrets use stdin,
// never command arguments; plaintext is never returned by the management API.
export function dpapi(input,decrypt=false){return new Promise((resolve,reject)=>{
 if(process.platform!=='win32')return reject(Error('此密钥存储需要 Windows DPAPI'));
 const prefix="[void][Reflection.Assembly]::LoadWithPartialName('System.Security');";
 const code=prefix+(decrypt?'$b=[Convert]::FromBase64String([Console]::In.ReadToEnd());$p=[Security.Cryptography.ProtectedData]::Unprotect($b,$null,[Security.Cryptography.DataProtectionScope]::CurrentUser);[Console]::Out.Write([Text.Encoding]::UTF8.GetString($p))':'$b=[Text.Encoding]::UTF8.GetBytes([Console]::In.ReadToEnd());$p=[Security.Cryptography.ProtectedData]::Protect($b,$null,[Security.Cryptography.DataProtectionScope]::CurrentUser);[Console]::Out.Write([Convert]::ToBase64String($p))');
 const child=spawn('powershell.exe',['-NoProfile','-NonInteractive','-Command',code],{windowsHide:true,stdio:['pipe','pipe','ignore']});let out='';const timer=setTimeout(()=>{child.kill();reject(Error('密钥加密服务超时'))},10000);child.stdout.on('data',b=>out+=b);child.on('error',()=>{clearTimeout(timer);reject(Error('密钥加密服务不可用'))});child.on('close',c=>{clearTimeout(timer);c===0?resolve(out.trim()):reject(Error('密钥无法解密，请用原 Windows 账户运行或重新配置'))});child.stdin.end(input);
})}
export async function createConfigStore({directory,env=process.env,protect=dpapi,unprotect=x=>dpapi(x,true)}={}){
 await mkdir(directory,{recursive:true});const file=path.join(directory,'settings.json');let saved={};let loadError=false;
 try{saved=JSON.parse(await readFile(file,'utf8'));settingsSchema.parse(saved.values||{});if(saved.secret)env.LLM_API_KEY=await unprotect(saved.secret);else if(saved.keyCleared)delete env.LLM_API_KEY;Object.assign(env,saved.values)}catch(e){if(e.code!=='ENOENT')loadError=true}
 let revision=0;let queue=Promise.resolve();
 const snapshot=()=>({values:Object.fromEntries(configFields.map(k=>[k,env[k]||''])),keyConfigured:!!env.LLM_API_KEY,keyMask:env.LLM_API_KEY?'••••••••（已配置）':'未配置',revision,loadError,storage:'Windows DPAPI · 当前 Windows 账户',path:file});
 return {snapshot,fingerprint:()=>createHash('sha256').update([env.LLM_BASE_URL,env.LLM_MODEL,env.LLM_API_KEY].join('|')).digest('hex'),
  update(raw){const operation=queue.then(async()=>{const input=settingsSchema.parse(raw);const values={...saved.values};for(const k of configFields)if(input[k]!==undefined)values[k]=input[k].trim();const next={values,secret:saved.secret,keyCleared:saved.keyCleared};if(input.LLM_API_KEY){next.secret=await protect(input.LLM_API_KEY);next.keyCleared=false}if(input.clearKey){delete next.secret;next.keyCleared=true}const temporary=file+'.'+randomBytes(6).toString('hex')+'.tmp';await writeFile(temporary,JSON.stringify(next,null,2),{mode:0o600});await rename(temporary,file);saved=next;Object.assign(env,values);if(input.LLM_API_KEY)env.LLM_API_KEY=input.LLM_API_KEY;if(input.clearKey)delete env.LLM_API_KEY;loadError=false;revision++;return snapshot()});queue=operation.catch(()=>{});return operation;}
 };
}
