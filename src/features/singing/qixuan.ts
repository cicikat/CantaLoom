import type {SongProject,VocalAsset} from '../../model';
import {assetVoice,currentVocalAsset,generateQixuan} from '../../external-audio';
import {singingDependency} from '../../singing';
import type {AvailableQixuan,QixuanStatus} from '../../../shared/contracts/index.mjs';

export function lineLocked(p:SongProject,id:string){const line=p.lyrics.find(l=>l.id===id);return !line||line.locked||p.tracks.some(t=>t.sectionId===line.sectionId&&t.kind==='vocal'&&t.locked)}
export function vocalReady(p:SongProject,id:string,voice?:QixuanStatus){try{return voice?.available&&currentVocalAsset(p,p.lyrics.find(l=>l.id===id)!).engineVersion===voice.engineVersion}catch{return false}}
// Pure transaction: latest project must still match the generated line and runner.
export function applyVocalResult(now:SongProject,id:string,asset:VocalAsset,projectId=now.id){
 const current=now.lyrics.find(l=>l.id===id);
 if(now.id!==projectId||!current||lineLocked(now,id)||singingDependency(now,current,assetVoice(asset))!==asset.dependency||(now.singingRunner||'CPU')!==asset.renderParameters?.runner)throw Error('生成期间工程、歌词、音符或锁定状态已变化；新结果没有覆盖工程');
 const next=structuredClone(now),old=next.vocalAssets?.[id];
 if(old&&old.audioUrl!==asset.audioUrl)next.vocalHistory={...next.vocalHistory,[id]:[old,...(next.vocalHistory?.[id]||[])].slice(0,3)};
 next.vocalAssets={...next.vocalAssets,[id]:asset};next.vocalMode='external';return next;
}
export async function generateLine(source:SongProject,id:string,voice:AvailableQixuan,force=false){
 if(lineLocked(source,id))throw Error('此句或人声音轨已锁定');
 return generateQixuan(source,source.lyrics.find(l=>l.id===id)!,voice,(source.vocalAssets?.[id]?.take||0)+(force?1:0));
}
