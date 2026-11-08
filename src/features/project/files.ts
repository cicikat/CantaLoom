import {createProject} from '../../composer';
import {validateProject,type SongProject} from '../../model';
import {download} from '../../visual';
import {api} from '../../api/client';
import {hasMockData} from '../../api/provenance';
export const STORAGE=api.mock?'songyu-mock-project-v1':'songyu-project-v1';
function acceptedProject(raw:unknown){if(!api.mock&&hasMockData(raw))throw Error('MOCK 测试工程请在 Mock 开发模式中打开');return validateProject(raw)}
export function initialProject(){try{const saved=localStorage.getItem(STORAGE);if(saved)return acceptedProject(JSON.parse(saved))}catch{/* Preserve invalid data until explicit save. */}return createProject()}
export function canAutoSave(){try{const raw=localStorage.getItem(STORAGE);return !raw||!!acceptedProject(JSON.parse(raw))}catch{return false}}
export async function readProject(file:File){if(file.size>5e6)throw Error('工程文件不能超过 5 MB');return acceptedProject(JSON.parse(await file.text()))}
export function exportProject(p:SongProject){download(new Blob([JSON.stringify(p,null,2)],{type:'application/json'}),`${p.metadata.title}${api.mock?'.mock':''}.cantaloom.json`)}
