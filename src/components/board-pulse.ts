import type {Note} from '../model';

// The board folds each bar into sixteen cells; only notes in the current bar pulse.
export function boardPulse(notes:Note[],step:number,start:number,beat:number){
 return notes.reduce((pulse,n)=>{
  if(Math.floor(((n.beat-start)%4)*4+.00001)!==step)return pulse;
  const age=beat-n.beat;
  if(age<0||age>=.55)return pulse;
  const envelope=age<.06?age/.06:Math.pow(1-(age-.06)/.49,2);
  return Math.max(pulse,envelope*(2+5*n.velocity));
 },0);
}
