import {lyricNotes,syncVocal} from '../composer';
import {setLyricText} from '../melody';
import {record,validateProject,type SongProject} from '../model';

// Publish only after every changed line has passed its protection checks.
export function editStudioLyrics(p:SongProject,edits:{id:string;text:string}[]){
 const changed=edits.filter(edit=>p.lyrics.find(l=>l.id===edit.id)?.text!==edit.text);
 if(!changed.length)return p;
 for(const edit of changed){
  const line=p.lyrics.find(l=>l.id===edit.id);
  if(!line)throw Error('这句歌词已不存在，原作品已保留。');
  if(edit.text.includes('\n')||edit.text.includes('\r')||edit.text.length>(p.mode==='free'?100:40))throw Error(`每句歌词最多 ${p.mode==='free'?100:40} 字，原作品已保留。`);
  if(line.locked||p.tracks.some(t=>t.sectionId===line.sectionId&&t.kind==='vocal'&&t.locked))throw Error('改动的歌词或人声音轨已锁定，请先解锁；原作品已保留。');
  if(p.mode!=='free'&&line.notes.some(n=>n.locked))throw Error('这句含锁定音符，请先解锁；原作品已保留。');
 }
 let next=structuredClone(p);
 for(const {id,text} of changed){
  if(p.mode==='free'){
   next=setLyricText(next,id,text,{keepMelody:true});
   const line=next.lyrics.find(l=>l.id===id)!,phrase=next.melodyDraft?.phrases.find(l=>l.id===id);
   if(!phrase)throw Error('旋律草稿不完整，原作品已保留。');
   phrase.text=line.text;phrase.notes=line.notes.map(n=>({...n,syllable:n.syllable||''}));
  }else{
   const line=next.lyrics.find(l=>l.id===id)!;
   line.text=text;line.source='manual';line.version++;
   line.notes=lyricNotes(line,next.vocalPreset,line.version,next);syncVocal(next,line.sectionId);
  }
 }
 return validateProject(record(next,'同步修改的歌词到当前作品'));
}

export function syncStudioLyrics(p:SongProject,text:string){
 const lines=text.split(/\r?\n/).filter(line=>line.trim());
 if(lines.length!==p.lyrics.length)throw Error(`当前作品有 ${p.lyrics.length} 句，请按一句一行填写；增减句数请用「一键开工」制作新作品。原作品已保留。`);
 return editStudioLyrics(p,p.lyrics.map((line,i)=>({id:line.id,text:lines[i]})));
}
