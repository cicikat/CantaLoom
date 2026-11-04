import type {SongProject,Style} from './model';
export interface IdeaAnalysis { mood:string; imagery:string[]; recommendedStyle:Style; source:'local-rules'|'llm' }
export interface IdeaAnalyzer {analyze(idea:string,style:Style):IdeaAnalysis}
export const ideaAnalyzer:IdeaAnalyzer={analyze(idea,style){const imagery=Array.from(new Set(idea.match(/海风|夏天|星星|月亮|月光|汽水|日落|单车|夜色|雨|云|星光/g)??[]));return {imagery:imagery.length?imagery:['海风','日落'],mood:style==='深夜漫游'?'安静 · 朦胧 · 夜行':style==='橘子摇滚'?'明亮 · 自由 · 跃动':'轻盈 · 明亮 · 有一点浪漫',recommendedStyle:style,source:'local-rules'}}};
export interface VisualPlanner {plan(project:SongProject):{imagery:string[];themes:number[];source:'procedural'}}
export const visualPlanner:VisualPlanner={plan(project){const text=project.lyrics.map(l=>l.text).join('');const imagery=ideaAnalyzer.analyze(text,project.style).imagery;const night=/星|月|夜/.test(text)&&project.style==='深夜漫游';return {imagery,themes:night?[1,3,2,3]:[0,1,2,3],source:'procedural'}}};
export interface PVRenderer {render(project:SongProject):Promise<Blob>}
// Browser Web Audio + Node FFmpeg implement the current pipeline. External providers
// can replace these typed contracts without changing project data or the timeline.
export const coordinator={ideaAnalyzer,visualPlanner};
