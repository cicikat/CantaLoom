import {performedNotes} from './groove.mjs';
import {grooveSchema} from './contracts/groove.mjs';
// Standard MIDI File type 1, 480 ticks per quarter. All positions are absolute beats.
export const gmPrograms={drums:0,bass:33,guitar:24,keys:0,melody:80,vocal:53};
const u32=n=>[(n>>>24)&255,(n>>>16)&255,(n>>>8)&255,n&255];
const vlq=n=>{const b=[n&127];while((n>>>=7))b.unshift((n&127)|128);return b};
const chunk=(name,data)=>[...new TextEncoder().encode(name),...u32(data.length),...data];
export function midiFile({bpm,tracks,endBeat=0}){
 if(!Number.isFinite(bpm)||bpm<40||bpm>240||!Array.isArray(tracks)||tracks.length>40)throw Error('Invalid MIDI input');
 const tempo=Math.round(60000000/bpm);
 const chunks=[chunk('MTrk',[0,255,81,3,(tempo>>>16)&255,(tempo>>>8)&255,tempo&255,0,255,88,4,4,2,24,8,0,255,47,0])];
 let nextChannel=0;
 for(const track of tracks){
  const events=[];const lanes=[];
  const program=track.program??gmPrograms[track.kind];
  if(!Number.isInteger(program)||program<0||program>127)throw Error('Invalid GM program');
  // Separate simultaneous repetitions of the same pitch onto separate channels.
  if(track.groove)grooveSchema.parse(track.groove);
  for(const {note:n,start,end,velocity} of performedNotes(track,endBeat)){
   if(!Number.isFinite(n.beat)||n.beat<0||!Number.isFinite(n.duration)||n.duration<=0||!Number.isInteger(n.midi)||n.midi<0||n.midi>127||!Number.isFinite(n.velocity)||n.velocity<0||n.velocity>1)throw Error('Invalid MIDI note');
   const pitch=track.kind==='drums'?({kick:36,snare:38,hat:42}[n.sound]??n.midi):n.midi;
   let channel=9;
   if(track.kind!=='drums'){
    let lane=lanes.findIndex(l=>(l.get(pitch)??-1)<=start);
    if(lane<0){lane=lanes.length;lanes.push(new Map());if(lane>=15)throw Error('Too many overlapping repetitions');}
    lanes[lane].set(pitch,end);channel=lanes[lane].channel;
    if(channel===undefined){if(nextChannel===9)nextChannel++;if(nextChannel>15)throw Error('MIDI channel capacity exceeded; export individual tracks');channel=nextChannel++;lanes[lane].channel=channel;}
   }
   events.push({tick:start,order:1,data:[0x90|channel,pitch,Math.max(1,Math.round(velocity*127))]},{tick:end,order:0,data:[0x80|channel,pitch,0]});
  }
  const channels=track.kind==='drums'?[9]:lanes.map(l=>l.channel);
  const bytes=channels.flatMap(c=>[0,0xc0|c,program]);let cursor=0;
  for(const e of events.sort((a,b)=>a.tick-b.tick||a.order-b.order)){bytes.push(...vlq(e.tick-cursor),...e.data);cursor=e.tick;}
  bytes.push(...vlq(Math.max(cursor,Math.round(endBeat*480))-cursor),255,47,0);chunks.push(chunk('MTrk',bytes));
 }
 return new Uint8Array([...chunk('MThd',[0,1,0,chunks.length,1,224]),...chunks.flat()]);
}
