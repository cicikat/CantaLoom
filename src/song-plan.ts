import {songPlanSchema,type SongPlan} from '../shared/song-plan.mjs';
import type {Style,SongProject} from './model';

export function localSongPlan(idea:string,style:Style):SongPlan {
 const lonely=/孤独|寂寞|悲伤|失落|伤心|思念|忧郁|难过|lonely|sad/i.test(idea);
 const gentle=/安静|温柔|平静|舒缓|轻柔|稀疏|摇篮|calm|gentle/i.test(idea);
 const energetic=/热血|激烈|冲刺|奔跑|跳舞|密集|爆发|摇滚|兴奋|energetic|exciting/i.test(idea);
 const hopeful=/希望|明亮|快乐|阳光|开心|欢快|向上|happy|hope/i.test(idea);
 const minor=lonely||!hopeful&&style==='深夜漫游';
 const intense=energetic||!gentle&&!lonely&&style==='橘子摇滚';
 const intensity=intense?.9:gentle||lonely?.28:.6;
 const contour:SongPlan['melodyContour']=/下行|下降|落下|渐低/.test(idea)?'falling':/上行|上扬|攀升|向上/.test(idea)?'rising':/起伏|先升后降/.test(idea)?'arch':minor?'falling':intense||hopeful?'rising':'arch';
 return songPlanSchema.parse({
  key:{tonic:minor?'A':'C',mode:minor?'minor':'major'},emotion:lonely?'melancholic':intense?'driving':gentle?'calm':'bright',intensity,
  chordProgression:minor?[1,6,3,7]:hopeful?[1,4,5,1]:[1,6,4,5],
  drumDensity:gentle||lonely?'sparse':intense?'busy':'steady',melodyContour:contour,melodyRange:gentle||lonely?'narrow':intense?'wide':'medium',
  sectionEnergy:{intro:.3,verse:Math.max(.3,intensity*.75),chorus:/副歌.*(收敛|安静|轻柔)/.test(idea)?.35:Math.min(1,intensity+.15),outro:.25},
  reasons:[
   {decision:'key',reason:lonely?'描述里有孤独或思念，选择偏内省的小调。':minor?'沿用夜间风格的小调，让声音更沉静。':'选择明亮的大调，回应轻快或向前的感觉。'},
   {decision:'drums',reason:gentle||lonely?'描述偏安静，鼓点留出更多空隙。':intense?'描述充满力量，用更密的鼓点推动歌曲。':'使用适中的鼓点，让旋律保持轻盈。'},
   {decision:'melody',reason:contour==='rising'?'旋律逐步往上走，像心情慢慢打开。':contour==='falling'?'旋律轻轻落下，保留倾诉感。':contour==='arch'?'旋律先抬头再回落，像海浪一样起伏。':'旋律在附近音高徘徊，保持平静。'},
   {decision:'energy',reason:/副歌.*(收敛|安静|轻柔)/.test(idea)?'副歌主动收敛，呼应你想要的安静。':'副歌比主歌更有力量，结尾慢慢收住。'},
  ],
 });
}

// Read legacy harmonic context without changing its saved audible notes.
export function effectivePlan(p:SongProject):SongPlan {
 if(p.songPlan)return songPlanSchema.parse(p.songPlan);
 const plan=localSongPlan('',p.style);
 plan.key={tonic:p.style==='深夜漫游'?'A':'C',mode:p.style==='深夜漫游'?'minor':'major'};
 plan.chordProgression=p.style==='深夜漫游'?[1,6,3,7]:[1,6,4,5];return plan;
}
export const keyLabel=(plan:SongPlan)=>`${plan.key.tonic} ${plan.key.mode==='minor'?'小调':'大调'}`;
export function planIntent(plan:SongPlan){
 const verse=plan.sectionEnergy.verse,chorus=plan.sectionEnergy.chorus;
 const denser=verse<.4&&chorus>=.4||verse<.5&&chorus>=.5;
 const ending=plan.sectionEnergy.outro<chorus?'结尾慢慢收住':'结尾保留能量';
 const descriptions={
  key:`${plan.key.mode==='minor'?'内省的小调':'明亮的大调'}，${plan.intensity<.4?'情绪轻放':plan.intensity>.75?'情绪更强烈':'保持适中的情绪'}`,
  harmony:plan.chordProgression[3]===1?'和弦绕一圈，回到安心的起点':new Set(plan.chordProgression).size>1?'每个小节换一种和弦颜色':'稳定的和弦，托住你的旋律',
  drums:{sparse:'鼓点少一些，让声音有呼吸',steady:'鼓点稳稳向前',busy:'更密的鼓点，带着音乐往前跑'}[plan.drumDensity],
  melody:{rising:'旋律一步步上扬',falling:'旋律轻轻落下',arch:'旋律先升起，再回落',level:'旋律在相近音高轻轻徘徊'}[plan.melodyContour],
  energy:chorus>verse?`${denser?'副歌提高力度与节奏密度':'副歌提高力度'}，${ending}`:`副歌保持克制，${ending}`,
 };
 return Object.entries(descriptions).map(([decision,summary])=>({decision,summary,reason:plan.reasons.find(r=>r.decision===decision)?.reason}));
}
