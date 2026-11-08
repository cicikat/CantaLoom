import type {usePv} from '../hooks/usePv';
import type {SongProject} from '../model';
import {api} from '../api/client';
export function PvDesignControls({pv,project,disabled}:{pv:ReturnType<typeof usePv>;project:SongProject;disabled:boolean}){
 return <details className="pv-design-controls"><summary>AI 视觉导演（可选）</summary><p>点击才会请求独立视觉模型；默认 Canvas。{api.mock?'当前为 MOCK 设计夹具，未调用模型。':'设计可能产生模型调用费用。'}</p>
 <div className="expression-actions"><button className="minibtn" disabled={disabled||pv.pending} onClick={()=>void pv.generate()}>{pv.pending?'设计中…':project.pvVisual?'重新生成 AI 画面':'生成 AI 画面'}</button>{pv.pending&&<button className="text-button" onClick={pv.cancel}>停止等待视觉设计</button>}
 <label>画面模式 <select aria-label="PV 画面模式" value={project.pvVisualMode??'canvas'} disabled={disabled||pv.pending} onChange={e=>pv.select(e.target.value as 'canvas'|'html')}><option value="canvas">Canvas 程序画面</option><option value="html" disabled={!pv.current}>AI HTML 画面</option></select></label></div>
 <p role="status">{pv.message}</p>{pv.checking&&<p>正在核对视觉设计…</p>}{pv.error&&<p role="alert">{pv.error}</p>}<p>{pv.resource}</p>
 </details>;
}
