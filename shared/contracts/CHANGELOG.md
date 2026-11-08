# 公共契约变更

## 工单 35 · AI HTML PV（2026-11-08，限定范围已确认）

- Owner Blacktea；本会话明确确认 shared PV 快照/设计/响应、纯 HTML 时间轴、独立 pv_design 与后台任务配置、既有 export HTML 分支。未授权修改 SongProject/Client/Mock/React/Hook/CSS，后续接入 Owner Toge。
- v1 快照含 id/title/idea/mood/bpm、四段 beat 时间轴/energy、歌词原文/beat 起止及可为空的节奏 pulses；严格边界，SHA-256 指纹由规范化快照产生并随响应/导出校验，不等同鉴权。
- 设计为 1280×720 四段场景树：渐变、shape(circle/rect/triangle)、particles(fall/orbit)、text(title/current_lyric)，限定坐标/色值/种子/数量与归一化关键帧。段落 ID 精确匹配，每段一处歌词源；不收模型 HTML/JS/CSS/URL/外部素材。可信 renderAt 仅依赖快照、设计、显式毫秒和种子。
- POST /api/pv/design 显式调用独立已配置 pv_design，不回退其他模型或本地模板；成功 source=llm、inputFingerprint、pvDesign 和白名单 trace，错误码/HTTP 400/429/503/502。无 trace 不伪造调用；真实/夹具边界记日志。
- 原 export PNG 请求不变；HTML 判别分支 visualMode=html、pvProject、pvDesign、inputFingerprint，沿用已混音 WAV/title/lyrics/duration/singingCredit，数据须与快照匹配。旧 Client 不在此阶段接新分支；Chromium 可选，缺失 HTML 503，旧 Canvas 仍工作。
- Admin state/llm 不公开 systemPrompt，表单省略该字段时保留存量 prompt，显式空串清除；未改DPAPI/Host/Origin/CSRF。响度测量增加内部可选超时，旧默认120s不变，仅HTML使用170s总预算剩余额度。
- 同一共享可信 runtime 供隔离预览与服务端逐帧采样，网络禁止、CSP 限制、无任意代码；HTML 不再叠加 ASS 字幕，署名由可信 runtime 单一绘制，音频沿用原 loudnorm/AAC/报告。资源/超时/实测及交接见[工单 35](../../CC-Tasks/后端/35-ai-html-pv.md)、[迭代日志](../../docs/iteration-log.md)。

## 工单 34 · 制作表现规划公开追溯（2026-11-08）

