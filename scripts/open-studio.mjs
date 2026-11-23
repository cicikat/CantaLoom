import {createServer} from 'node:http';
import {spawn} from 'node:child_process';
import {randomUUID} from 'node:crypto';

// Let Windows start the browser while the studio boots. The first navigation
// stays pending until the normal page, asset and health checks have passed.
export async function openWhenReady(target) {
 const route = '/' + randomUUID();
 let finish;
 const result = new Promise(resolve => { finish = resolve; });
 const server = createServer(async (req, res) => {
  if (req.url !== route) { res.writeHead(404).end(); return; }
  if (await result) res.writeHead(302, {Location: target, 'Cache-Control': 'no-store'}).end();
  else res.writeHead(503, {'Content-Type':'text/plain; charset=utf-8'}).end('CantaLoom 启动失败，请查看启动窗口。');
  server.close();
 });
 await new Promise((resolve, reject) => {
  server.once('error', reject);
  server.listen(0, '127.0.0.1', resolve);
 });
 server.unref();
 const entry = 'http://127.0.0.1:' + server.address().port + route;
 const browser = spawn('rundll32.exe', ['url.dll,FileProtocolHandler', entry], {stdio:'ignore', windowsHide:true});
 browser.once('error', () => console.log('Open this address in your browser: ' + target));
 return success => {
  finish(success);
  // The OS may decline a browser launch or open the URL after readiness.
  if (!success) server.close();
  else setTimeout(() => server.close(), 30000).unref();
 };
}
