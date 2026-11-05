import {createProject} from '../../composer';
import {validateProject,type SongProject} from '../../model';
import {download} from '../../visual';
import {api} from '../../api/client';
export const STORAGE=api.mock?'songyu-mock-project-v1':'songyu-project-v1';
export function initialProject(){try{const saved=localStorage.getItem(STORAGE);if(saved)return validateProject(JSON.parse(saved))}catch{/* Preserve invalid data until explicit save. */}return createProject()}
export function canAutoSave(){try{const raw=localStorage.getItem(STORAGE);return !raw||!!validateProject(JSON.parse(raw))}catch{return false}}
export async function readProject(file:File){if(file.size>5e6)throw Error('工程文件不能超过 5 MB');const p=validateProject(JSON.parse(await file.text()));if(!api.mock&&(p.planning?.mock||Object.values(p.vocalAssets||{}).some(a=>a.mock)||Object.values(p.vocalHistory||{}).flat().some(a=>a.mock)))throw Error('MOCK 测试工程请在 Mock 开发模式中打开');return p}
export function exportProject(p:SongProject){download(new Blob([JSON.stringify(p,null,2)],{type:'application/json'}),`${p.metadata.title}${api.mock?'.mock':''}.songyu.json`)}
