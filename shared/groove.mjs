// Pure, portable deterministic generator. No Date, Math.random or engine state.
export function grooveRandom(value){
 let seed=2166136261;
 for(const c of JSON.stringify(value))seed=Math.imul(seed^c.charCodeAt(0),16777619)>>>0;
 return ()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296};
}

export function performedNotes(track,endBeat=0){
 const g=track.groove;
 const protectedTrack=track.locked||track.manuallyEdited||track.notes.some(n=>n.locked);
 const active=g&&!protectedTrack&&track.kind!=='vocal';
 const random=grooveRandom([g?.projectId,g?.trackId,g?.version,g?.swingTicks??0,g?.timingTicks??0,g?.velocityAmount??0]);
 return track.notes.map(n=>{
  let start=Math.round(n.beat*480),end=Math.max(start+1,Math.round((n.beat+n.duration)*480)),velocity=n.velocity;
  if(active){
   const swing=start%480===240?(g.swingTicks??0):0;
   const timing=track.kind==='drums'?0:Math.round((random()*2-1)*(g.timingTicks??0));
   const offset=swing+timing,limit=endBeat>0?Math.round(endBeat*480):Infinity;
   start=Math.max(0,Math.min(limit-1,start+offset));
   end=Math.max(start+1,Math.min(limit,end+offset));
   if(track.kind!=='drums')velocity=Math.max(0,Math.min(1,velocity+(random()*2-1)*(g.velocityAmount??0)));
  }
  return {note:n,start,end,velocity};
 }).sort((a,b)=>a.start-b.start||a.note.beat-b.note.beat);
}
