import {renderAudio,wavBlob} from '../../audio';
import {drawPV,download,blobBase64} from '../../visual';
import {beatsToSeconds,duration,type SongProject} from '../../model';
import {api} from '../../api/client';
export async function exportWavFile(p:SongProject){const {buffer}=await renderAudio(p);download(wavBlob(buffer),`${p.metadata.title}${api.mock?'.mock':''}.wav`)}
export async function exportPVFile(p:SongProject){
 const {buffer}=await renderAudio(p),canvas=document.createElement('canvas');canvas.width=1280;canvas.height=720;
 const scenes=p.sections.map(s=>{drawPV(canvas,p,beatsToSeconds(p,s.start),true,p.visualScenes.find(v=>v.sectionId===s.id)?.theme??0);return {png:canvas.toDataURL('image/png').split(',')[1],duration:beatsToSeconds(p,s.beats)}});
 const blob=await api.exportVideo({wav:await blobBase64(wavBlob(buffer)),scenes,lyrics:p.lyrics.map(l=>({text:l.text,start:beatsToSeconds(p,l.start),end:beatsToSeconds(p,l.end)})),style:p.subtitleStyle,title:p.metadata.title,duration:duration(p),singingCredit:p.vocalMode==='external'?(p.lyrics.every(l=>p.vocalAssets?.[l.id]?.voiceId==='qixuan')?'qixuan':'external'):'demo'});
 download(blob,`${p.metadata.title}${api.mock?'.mock-export.json':'.mp4'}`);
}
