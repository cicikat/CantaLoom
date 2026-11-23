import net from 'node:net';
import {createHash, createHmac} from 'node:crypto';
import {userInfo} from 'node:os';

// Only the launcher holding the child process handle can perform a fast restart.
function pipeName(root, port) {
 const id = createHash('sha256').update(JSON.stringify([userInfo().username, root.toLowerCase(), port])).digest('hex');
 return '\\\\.\\pipe\\cantaloom-launch-' + id;
}

function restartProof(csrf) {
 return createHmac('sha256', csrf).update('cantaloom-launcher-restart').digest('hex');
}

export async function superviseStudio(root, port, child, ended, stop) {
 if (process.platform !== 'win32') return;
 let token;
 try {
  const response = await fetch('http://127.0.0.1:' + port + '/api/admin/state', {signal: AbortSignal.timeout(800)});
  const state = await response.json();
  if (state.runtime?.pid !== child.pid || !state.csrf) return;
  token = restartProof(state.csrf);
 } catch { return; }
 const pipe = net.createServer(socket => {
  socket.on('error', () => {});
  socket.setTimeout(1500, () => socket.destroy());
  let request = '';
  socket.setEncoding('utf8');
  socket.on('data', chunk => {
   request += chunk;
   if (request.length > 256) return socket.destroy();
   if (!request.endsWith('\n')) return;
   if (request !== child.pid + ' ' + token + '\n' || child.exitCode !== null || child.signalCode !== null) return socket.end('changed');
   stop();
   ended.then(() => socket.end('stopped'));
  });
 });
 // A simultaneous launch or an unavailable pipe can use the full identity check.
 pipe.on('error', () => {});
 pipe.listen(pipeName(root, port));
 ended.then(() => pipe.close());
}

export async function stopSupervisedStudio(root, port) {
 if (process.platform !== 'win32') return false;
 try {
  const response = await fetch('http://127.0.0.1:' + port + '/api/admin/state', {signal: AbortSignal.timeout(800)});
  if (!response.ok) return false;
  const {runtime, csrf} = await response.json();
  if (runtime?.projectRoot?.toLowerCase() !== root.toLowerCase() || !Number.isInteger(runtime.pid)) return false;
  return await new Promise(resolve => {
   const socket = net.connect(pipeName(root, port));
   let reply = '';
   socket.setTimeout(1500, () => socket.destroy());
   socket.once('connect', () => socket.write(runtime.pid + ' ' + restartProof(csrf) + '\n'));
   socket.on('data', chunk => { reply += chunk; });
   socket.on('error', () => {});
   socket.once('close', () => resolve(reply === 'stopped'));
  });
 } catch { return false; }
}
