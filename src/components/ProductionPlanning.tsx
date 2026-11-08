import type {ProductionJob} from '../../shared/contracts/production.mjs';
const labels={disabled:'未启用',running:'进行中',succeeded:'已完成',failed:'失败',skipped:'已跳过（无可规划句）'};
export function ProductionPlanning({job}:{job?:ProductionJob}){
 const planning=job?.performancePlanning,trace=planning?.status==='succeeded'?planning.trace:undefined;
 return <>{planning&&<p aria-label="演唱表现规划">演唱表现规划：{labels[planning.status]}{job?.mock?' · MOCK 夹具，未调用模型':''}</p>}
 {job?.errorCode==='PERFORMANCE_PLANNING_FAILED'&&<p role="alert">演唱表现规划失败，请重新制作；不能通过单句重唱跳过规划。</p>}
 {trace&&<details><summary>本次表现规划调用</summary><p>{job?.mock?'MOCK 测试数据 · ':''}{trace.provider} / {trace.model} · 尝试 {trace.attempts} 次 · {trace.milliseconds} 毫秒</p><p>输入 {trace.promptTokens} / 输出 {trace.completionTokens} Token · 费用：{trace.cost===null?'未知':`${trace.cost} ${trace.costCurrency??'（币种未知）'}`}</p></details>}</>;
}
