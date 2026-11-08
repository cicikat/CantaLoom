import {mkdir,mkdtemp} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const root=fileURLToPath(new URL('../../temp/unit/',import.meta.url));
export async function temporaryDirectory(prefix){await mkdir(root,{recursive:true});return mkdtemp(path.join(root,prefix))}
