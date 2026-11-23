import {createHash} from 'node:crypto';
import {existsSync, readdirSync, readFileSync, statSync} from 'node:fs';
import path from 'node:path';

function fingerprint(files, extra = []) {
 const hash = createHash('sha256');
 hash.update(JSON.stringify(extra));
 function visit(file) {
  hash.update(JSON.stringify(file));
  if (!existsSync(file)) return;
  if (statSync(file).isDirectory()) {
   for (const name of readdirSync(file).sort()) visit(path.join(file, name));
  } else {
   hash.update(createHash('sha256').update(readFileSync(file)).digest());
  }
 }
 for (const file of files) visit(file);
 return hash.digest('hex');
}

export function frontendFingerprint() {
 const viteEnv = Object.entries(process.env).filter(([name]) => name.startsWith('VITE_')).sort();
 return fingerprint(['src', 'shared', 'public', 'index.html', 'vite.config.ts', 'tsconfig.json',
  'package.json', 'package-lock.json', 'node_modules/.package-lock.json',
  '.env', '.env.local', '.env.production', '.env.production.local'],
  [process.version, process.env.NODE_ENV, viteEnv]);
}

export function outputFingerprint() {
 return fingerprint(['dist']);
}
