import {runProcess} from './instruments.mjs';

export const loudnessTarget={integratedLufs:-14,truePeakDbtp:-1.5,lra:11};
export const normalizationFilter='loudnorm=I=-14:TP=-1.5:LRA=11';

// FFmpeg reports silence as -inf. JSON uses null rather than inventing a level.
export async function measureLoudness(binary,file,cwd,timeout=120000){
 const output=await runProcess(binary,['-hide_banner','-nostats','-i',file,'-vn','-af','ebur128=peak=true','-f','null','-'],cwd,timeout);
 const summary=output.slice(output.lastIndexOf('Summary:'));
 const integrated=summary.match(/I:\s*(-?\d+(?:\.\d+)?|-inf)\s*LUFS/);
 const peak=summary.match(/Peak:\s*(-?\d+(?:\.\d+)?|-inf)\s*dBFS/);
 if(!integrated||!peak)throw Error('FFmpeg 未返回完整响度报告');
 const number=x=>Number.isFinite(Number(x))?Number(x):null;
 return {integratedLufs:number(integrated[1]),truePeakDbtp:number(peak[1])};
}
