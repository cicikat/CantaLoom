// Whole-bar allocation keeps the existing MIDI/Canvas/export section invariants.
export function freeTimeline(input,plan,id){
 const bpm=input.bpm??plan.bpm,total=Math.max(Math.ceil(20*bpm/240),Math.min(Math.floor(30*bpm/240),Math.round((input.targetSeconds??25)*bpm/240)))*4;
 if(plan.lyrics.length!==plan.phraseWeights.length)throw Error('乐句权重数量不匹配');
 if(input.lyrics&&JSON.stringify(input.lyrics)!==JSON.stringify(plan.lyrics))throw Error('手写歌词被改写');
 const split=Math.ceil(plan.lyrics.length/2),weights=plan.phraseWeights,verseWeight=weights.slice(0,split).reduce((a,b)=>a+b,0),sum=weights.reduce((a,b)=>a+b,0);
 const verse=Math.max(4,total-72,Math.min(64,total-12,Math.round((total-8)*verseWeight/sum/4)*4));
 const sizes=[4,verse,total-8-verse,4];let cursor=0;
 const sections=sizes.map((beats,i)=>{const s={id:id(),name:['Intro','Verse','Chorus','Outro'][i],start:cursor,beats};cursor+=beats;return s});
 const phrases=plan.lyrics.map((text,i)=>{const group=i<split?0:1,from=group?split:0,to=group?weights.length:split,section=sections[group+1],groupSum=weights.slice(from,to).reduce((a,b)=>a+b,0),prior=weights.slice(from,i).reduce((a,b)=>a+b,0);return {id:id(),text,start:section.start+Math.round(prior/groupSum*section.beats*4)/4,end:i===to-1?section.start+section.beats:section.start+Math.round((prior+weights[i])/groupSum*section.beats*4)/4,notes:[],locked:false}});
 if(phrases.some(p=>p.end-p.start<1))throw Error('歌词过密，请减少乐句或增加目标时长');
 return {bpm,sections,phrases};
}
