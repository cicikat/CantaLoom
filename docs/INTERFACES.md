# 接口与可调数据清单

面向 `03_patchlab_playful.html` 的 LOOP! 原型接线的翻阅参考（[设计与实现边界](ARCHITECTURE.md#prototype-frontend)）：**后端与音乐核心真实存在、设计上允许 UI 暴露并会真实生效的数据和开关**，以及看似能开但实际不存在的功能。流程与调用方法（代次保护、原子应用、失败语义）见 [ARCHITECTURE](ARCHITECTURE.md)，本文不重复；字段权威定义以 `shared/contracts/` 为准，新增或改义字段先走 [CHANGELOG 提案](../shared/contracts/CHANGELOG.md)。

状态标记：**main** 为原能力标记；P0 / v0.3.3 的曲线等能力已进入当前代码，不再表示只能从旧 P0 分支读取。接口存在不代表全部页面/Mock 已接通，当前接线与边界见 [Toge 工单](../CC-Tasks/5-toge-free-creation.md)及[本轮记录](iteration-log.md#expression-mix-controls)。

## 前端速读：哪些数字需要做成控件

| 页面区域 | 需要考虑的内容 | 当前入口 |
|---|---|---|
| 创作设置 | 主题 1–500 字；可选歌词 1–8 行、每行 1–100 字；速度 60–160；目标约 20/25/30 秒 | 首屏铅笔 |
| 音符编辑 | 音高 48–84；长度 0.125–16 拍；位置不能超出当前句或重叠 | 歌词卡片「编辑旋律」 |
| 每句调教 | 自然/轻柔/强烈、自动/手动；高级参数为过渡 0–160 ms、颤音 0–60、力度 −120–60、辅音 −60–60 ms | 「逐句演唱与重唱」→ 每句「演唱调教」 |
| 全曲混音 | 人声音量与伴奏音量 0–200%，默认 100%；混响 0–0.25，默认 0.08 | 歌词区底部「混音与分轨试听」 |

这是可用能力的清单，不要求把所有限制做成输入框。energy 由既有单句自动分析带入；overrides 索引由音符选择器带入；take 由重唱操作带入；缓存、引擎版本和文件上限由程序处理。steps/depth、EQ、声像等固定或未实现参数不做滑杆。

本轮只接前端：浏览器 synth 伴奏尚未应用 bandGain，伴奏音量在此模式禁用；切到已有 FluidSynth 路径才启用。元音演示不支持此处的调教、人声音量与混响，相关控件禁用。详情与红茶交接见 [5-C-synth-mix](../CROSS-END-HANDOFF.md#5-c-synth-mix)。

## 创作输入（`api.compose` / `api.startProduction`）

| 字段 | 取值 | 默认 | 说明 |
|---|---|---|---|
| intent | 1–500 字 | 必填 | 音乐/情绪/动态要求，不照抄成歌词 |
| lyrics | 1–8 行，每行 1–100 字 | 无 | 提供则逐字保留；省略由本次 LLM 作词 |
| bpm | 整数 60–160 | 无 | 提供则严格保留，否则规划选择 |
| targetSeconds | 20–30 | 25 | 按整小节近似，不承诺精确秒数 |

返回 `plan`（title/mood/bpm/songPlan/lyrics/phraseWeights 0.5–4）、固定四段 `sections`、完整 `draft`。**新模式没有曲风选择**；旧三曲风仅属旧 `api.plan`（idea 1–200 字 + style 海盐汽水/深夜漫游/橘子摇滚，四句 ≤40 字）。

## SongPlan 音乐计划（main）

自由工程中由 LLM 规划返回，UI 可展示、可作为重新生成的依据；**不支持手改单个字段局部生效**，改计划＝重新生成。字段与对真实音符的影响见 [ARCHITECTURE SongPlan 契约](ARCHITECTURE.md#project-data)：key、emotion、intensity、chordProgression、drumDensity、melodyContour、melodyRange、sectionEnergy、reasons（仅解释）。

## 演唱调教 Performance（每句 `lyric.performance`）

| 字段 | 取值 | 默认 | 真实效果 |
|---|---|---|---|
| preset | natural / soft / strong（自然/轻柔/强烈） | natural | 固定映射：natural {过渡60, 颤音18, 力度0, 辅音0}；soft {95,12,−35,+12}；strong {35,30,+22,−12}；auto 模式下再乘情绪修订 |
| mode | auto / manual | manual（缺省） | auto 按音符时长/间隔/跳进/重复/标点/能量计算控制值；manual 仅用给定值 |
| energy | 0.2–1 | 0.6 | auto 分析输入，影响颤音深度与 DYN 力度 |
| locked | boolean | false | 禁止自动调教覆盖本句 |
| transitionMs | 0–160 | 按 preset/auto | 音高过渡时长，写入 USTX pitch 点 |
| vibratoDepth | 0–60 | 按 preset/auto | 颤音深度；长音 ≥0.65 s 才进入，auto 随 energy 收敛 |
| dynamics | −120–60 | 按 preset/auto | DYN 曲线基准与逐音符力度 |
| consonantMs | −60–60 | 按 preset/auto | 辅音起音偏移（按 BPM 换算 tick；休止后不提前） |
| overrides[] | ≤100 条 | 无 | 逐音符覆盖：index 0–99、origin auto/manual、同上四项、pitch、locked |

**Pitch 曲线（已合入，v0.3.3）**：`overrides[].pitch`＝2–64 个按 x 严格递增的点；x＝相对音符起点毫秒（−500–30000，负值先入），y＝十分之一半音整数（±1200），shape＝io/i/o/l（默认 io）。提供时替换该音符自动过渡点，删除即恢复自动；随演唱依赖进入缓存失效。

工程级辅助：`performanceHistory` 每句 ≤3 版；`restorePerformance(project,lineId)` 恢复上一版；`autoTuneProject(project,lineId?)` 全曲/单句自动调教（跳过锁定）。只改表达只重唱该句，不调 LLM。auto 且 preset≠natural 时渲染修订为 3（否则 2），不同版本缓存不互相命中。

**不暴露**：换气、气声、声线张力、breath/ENE 等参数——引擎未验证支持，不做假开关（审计见工单 15 P1）。

## 旋律与歌词编辑（共享函数，含已合入 P0）

| 能力 | 入口 | 关键约束 |
|---|---|---|
| 局部重作曲 | `melodyRequest` → `api.melody` → `applyMelodyDraft` | targetIds ≤16；非目标句逐字段保留；锁定句/音符冻结 |
| 音符锁 / 乐句锁 | `note.locked` / `lyric.locked` | 服务端校验锁定内容逐字段不变 |
| 编辑音高/起点/长度（P0） | `editPhraseNotes(project,lineId,notes)` | 等数量、同 ID、同顺序、同音节；全校验后原子替换 |
| 改词（P0） | `setLyricText(project,lineId,text,{keepMelody})` | keepMelody 要求唱字数一致；否则清空音符与旧索引 overrides 后重新作曲。锁定音符不被修改或清除：keepMelody 会改到锁定音符唱字时报错，重新作曲在句内含锁定音符时直接拒绝 |

音符契约：beat 0–256、duration 0.125–16、midi 48–84、velocity 0.1–1、syllable 1–4 字（`+` 为连音）。乐句时间轴约束：句尾 ≤30 秒（`end*60/bpm≤30`）。

## 绮萱渲染与歌声资产（main，P0 增强）

`POST /api/singing/qixuan/render` 请求内可调：**runner**（CPU / DirectML，默认 CPU，工程级 `project.singingRunner`）、**take**（0–10000，递增＝重唱一版）、**performance**（上文全部调教数据）。响应 `renderParameters` 中 **steps=20、depth=0.6 是服务端固定声码器参数，状态可见但不可按请求调节**。单句 `durationSeconds` ≤35。

版本与失效：当前演唱在 `vocalAssets[lineId]`，历史 `vocalHistory` 每句 ≤3 版；`restoreVocalAsset`（P0）仅在依赖与 runner 匹配时可恢复。缓存失效因素＝本句歌词/音符/BPM/起止/Performance（含 pitch）/声库与引擎版本/runner/渲染修订；兄弟句与器乐缓存不受影响。

## 器乐与轨道（main）

`POST /api/instruments/render`：kind＝drums/bass/guitar/keys/melody，notes ≤512（beat 0–256、midi 0–127、velocity 0–1），可选 **program**（GM 0–127）与 **soundfont**。工程级：`instrumentMode`（synth / fluidsynth）、`soundfont`、`instrumentPrograms`；轨道级 `track.muted`、`track.locked` 真实参与混音与保护。`vocalPreset`（澄音/星羽/雾歌）只影响旧模式元音演示音色，与真实绮萱无关。

## 混音与分轨（main；P0 加拼接淡化）

浏览器 `renderAudio(project,{stem})` 统一服务试听/WAV/PV，stem＝vocal-dry / vocal-processed / instrumental / mix。

| 开关 | 取值 | 默认 | 说明 |
|---|---|---|---|
| mixSettings.enabled | boolean | 自由工程开，旧工程关 | 关闭则整曲走原行为 |
| vocalGain | 0–2 | 1 | 人声总增益（自适应增益之上） |
| bandGain | 0–2 | 1 | 伴奏总增益 |
| reverb | 0–0.25 | 0.08 | 人声房间混响发送量 |

**自适应、不可手动**：按实际 PCM 的 RMS/峰值/高频差分选择人声增益（0.45–2.2）、高切（75/95 Hz）、高频搁架（−3/−0.5 dB @6 kHz）、压缩阈值/比率；声像固定 drums 0、bass 0、guitar −0.3、keys +0.28、melody +0.12、vocal 0；总线 0.8 增益 + 压缩（−12 dB / 5:1）；单句拼接淡入 50 ms / 淡出 150 ms（引擎 padding 内，固定）。vocal-dry 不经任何处理。

**尚未实现（P3，原型不要先做开关）**：逐参数 EQ/压缩/De-esser/Delay 效果链、声像调节、参数自动化、LUFS 目标与真峰值限制。

## 制作任务状态（main）

`POST /api/production` → 202 + job；`GET /api/production/:id` 轮询：state＝running/succeeded/failed，stage＝queued/checking/composing/planning/melody/validated/instruments/singing/ready-for-mix；失败时附 error、phraseId、completedPhrases。`POST /:id/retry/:phraseId` 仅重试失败句（610 秒）。**没有百分比进度**；任务为内存最多 30 条，重启 404；ready-for-mix ≠ 已导出 MP4。

## 导出与署名（main）

`POST /api/export`：scenes 恰好 4 幅 PNG（单幅 ≤2.5 MB base64、每幅 0.5–30 s）、总时长 15–35 s、字幕时间轴 ≤32 条；**style**＝cinema/poster/minimal；**singingCredit**＝demo/qixuan/external（默认 demo）。工程 JSON 导入上限 5 MB。

## 状态查询（main）

`api.health()`：ffmpeg、llm、llmStatus（local/unverified/verified）。`api.engines()`：器乐 installed/ready/soundfonts/version 与歌声模式。`api.qixuan()`：available 判别联合，可用时含 engineVersion、parameters{steps,depth}、runners。`api.dictionary()`：拼音→音素。旧原生 `/api/singing/voices`、`/api/singing/render` 文件交换接口保留，React 工作台不直接调用。

## SongProject 可选持久化字段速查

`mode='free'`、`creationRequestId`、`melodyDraft`、`songPlan`、`planning`、`rhythmCompletion`、`mixSettings`、`performanceHistory`、`vocalAssets`、`vocalHistory`、`singingRunner`、`instrumentMode`、`soundfont`、`instrumentPrograms`、`vocalMode`。均向后兼容：旧 JSON 无新字段仍可读，不自动改写音符。schemaVersion 恒为 1。

## 原型防坑：不存在或不应暴露的开关

- 百分比进度、任务持久化、跨进程断点恢复——没有，不做假。
- 声码器 steps/depth、模型选择/路由（P2-B 待排期）——前端不可调；模型由本机后台配置，密钥不出后端。
- 换气/气声/张力/breath/ENE、逐音素时序编辑（P1 待审计）——未支持。
- 效果链、声像、自动化、LUFS 目标（P3 待排期）；混响仅 0–0.25 一个发送量。
- 超 35 秒长歌曲、超过四段结构（P2-A 待排期）。
- AI 生图开关——画面是原创程序化 Canvas；VisualPlanner 为本地规则。
- 管理后台接口（/api/admin/*）不属于创作前端，不解限、不代理。

## Mock 覆盖现状

Mock 已覆盖 compose / melody / production 的创建、阶段、失败与单句重试；未知路径仍返回 404，不会偷连真实后端。plan/instrument/singing/export Mock 继续可用。Mock 歌声必须 `isDemo:true`，真实必须 `false`；真实模式拒绝 mock 标记响应与 Mock 缓存。调教、单句重唱、分轨与混音控件已通过 Mock 页面测试；测试音的 PCM 差异不代表真实歌声听感。默认 pitch 曲线夹具及曲线绘制 UI 当前不在本轮范围，既有工程曲线在数值编辑时保留。见[工单 5](../CC-Tasks/5-toge-free-creation.md)。
