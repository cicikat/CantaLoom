# v0.3.2 红茶 → 小由

开始时基于 v0.3.1 后端分支 `799229c`；交付前核实 PR #2 已合并（main `10c1574`），本轮分支 `feature/backend-auto-performance-mix`。不自动合并 main，不修改小由的组件、hooks、CSS、Mock 或 E2E 源码。

## 一次制作与真实状态

1. `api.startProduction({intent,lyrics?,bpm?,targetSeconds?})` → 202 job id。
2. 用 `api.production(id)` 轮询真实 state/stage：checking、planning、melody、instruments、singing、ready-for-mix。没有百分比。
3. 只有 state=succeeded 且 stage=ready-for-mix 时，`validateProject(job.project)` 后再原子应用。该阶段表示乐谱/伴奏缓存/歌声就绪，**不是** MP4 已导出。浏览器仍调用统一 renderAudio 和现有导出用例。
4. singing 失败时显示 error、phraseId、completedPhrases。`api.retryProduction(jobId,phraseId)` 只重试缺失句，不重新调用 LLM，不清空兄弟音频。尚未完成的其他句可逐句重试。

制作队列为本机内存中最多30个任务，不是持久化调度器；重启后404，前端须保留当前已保存工程。规划失败的任务没有完整工程，需要重新发起创作；当前不支持跨进程恢复规划中间态。已完成伴奏和歌声由既有内容缓存复用。生产任务纳入后台 jobs 来源，运行中禁止后台改配置，保留 Host/Origin/CSRF/DPAPI 限制。

## Auto / Manual

Performance 可选 mode=auto/manual、energy、locked、overrides。旧 JSON 无新字段仍可读。Auto 分析音符时长、间隔、跳进、重复音、乐句位置、歌词标点和 SongPlan 能量；不是随机修改 MIDI。

- `autoTuneProject(project,lineId?)`：全曲或单句自动调教，保留音符与歌词，跳过锁定句/轨/表达。
- `setPhrasePerformance`：手动字段优先，记录最多3版历史。
- `restorePerformance`：恢复上一版；表达锁定后禁止自动覆盖。
- overrides 用当前句的音符 index 指定参数；UI 调整音符顺序后须核对这些索引，不要把旧索引悄悄套到另一音符。
- 每次仅改变表达后只重唱该句，沿用现有 generateQixuan / applyVocalResult；不得重生成歌词/旋律。缓存含歌词、音符、表达解析版本与渲染修订。
- `performancePlan(project)` 可导出实际逐音符规划和 DYN 曲线。此为确定性分析结果；工程持久化的是每句 Performance 与人工 overrides/history。

使用真实支持的 USTX Pitch x=毫秒、y=十分之一半音、phoneme offset=按BPM换算的tick；大跳不强制连滑、长音延迟进入小颤音、休止后不提前辅音。没有伪造 breath/ENE 属性，未暴露未验证参数。

## 分轨与混音

`renderAudio(project,{stem:'vocal-dry'|'vocal-processed'|'instrumental'|'mix'})`，同一渲染入口服务于试听、WAV、PV。

- vocal-dry：当前歌声按时间轴拼接、无增益/EQ/压缩/混响；缓存中的原始44100Hz单句 WAV 不修改。浏览器导出为24000Hz立体声时间轴，不是原始文件的逐字节拷贝。
- vocal-processed：人声低切、自适应高频收敛/压缩、轻房间混响。
- instrumental：伴奏平衡与声像。
- mix：相同处理后的全曲结果。

自由工程默认启用处理；`mixSettings={enabled,vocalGain?:0..2,bandGain?:0..2,reverb?:0..0.25}`。旧工程默认保留原混音行为；显式 enabled 控制。输入 RMS/峰值/高频差分决定部分处理参数，reverb 是克制默认，可调不是所有歌唯一效果。EQ为基础处理，不宣称专业动态去齿音或响度母带。

本轮保留原始声库输出，不改模型与桥接器程序集。生产内录音质检查包括长度、非静音、峰值/削波；客观指标不能代表人耳音质验收。

## 主题不等于歌词

新提示词明确把 intent 当作音乐/情绪/动态要求，不直接照抄成标题或首句。不要求工整时允许散文歌、不等长句与自然标点，短歌建议总字数而不是每句固定字数。手写歌词仍原样保留。

## 待小由接入 / 验收

新 API 和模式需补 Mock，现有 Mock 未定义路由会404，不会偷连真实模型。UI 自动调教开关、混音控件、分轨试听与正式自由入口仍由小由完成。本轮真实后端制作 + 浏览器加载工程试听/导出**不是**新正式网页从输入到作品的验收；该项和人工听感评分待双方集成，不能用旧完成工程补位。