- Owner Blacktea；本会话针对共享响应 Schema/声明与服务端序列化提出具体范围，用户回复「确认上述限定范围」。不修改 Client、Mock、UI、路由配置、数据库或永久工程追溯。
- productionJobSchema 新增可选 performancePlanning（status=disabled/running/succeeded/failed/skipped；仅 succeeded 可带 trace）与可选 errorCode=PERFORMANCE_PLANNING_FAILED。旧字段和 Mock 标记继续兼容，旧响应可无新增字段。
- trace 白名单核对现有 router：provider、model、promptVersion、attempts(1–3)、promptTokens、completionTokens、milliseconds、cost(number|null)、costCurrency(USD|null)；不公开 task/at/reason、URL/keyRef、提示词、请求/响应、stack。仅成功 router trace 可选公开；失败无虚构 trace。
- disabled=未配置 performance_planning，running=正在调用 planner，skipped=planner 无可规划句而返回 trace:null，succeeded=已返回经校验规划，failed=配置/规划失败；失败仍终止整项制作、不进入器乐/演唱，禁止单句 retry 绕过。queued/前序阶段可无该字段。
- GET 与 retry 改用显式公开 job 投影并经契约校验，保留 project/composition 与原成功应用/重试所需字段，根级内部 input/failureContext/performanceTrace 等不公开。composition.input 保留原 FreeResult 的创作输入契约，并非后台配置。
- 工单 34 序列化补充：project.vocalAssets 仅返回既有 VocalAsset 工程字段，剔除引擎返回的 sourceProject 绝对缓存路径与额外诊断，保留 dependency/voice/renderParameters 与成功应用/单句重试所需数据。内部资产不修改。
- TS/响应示例与错误边界见[架构](../../docs/ARCHITECTURE.md#production)，验证 Owner Blacktea；Toge 后续 review Mock/页面轻量状态展示，沿用 15-P2B-routing。证据见[工单 34](../../CC-Tasks/已完成/34-production-trace-contract.md)和[迭代日志](../../docs/iteration-log.md)。

## 工单 33 · Synth 伴奏增益路由（2026-11-08）

- Owner Blacktea；本会话针对 src/audio.ts 器乐总线、必要 audio-mix 适配和 PCM/WAV/PV 测试提出具体范围，用户回复「确认上述限定范围」。不修改 UI、Hook、Mock 定义、增益字段、API 或服务端 FluidSynth。
- renderAudio 内仅为 Synth 器乐建立 band bus，processed 时使用 mixSettings.bandGain??1，否则为 1；人声仍走原 master/外部 vocalBus。FluidSynth 继续现有 addWav 路由，不进入新总线。原处理默认值、master、压缩与峰值保护不变。
- 调用点：统一 renderAudio 的试听、WAV/PV；测试 Owner Blacktea，控件解禁 Owner Toge。Groove 试听仍依赖工单 31 后续接线，本单不改 swing/随机算法。
- 验证区分 Chromium OfflineAudioContext/音频夹具与真实 FluidSynth/FFmpeg；实际证据见[工单 33](../../CC-Tasks/已完成/33-browser-synth-band-gain.md)和[迭代日志](../../docs/iteration-log.md)。

## 工单 32 · 显式首音素零偏移修复（2026-11-08）

- Owner Blacktea；用户明确要求完成工单 32，限定 shared/performance 既有字段优先级修复，不新增 Schema、HTTP、工程字段或 UI。先补失败回归后修复。
- offsetMs=0 以字段存在性识别：首位显式覆盖阻止 legacy consonantMs 回填；仅在需要压过非零句级偏移时输出 offset:0，其他无替换零值维持旧省略行为。旧工程、非零换算、发音替换不改。
- 缓存兼容：仅含首音素 offsetMs=0 且无发音替换的 Performance 使用 resolvePerformance.renderRevision=4，对应 Qixuan revision=6，以失效修复前错误缓存；其他 Performance 仍为原 revision。本句已有资产通过既有依赖策略失效，其他句和器乐不改。
- 测试 Owner Blacktea：Schema/映射、USTX、依赖和真实引擎对照；Toge 只需移除原限制提示，Mock/UI 本轮不改。证据见[工单 32](../../CC-Tasks/已完成/32-phoneme-explicit-zero.md)与[迭代日志](../../docs/iteration-log.md)。

## 工单 31 · 制作 Groove 参数（2026-11-08）

- Owner：Blacktea；本会话已就下列具体范围提问，用户明确回复「确认上述限定范围」。本次限定确认覆盖共享契约、工程模型校验、纯音乐转换入口与 external-audio 非 UI 透传；不修改 Client、Mock、组件、Hook 或浏览器混音。
- 新增 grooveSettingsSchema：swingTicks 0–120 整数、timingTicks 0–20 整数、velocityAmount 0–0.2，缺省值各为 0。SongProject.grooveSettings 可选，仅存这三项，旧 v1 不迁移、不补字段。非法参数或伪造身份字段拒绝。
- productionInputSchema 独立扩展 freeInputSchema；POST /api/production 新增可选 grooveSettings，非法为 400；服务端 start 同样校验。规划调用前剥离设置，生成工程后附加，GET 返回。既有 compose / SongPlan 不改。
- projectInstrumentInput 统一从工程、轨道生成器乐输入；种子由工程 ID、轨道 ID/version 派生，保护状态来自真实轨道/音符。缺省或全零省略 groove；仅为 true 的保护标记传入，保留旧无保护缓存输入。performedNotes 继续作为 MIDI 与未来 Synth 共用的纯事件转换，不新增算法。
- 调用点：production 器乐循环、src/external-audio.ts；mjs/d.mts、工程校验及后端测试同步。Mock/Client/UI/Synth 接入 Owner Toge，沿用 20-groove-render；后端完成不代表浏览器试听已一致。
- 验证：契约/HTTP、保存导入、保护、重复 MIDI、缓存及有资源时真实 FluidSynth WAV；实际结果见[工单 31](../../CC-Tasks/已完成/31-production-groove-integration.md)与[迭代日志](../../docs/iteration-log.md)。

<a id="frontend-interface-27"></a>

## 工单 27 · 已有产物与响度接口接线（2026-11-07）

- Owner / Frontend reviewer：Toge。toge 本会话明确选择「一并补下载与报告」，授权 `src/api/client.ts`、`src/features/export/files.ts` 及对应 Mock / 页面 / 测试；不改后端、混音核心、工程模型或音乐算法。
- 沿用工单 19 的 `artifactFileSchema` / `loudnessReportSchema`、二进制 `/api/export` 和 `X-Songyu-Loudness`，不新增公开字段或改义。Client 新增只读下载、分轨响度方法；`exportVideo` 保持返回 Blob，新增可选报告回调，原调用继续兼容。
- 报告缺失或格式错误不阻止已成功的 MP4 下载；页面明确显示报告不可用，绝不从目标值推算实测。Mock 下载/报告明确是夹具，不作为 FFmpeg 或 DAW 证据。
- 器乐文件从当前工程走既有器乐请求取得缓存 key；仅 FluidSynth 模式按明确按钮准备，不改变模式或调用参数。人声只列当前依赖有效的资产；USTX 仅用于绮萱。下载是逐轨，不宣称整曲 MIDI/ZIP。
- 高级调教沿用既有 Performance 字段、`api.qixuan` / `api.sing` 和单句应用函数，只改前端、Hook、Mock 与测试；能力缺失时不假设声库支持。
- 验证责任：前端请求/响应与参数透传、错误保护、保存、页面流程由 Toge；真实引擎、真实成片及人工听感仍见工单 6。实施结果见[工单 27](../../CC-Tasks/27-frontend-interface-sync.md)及[迭代日志](../../docs/iteration-log.md)。

## 工单 20 · 确定性律动与器乐渲染参数（2026-11-07）

- Owner Blacktea；依据用户继续完成工单 20 的限定范围实施 shared/free-score、MIDI 和器乐输入；不修改 SongPlan、工程 Schema、Client、Mock、UI，不延伸到混音或旧模式重构。
- InstrumentInput 新增可选 groove：projectId / trackId（1–150 字）、version（正整数）、swingTicks（0–120 整数）、timingTicks（0–20 整数）、velocityAmount（0–0.2）；后 3 项缺省为 0。480 tick/beat；偶数八分音符（beat 的 .5 位置）后移 swingTicks；非鼓器乐 timing/velocity 使用稳定 tuple + 参数种子，不移动工程 beat。vocal 不应用。新增可选 locked / manuallyEdited 及 notes[].locked：任一保护即整轨不做渲染偏移，调用方必须透传真实保护状态。
- MIDI 声明同步，groove 与保护标记经统一 instrumentInput 保留进入现有渲染 input hash；旧调用不带 groove 时 MIDI 保持原字节。算法 revision 独立进入缓存键（不伪造随机时间种子）。
- 自由鼓组采用 2/4 backbeat、energy 分层、末小节 fill、交替踩镲力度；TAP 底鼓按原 16 格量化规则保留，补全关闭仅生成 TAP 底鼓。锁定/手写自由轨道返回原数据副本。旧模式已有 backbeat/TAP 语义，明确保持原实现。
- 调用点：midiFile 与 InstrumentRenderer；当前 UI/浏览器和 production 不自动携带 groove，选项需后续按共享边界由 Toge 接线；不能把 API 可用写成页面已开放。
- 测试 Owner Blacktea：实际 MIDI 事件、保护、确定性、缓存/真实 WAV 差异。Mock/UI Owner Toge，未代改；交接 20-groove-render，人工听评另验。


## 工单 19 · 只读产物与响度（2026-11-07）

- Owner Blacktea；按工单 19 明确范围实施，不修改 Client/UI/Mock。
- GET `/api/artifacts/:file`：64 位小写十六进制 key + mid/ustx/wav；逐轨下载，无 zip 依赖。GET `/api/artifacts/:file/loudness` 仅接受 WAV，返回 ebur128 的 integratedLufs / truePeakDbtp；静音值为 null。缺失 404，测量不可用 503。
- `/api/export` 保持 MP4 二进制响应，新增 `X-Songyu-Loudness` JSON 头（input/output/target）；output 为编码后 AAC 的实测值，允许编码误差，不伪称达标。
- InstrumentResult.sampleRate 从 24000 升级 48000；声明同步，48kHz 缓存 revision=2（工单 20 后为 3）；旧工程不重写。后续用户明确要求工作区干净后推送合并，本次纳入已存在的 Mock sampleRate 单行兼容修正，仅对齐响应契约、不扩展 Mock 音频能力。
- 测试：下载字节/路径隔离、真实渲染 WAV、FFmpeg 响度与 MP4；页面接入和人工听感另验。


## 2026-11-07 · A1 与 P0 合并兼容

- 本轮按 toge「推送」授权整合已完成的工单 5 与 main；仅解决相邻声明冲突，同时保留 A1 的可选 mock 标记与 P0 的 PitchPoint / pitchCurveSchema 声明。没有新增字段、修改约束或扩展调用语义；既有两项授权和说明保留。
- 交叉回归覆盖 Mock 来源隔离、P0 曲线/锁定、局部编辑与页面流程，实际结果见 [合并记录](../../docs/iteration-log.md#frontend-main-integration)。

## 工单 5 A1 · 自由创作 Mock 来源提案（2026-11-07）

状态：toge 已明确确认限定范围，A1 已实现并验证（2026-11-07），尚未推送。确认依据：本会话在审阅下列提案后回复「可以，继续做完」。
关联任务：[工单 5 A1](../../CC-Tasks/5-toge-free-creation.md)。Owner / Frontend reviewer：toge；Backend reviewer：未另行 review；本次按 toge 对下列限定范围的明确授权实施。

### 标记和工程来源

- 沿用已有 `mock:true`，不新增 `source=mock` 枚举，也不伪造模型用量。为 `FreeResult`、`MelodyResponse`、`MelodyDraft`、`ProductionJob` 增加可选 `mock?:true`，运行时 Zod 与相邻 `.d.mts` 同步；真实响应和旧工程无须补字段。
- Mock compose / production 的 composition 仍使用兼容的 `source:'llm'` 响应格式，但必须带 `mock:true` 和 `model:'mock-fixture-no-inference'`；这是模拟接口形状，不是实际调用证据。Mock draft 使用 `source:'local-rules', mock:true`，melody 响应外层同样带 `mock:true`。创建、轮询、失败和重试返回的 Mock job 都带该标记。
- `buildFreeScore` 只增加来源传递分支：Mock 结果写为 `planning.source:'local-rules', planning.mock:true`，保留 draft 的 Mock 标记；未提供手写歌词时，歌词来源写为 `local-template`，提供时仍为 `manual`。真实分支保持原有来源与全部音乐计算。
- Mock project 即使尚无歌声音频，也能依靠 `planning.mock` / `melodyDraft.mock` 被识别；测试歌声沿用 `mock:true, isDemo:true`。手写词、锁定和非目标句仍按现有校验保护。
- Client 校验前后拒绝真实模式收到的顶层及已知嵌套 Mock 标记，检查 job 的 project / composition、draft、planning 和歌声资产/历史，防止外层漏标或 Zod 剥离标记后误接收。Mock 模式的新三类响应要求显式标记。
- 工程导入及启动恢复沿用上述已知来源检查；真实模式拒绝 Mock 工程。继续使用隔离的 localStorage key、`.mock` 文件名和 JSON PV 回执。

### 限定改动范围与兼容

| 文件 / 调用点 | 本次已授权实施的变更 |
|---|---|
| `shared/contracts/free-composition.mjs` / `.d.mts` | 仅 FreeResult 可选 Mock 标记 |
| `shared/contracts/melody.mjs` / `.d.mts` | 仅 MelodyResponse / MelodyDraft 可选 Mock 标记，不改请求和音乐约束 |
| `shared/contracts/production.mjs` / `.d.mts` | 仅 ProductionJob 可选 Mock 标记，不改 state/stage 和任务语义 |
| `shared/free-score.mjs` | 仅 Mock 来源传递；不改伴奏、音符、时间轴或自动调教算法 |
| `src/api/client.ts` | 仅新 Mock 响应来源检查与真实模式拒收；沿用原有 API、超时、校验与错误保护 |
| `src/features/project/files.ts`、必要的前端来源检查 helper | 仅 Mock 工程导入/恢复隔离；不重写或删除已有存档 |
| `src/api/mock.ts`、必要的前端 Mock helper 与前端测试 | compose / melody / production 的本地固定数据、任务状态及重试；未知路由继续 404 |

不修改 server、真实 LLM / 声库 / 桥接、`src/melody.ts`、`src/model.ts` 或音乐算法。不接 A2 新页面、调教控件或混音控件，不推送或部署。

### 验证与交接

- 契约保留 Mock 标记，真实响应与旧工程继续通过，Mock 工程应用/保存/恢复后不变成真实 LLM 来源。
- compose 保留 1–8 行手写歌词；melody 保留非目标句、锁定及手写内容；测试数据也走既有音乐校验，不放宽约束。
- production 覆盖创建、处理中、成功、失败、404/任务丢失与单句重试，重试保留已完成资产；故障场景通过仅测试端可控入口选择，不往真实请求新增字段。
- 真实 Client 拒绝顶层/嵌套 Mock 数据；Mock 全流程不调用网络、引擎或后台；测试音明确标记。
- build、30 项相关定向测试和 3 项 Mock 页面/浏览器回归通过；结果已写回工单与迭代日志。A1 完成不代表 A2 页面接通、真实引擎或人工听感验收。
- 示例由前端依据已核对契约编写并标注为夹具；红茶实际调用示例与环境仍跟踪[工单 4](../../CC-Tasks/4-blacktea-integration.md)。关联 PR：未创建。

2026-11-06 文档说明：下文 v0.3–v0.3.2 的授权是对应历史任务记录，不适用于新字段或新任务；本次只整理说明，未修改任何 Schema、类型、Client 或 Mock。现行流程见[团队工作流](../../docs/TEAM_WORKFLOW.md)，当前缺口见[Toge 工单](../../CC-Tasks/5-toge-free-creation.md)。

## v0.4.0 逐音素与高级人声表现（工单 15 P1）

- 状态：工单授权范围内实施，后端已推送，交付见 [PR #9](https://github.com/cicikat/CantaLoom/pull/9)（分支 `feature/backend-p1-phoneme`）；用户本轮明确要求直接合并，Toge 页面/Mock 接入另行 review。
- 关联计划/任务与 Owner：[15 · 后端音乐制作升级 P1](../../CC-Tasks/后端/15-p0.md)，Owner Blacktea。工单交付清单明确「音素编辑：新增 PhonemeEdit 契约及能力查询」「调声/Pitch 编辑：扩展 Performance、Note 契约及应用函数」。
- Frontend reviewer：toge（待 PR）；Backend reviewer：Blacktea。
- 路径/Schema/字段：
  - `shared/contracts/melody.mjs`：`performanceSchema.overrides[]` 新增可选 `vibratoLength`（0–100）、`vibratoPeriod`（5–500）、`vibratoIn` / `vibratoOut`（0–100，含默认合计 ≤100）、`vibratoDrift`（±100）、`vibratoVolLink`（±100）与 `phonemes`（`phonemeEditSchema`：index 0–15，`offsetMs` ±300 与 `phoneme` 1–20 字至少其一，每音符 ≤8 条且位置唯一）；`performanceSchema` 新增可选 `dynCurve`（2–64 点，x=句首相对毫秒，y=−240–120 即 0.1 dB）与 `curves`（`expressionCurveSchema`：abbr ∈ brec/voic/genc/velc/pexp/shfc，points 2–64 严格递增，y 限各描述符范围，abbr 唯一）。相邻 `.d.mts` 新增 `PhonemeEdit` / `CurvePoint` / `ExpressionAbbr` / `ExpressionCurve` 类型与 `phonemeEditSchema` / `dynCurveSchema` / `expressionCurveSchema` / `curveRanges` 声明。
  - `shared/contracts/index.mjs`：`qixuanStatusSchema` 可用分支新增可选 `capabilities`（curves 八项布尔、phonemeOverride、unsupported 清单）；`qixuanResultSchema` 新增可选 `phonemes`（真实音素序列，桥接报告原有字段透传）。
- 新增、删除或语义变更：仅新增可选字段。音素 offsetMs 按 BPM 换算 USTX tick；phoneme 替换经服务端按声库四份音素词表交集预校验，非法在渲染前明确报错。velc/pexp 为渲染器建议表达，生成 USTX 时显式写入描述符。`dynCurve` 提供时整体替换自动 DYN；各曲线覆盖范围外回落引擎默认值。ene/tenc/换气声/voiceColor/phonemeEnvelope 明确不支持，不进入契约。
- 旧工程与旧调用方兼容方式：全部字段可选，旧 JSON 无需迁移；不含新字段的 Performance 生成的 USTX、依赖串与缓存键逐字节同 v0.3.3（单元回归锁定）。capabilities/phonemes 可选，旧客户端忽略。
- 受影响的 UI / 服务 / Mock：`notePerformance` / `performanceCurves`（shared/performance.mjs）映射新参数；`server/services/qixuan.mjs` 解析声库能力、音素预校验与 USTX 描述符；无新 HTTP 端点。Mock 不返回 capabilities/phonemes/新调教字段，扩展归 toge。
- Mock 示例提供人 / 实现人 / 待接入 PR：本任务提供真实请求/响应示例（见工单 P1 交接节）；Mock 与页面接入待 toge PR。
- 契约与回归测试：`tests/p1-phoneme.test.ts`（Schema、USTX 映射、精准失效、能力解析）、`tests/qixuan-p1-real.test.mjs`（真实引擎十组参数 WAV 对照、非法音素拒绝）；既有 `tests/p0-tuning.test.ts` 与 `tests/qixuan-real.test.mjs` 保持通过。
- 关联 PR：[PR #9](https://github.com/cicikat/CantaLoom/pull/9)，分支 `feature/backend-p1-phoneme` 已推送；P0（v0.3.3）已随 `ed3c652` 快进合并 main。

## v0.3.3 可编辑 Pitch 曲线（工单 15-p0）

- 状态：工单授权范围内实施，已随 `ed3c652` 快进合并 main（2026-11-07）。
- 关联计划/任务与 Owner：[15 · 后端音乐制作升级 P0](../../CC-Tasks/后端/15-p0.md)，Owner Blacktea。工单交付清单明确「调声/Pitch 编辑：扩展 Performance、Note 契约及应用函数」。
- Frontend reviewer：toge（待 PR）；Backend reviewer：Blacktea。
- 路径/Schema/字段：`shared/contracts/melody.mjs` 的 `performanceSchema.overrides[]` 新增可选 `pitch`；新增 `pitchPointSchema` / `pitchCurveSchema`；相邻 `.d.mts` 新增 `PitchPoint` 类型与两个常量声明。
- 新增、删除或语义变更：仅新增可选字段。`pitch` 为单音符 Pitch 曲线：x=相对音符的毫秒（-500–30000）、y=十分之一半音整数（±1200）、shape=io/i/o/l，2–64 个按 x 严格递增的点；提供时替换该音符的自动过渡点并以 snap_first=false 进入 USTX，不影响其他音符、DYN 曲线与颤音。
- 旧工程与旧调用方兼容方式：字段可选，旧 JSON 无需迁移；不含 pitch 的演唱依赖串、缓存键与渲染结果保持原值。
- 受影响的 UI / 服务 / Mock：USTX 渲染（`notePerformance` → server 绮萱与 `openUtauProject` 导出）、演唱依赖（`resolvePerformance` 自动包含 pitch）；无新 HTTP 端点，单句重唱复用 `POST /api/singing/qixuan/render`。Mock 当前不返回 pitch，扩展归 toge。
- Mock 示例提供人 / 实现人 / 待接入 PR：本任务提供真实请求/响应示例（见工单交接节）；Mock 与页面接入待 toge PR。
- 契约与回归测试：`tests/p0-tuning.test.ts`（Schema、USTX 映射、精准失效）、`tests/qixuan-real.test.mjs`（真实引擎缓存/PCM 差异）、`tests/browser/p0-resing.spec.ts`（真实混音验收）。
- 关联 PR：分支 `feature/backend-p0-fine-tuning`，已快进合并 main（`ed3c652`）。

## v0.2.1

- 汇总已有 health、器乐、绮萱、音频文件、导出、引擎/词典/导入契约；SongPlan 复用原 Schema。
- 新增可选 `mock:true` 开发标记（PlanResponse / Planning / VocalAsset），旧工程与真实响应无需增加字段。Mock VocalAsset 的 isDemo 为 true，真实资产仍为 false。
- HTTP 路径、成功数据含义、锁定和缓存规则保持不变。请求生命周期是客户端状态，不新增后台管理权限。
- MIDI 基础类型由 shared 拥有，前端 Note 只扩展 ID / syllable，消除 shared 到 src 的反向类型依赖；字段和运行时 MIDI 不变。

## 后续共享字段变更模板

在实现 PR 前提交一条提案，两人共同确认；下面的空白不是已经审批。

```text
状态：提案 / 双方已确认 / 已合并
关联计划/任务与 Owner：
Frontend reviewer：
Backend reviewer：
确认依据：双方 review / toge 对本任务范围的明确授权（记录范围，不推定批准）
路径/Schema/字段：
新增、删除或语义变更：
旧工程与旧调用方兼容方式：
受影响的 UI / 服务 / Mock：
Mock 示例提供人 / 实现人 / 待接入 PR：
契约与回归测试：
关联 PR：
```

## v0.3 MelodyDraft / Performance（用户已统一确认，2026-11-05）

Owner 红茶；用户在本轮明确授权“由我统一确认，按工单实现契约”。不代表toge UI 已接入。

新增 `melody.mjs` / `.d.mts` 与 POST `/api/melody`：intent、bpm、现有 songPlan、动态数量 phrases、可选 targetIds、source。空 text 表示请 LLM 原创歌词；非空 text 原样保护。phrase.locked 冻结整句；notes[].locked 冻结指定音符；只生成 targetIds，其他句逐字段保留。notes 使用绝对 beat，syllable 为单字或 `+` 连音，间隙表示休止。响应 draft.source 明确 llm / local-rules，附模型与 token/耗时记录，不返回 Key 或上游错误。

SongProject 新增可选 melodyDraft；Note 新增可选 locked；Lyric 新增可选 performance。旧 JSON 无需迁移。绮萱请求新增可选 performance；未提供时保留旧行为与旧缓存。新表现参数与音符锁定相关依赖只影响当前句，不改兄弟缓存。

toge接入：通过共享客户端 melody(request) 获取完整验证结果，再用 src/melody.ts 的 applyMelodyDraft 原子应用；按 phrase ID / note ID 操作锁定。只改表现可用 setPhrasePerformance，无需重作曲。natural/soft/strong 是内部 preset ID；UI 中文分别自然/轻柔/强烈。Mock 扩展由toge维护，本轮不改其文件。

验收：契约约束、歌词/音符对齐、锁定和局部生成、和声检查、失败原子性、旧缓存兼容、真实 LLM 与歌声实测；详细证据见[动态旋律迭代记录](../../docs/iteration-log.md#v03-backend)。

## v0.3.1 自由创作（历史工单2授权记录）

原工单2未随本仓库保存；此处保留当时授权记录，现行接入方法与验收条件以下方交接及当前计划为准。
新增 POST /api/compose，输入 intent、可选 lyrics[]、bpm、targetSeconds；响应为一次事务完成的宏观规划、分配时间轴和 MelodyDraft，含 requestId/model 来源。新工程 mode=free/style=自由创作，不从旧模板初始化。旧模式不迁移不改音符。前端接入与 Mock 属于toge，见[自由创作接入](../../docs/ARCHITECTURE.md#composition)。

## v0.3.2（历史工单3及当时授权记录）

原工单3未随本仓库保存；历史授权不延伸为后续修改许可。此阶段后端已合并，前端/Mock与共同验收仍见当前计划。
Performance 增加可选 mode=auto/manual、energy、locked、逐音符 overrides；无新字段仍走旧参数映射。SongProject 增加可选混音设置和调教历史。共享类型/校验/客户端由红茶维护，UI/Mock 仍交接toge。新增制作任务接口复用 compose、FluidSynth、绮萱无窗口桥接；ready-for-mix 不表示浏览器导出完成。主题为创作意图而非歌词原文，允许自由歌体。
