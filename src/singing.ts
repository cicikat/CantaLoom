import {notePerformance,performanceCurves,resolvePerformance} from '../shared/performance.mjs';
import {pinyin} from 'pinyin-pro';
import type {Lyric,SongProject} from './model';
export interface SingingVoice {id:string;version:string;providerId:'openutau-exchange'|'diffsinger'|'openutau-diffsinger';label:string;engineVersion?:string;renderParameters?:{runner:'CPU'|'DirectML';steps:number;depth:number}}
// IDs, timestamps and sibling lines are deliberately excluded from the dependency key.
export function singingDependency(p:SongProject,l:Lyric,voice:SingingVoice){return JSON.stringify({bpm:p.bpm,start:l.start,end:l.end,text:l.text,notes:l.notes.map(n=>[n.beat,n.duration,n.midi,n.syllable]),...(l.performance?{performance:resolvePerformance(l.performance)}:{}),voice:{id:voice.id,version:voice.version,providerId:voice.providerId,...(voice.engineVersion?{engineVersion:voice.engineVersion}:{}),...(voice.renderParameters?{renderParameters:voice.renderParameters}:{})}});}
export function alignedNotes(l:Lyric){
 const chars=Array.from(l.text).filter(c=>/[\p{L}\p{N}]/u.test(c));let index=0;
 const notes=[...l.notes].sort((a,b)=>a.beat-b.beat).map(n=>{
  const syllable=n.syllable==='+'?'+':chars[index++];if(!syllable)throw Error('歌词与音符不匹配：请为延音音符设置 syllable="+"，或补全歌词音符');return {...n,syllable};
 });
 if(index!==chars.length)throw Error('歌词字数超过音符数，请先重新生成旋律');
 for(let i=0;i<notes.length;i++)if(notes[i].beat<(notes[i-1]?.beat+notes[i-1]?.duration||l.start)-.00001||notes[i].syllable==='+'&&(!i||notes[i].beat>notes[i-1].beat+notes[i-1].duration+.001))throw Error('人声不支持重叠音符或跨休止延音');
 return notes;
}
export function openUtauProject(p:SongProject,lines=p.lyrics,voice?:{singer:string;phonemizer:string;renderer:string}){if(!voice&&Object.values(p.vocalAssets||{}).some(a=>a.voiceId==='qixuan'))voice={singer:'Qixuan_v2.7.0_DiffSinger_OpenUtau',phonemizer:'OpenUtau.Core.DiffSinger.DiffSingerChinesePhonemizer',renderer:'DIFFSINGER'};return {
 name:p.metadata.title,comment:`SONGYU ${p.id} · ${p.metadata.updatedAt}`,ustx_version:'0.6',resolution:480,
 tempos:[{position:0,bpm:p.bpm}],time_signatures:[{bar_position:0,beat_per_bar:4,beat_unit:4}],
 tracks:[{track_name:'SONGYU vocal',singer:voice?.singer??'',phonemizer:voice?.phonemizer??'OpenUtau.Plugin.Builtin.ChineseCVVPhonemizer',renderer_settings:{renderer:voice?.renderer??'CLASSIC'}}],
 voice_parts:lines.map(l=>({name:p.sections.find(s=>s.id===l.sectionId)?.name??l.id,comment:l.text,track_no:0,position:Math.round(l.start*480),duration:Math.round((l.end-l.start)*480),notes:alignedNotes(l).map((n,i)=>({position:Math.round((n.beat-l.start)*480),duration:Math.round(n.duration*480),tone:n.midi,lyric:n.syllable,pitch:{data:[{x:-40,y:0,shape:"io"},{x:40,y:0,shape:"io"}],snap_first:true},vibrato:{length:0,period:175,depth:25,in:10,out:10,shift:0,drift:0},phoneme_expressions:[],phoneme_overrides:[],...(l.performance?notePerformance(alignedNotes(l),i,p.bpm,l.performance):{})})),curves:l.performance?performanceCurves(l.notes,l.start,l.end,l.performance,p.bpm):[]})),wave_parts:[]
};}
export function diffSingerInput(p:SongProject,l:Lyric,dictionary:Record<string,string>){
 const notes=alignedNotes(l),words:string[]=[],phones:string[]=[],counts:number[]=[],pitches:string[]=[],durations:number[]=[],slurs:number[]=[];
 let cursor=l.start;
 const addRest=(beats:number)=>{if(beats<.00001)return;words.push('SP');phones.push('SP');counts.push(1);pitches.push('rest');durations.push(beats*60/p.bpm);slurs.push(0)};
 for(const n of notes){addRest(n.beat-cursor);const slur=n.syllable==='+';
  if(!slur){const py=pinyin(n.syllable,{toneType:'none',type:'array'})[0].replaceAll('ü','v');const ph=dictionary[py];if(!ph)throw Error(`声库词典缺少 ${n.syllable} (${py})`);const parts=ph.split(/\s+/);words.push(n.syllable);phones.push(...parts);counts.push(parts.length)}
  pitches.push(['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'][n.midi%12]+(Math.floor(n.midi/12)-1));durations.push(n.duration*60/p.bpm);slurs.push(slur?1:0);cursor=n.beat+n.duration;
 }addRest(l.end-cursor);
 return [{offset:l.start*60/p.bpm,text:words.join(' '),ph_seq:phones.join(' '),ph_num:counts.join(' '),note_seq:pitches.join(' '),note_dur:durations.map(n=>n.toFixed(6)).join(' '),note_slur:slurs.join(' ')}];
}
