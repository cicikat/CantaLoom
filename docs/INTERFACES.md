# 接口与可调数据清单

面向 `03_patchlab_playful.html` 的 LOOP! 原型接线的翻阅参考（[设计与实现边界](ARCHITECTURE.md#prototype-frontend)）：**后端与音乐核心真实存在、设计上允许 UI 暴露并会真实生效的数据和开关**，以及看似能开但实际不存在的功能。流程与调用方法（代次保护、原子应用、失败语义）见 [ARCHITECTURE](ARCHITECTURE.md)，本文不重复；字段权威定义以 `shared/contracts/` 为准，新增或改义字段先走 [CHANGELOG 提案](../shared/contracts/CHANGELOG.md)。

状态标记：**main**＝已合并（含工单 15 P1 / v0.4.0，基线 `003f4c5`）；下文历史 P0/P1 标记均已进入该 main。**新增（2026-11-07，工单 19/20）**＝本轮交付，新增端点与字段在对应节标出，实际合并状态见[迭代日志](iteration-log.md#quality-interface-delivery)。接口存在不代表新页面/Mock 已接通，页面进度见 [Toge 工单](../CC-Tasks/5-toge-free-creation.md)。

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
| overrides[] | ≤100 条 | 无 | 逐音符覆盖：index 0–99、origin auto/manual、同上四项、pitch、v0.4.0 颤音六参、phonemes、locked |

**Pitch 曲线（P0 分支 / v0.3.3）**：`overrides[].pitch`＝2–64 个按 x 严格递增的点；x＝相对音符起点毫秒（−500–30000，负值先入），y＝十分之一半音整数（±1200），shape＝io/i/o/l（默认 io）。提供时替换该音符自动过渡点，删除即恢复自动；随演唱依赖进入缓存失效。

**v0.4.0 逐音符颤音（P1）**：`overrides[]` 新增 vibratoLength（0–100，音符长度百分比）、vibratoPeriod（5–500 ms）、vibratoIn / vibratoOut（0–100，淡入淡出，合计 ≤100）、vibratoDrift（±100）、vibratoVolLink（±100，音量联动）；缺省保持既有自动形态。滑音仍由 transitionMs 与 pitch 曲线控制。

**v0.4.0 逐音素覆盖（P1）**：`overrides[].phonemes` ≤8 条，index＝本音符音素化结果序号（0–15，真实音素序列见渲染响应 `phonemes`）；`offsetMs`（±300，按 BPM 换算 tick）调逐音素时序，`phoneme` 替换发音（须在该声库音素词表内，服务端预校验，非法明确报错）；二者至少其一。同一位置只允许一条覆盖；显式 0 位覆盖优先于旧 consonantMs。

**v0.4.0 句级表现曲线（P1）**：`performance.curves` ≤6 条，abbr ∈ brec（气声增量 ±100）/ voic（发声 0–100，默认 100）/ genc（声线位移 ±100）/ velc（速度 0–200，默认 100）/ pexp（音高表现力 0–100，默认 100）/ shfc（音高偏移 ±1200×0.1 半音）；points 2–64 个按 x 严格递增，x＝相对句首毫秒，y 为对应描述符范围内整数；覆盖范围外回落引擎默认值。`performance.dynCurve`（2–64 点，y −240–120＝0.1 dB）提供时整体替换自动 DYN 曲线，句尾衰减与收音由其尾部点控制。全部为绮萱声库原生支持并经真实 WAV 对照验证；能力以 `GET /api/singing/qixuan` 的 `capabilities` 为准（从声库配置实测解析）。

工程级辅助：`performanceHistory` 每句 ≤3 版；`restorePerformance(project,lineId)` 恢复上一版；`autoTuneProject(project,lineId?)` 全曲/单句自动调教（跳过锁定）。只改表达只重唱该句，不调 LLM。auto 且 preset≠natural 时渲染修订为 3（否则 2），不同版本缓存不互相命中。

**不支持（如实报告，绝不做假开关）**：ene（energy，声库无 embed）、tenc（声线张力，无 embed）、换气声（无呼吸采样合成）、voiceColor（声库无子音色）、phonemeEnvelope（DiffSinger 逐音素音量包络/ATK/DEC 旗标对该渲染器无效）。以上字段不在契约中；状态接口 `capabilities.unsupported` 明确列出。

## 旋律与歌词编辑（共享函数，main + P0 分支）

| 能力 | 入口 | 关键约束 |
|---|---|---|
| 局部重作曲 | `melodyRequest` → `api.melody` → `applyMelodyDraft` | targetIds ≤16；非目标句逐字段保留；锁定句/音符冻结 |
| 音符锁 / 乐句锁 | `note.locked` / `lyric.locked` | 服务端校验锁定内容逐字段不变 |
| 编辑音高/起点/长度（P0） | `editPhraseNotes(project,lineId,notes)` | 等数量、同 ID、同顺序、同音节；全校验后原子替换 |
| 改词（P0） | `setLyricText(project,lineId,text,{keepMelody})` | keepMelody 要求唱字数一致；否则清空音符与旧索引 overrides 后重新作曲。锁定音符不被修改或清除：keepMelody 会改到锁定音符唱字时报错，重新作曲在句内含锁定音符时直接拒绝 |

音符契约：beat 0–256、duration 0.125–16、midi 48–84、velocity 0.1–1、syllable 1–4 字（`+` 为连音）。乐句时间轴约束：句尾 ≤30 秒（`end*60/bpm≤30`）。

## 绮萱渲染与歌声资产（main，P0 增强）

`POST /api/singing/qixuan/render` 请求内可调：**runner**（CPU / DirectML，默认 CPU，工程级 `project.singingRunner`）、**take**（0–10000，递增＝重唱一版）、**performance**（上文全部调教数据）。响应 `renderParameters` 中 **steps=20、depth=0.6 是服务端固定声码器参数，状态可见但不可按请求调节**；v0.4.0 起响应另带可选 `phonemes`（本句真实音素序列，供逐音素索引参照）。单句 `durationSeconds` ≤35。

`GET /api/singing/qixuan` v0.4.0 起返回可选 `capabilities`：`curves`（brec/voic/genc/velc/pexp/shfc/ene/tenc 逐项布尔，从声库 dsconfig 与声码器配置实测解析）、`phonemeOverride`（offset/replace）、`unsupported`（明确不支持的效果清单）。前端以此决定调教 UI 可用项，不要自行假设。

版本与失效：当前演唱在 `vocalAssets[lineId]`，历史 `vocalHistory` 每句 ≤3 版；`restoreVocalAsset`（P0）仅在依赖与 runner 匹配时可恢复。缓存失效因素＝本句歌词/音符/BPM/起止/Performance（含 pitch、颤音、音素与全部表现曲线）/声库与引擎版本/runner/渲染修订；兄弟句与器乐缓存不受影响。

## 器乐与轨道（main）

`POST /api/instruments/render`：kind＝drums/bass/guitar/keys/melody，notes ≤512（beat 0–256、midi 0–127、velocity 0–1），可选 **program**（GM 0–127）与 **soundfont**。工程级：`instrumentMode`（synth / fluidsynth）、`soundfont`、`instrumentPrograms`；轨道级 `track.muted`、`track.locked` 真实参与混音与保护。`vocalPreset`（澄音/星羽/雾歌）只影响旧模式元音演示音色，与真实绮萱无关。

### 【新增 · 工单 19】器乐采样率与缓存产物

FluidSynth 响应 `sampleRate` 从 24000 升为 **48000**，源 WAV 保持 PCM s16；当前 render revision=3（48kHz 升级为 2，律动升级为 3）。浏览器统一混音仍为 24kHz，不能把源文件升级理解为最终 WAV 已全链路 48kHz。Mock 响应采样率同步为 48000，仍明确是测试音。

| 新增只读端点 | 参数与响应 | 失败与边界 |
|---|---|---|
| `GET /api/artifacts/:file` | file 为 64 位小写十六进制缓存 key + `.mid` / `.ustx` / `.wav`；附件下载缓存原字节 | 非法文件名 400，缺失 404；无 zip，无目录/路径参数 |
| `GET /api/artifacts/:file/loudness` | 只接受同格式 `.wav`；`{integratedLufs:number|null,truePeakDbtp:number|null}`，FFmpeg ebur128 只读测量 | 非法 400、缺失 404、FFmpeg 测量不可用 503；静音无穷值为 null |

MID 对应器乐渲染轨道，USTX 对应真实演唱缓存源工程，WAV 对应各器乐/人声缓存；不是整曲聚合 MIDI。已有响应 key 可构造地址；USTX 不向前端暴露服务器 sourceProject 绝对路径。以上端点尚无 Client/Mock/页面入口，不应假设已有一键下载控件。

### 【新增 · 工单 20】器乐可选 groove 与保护字段

仍使用 `POST /api/instruments/render`，**未新增律动 HTTP 路由**。请求新增可选 `groove` 对象；不传即不施加额外 MIDI 律动，不修改 SongPlan/工程 beat。

| 新增字段 | 取值/默认 | 语义 |
|---|---|---|
| groove.projectId / groove.trackId | 各 1–150 字，提供 groove 时必填 | 稳定工程/轨道 ID，禁止用当前时间替代 |
| groove.version | 整数 1–1000000，提供 groove 时必填 | 轨道版本；与 ID 和参数一起决定稳定种子 |
| groove.swingTicks | 整数 0–120，默认 0 | 480 tick/beat；偶数八分音符（.5 拍位置）向后移动 |
| groove.timingTicks | 整数 0–20，默认 0 | 非鼓器乐起音 ±该 tick 数的确定性抖动 |
| groove.velocityAmount | 0–0.2，默认 0 | 非鼓器乐 velocity 的确定性加减，最终夹紧 0–1 |
| locked / manuallyEdited / notes[].locked | 可选 boolean | 透传真实保护状态；任一为 true 则整轨旁路 groove，hash 前去掉 groove，切换选项不改变受保护轨缓存键 |

示例：`groove:{projectId:"project-1",trackId:"track-1",version:1,swingTicks:60,timingTicks:15,velocityAmount:0.08}`。统一 Zod 校验失败返回 400；有效参数和种子进入渲染 hash，相同输入 MIDI 字节一致。鼓仅应用 swing，不额外加 timing/velocity 抖动；vocal 不经此器乐端点。锁定不由后端猜测，调用方须带保护标记。

自由编曲核心已默认采用 backbeat、末小节 fill、踩镲力度分层与 energy 动态；旧模式保持原鼓型/TAP 实现。**可选 groove 尚未由 production/浏览器/Client/Mock 自动传入，也没有页面开关或工程持久化字段**；接线时必须统一保存、试听与导出的参数来源，见[交接 20-groove-render](../CROSS-END-HANDOFF.md#20-groove-render)。

## 混音与分轨（main；P0 加拼接淡化）

浏览器 `renderAudio(project,{stem})` 统一服务试听/WAV/PV，stem＝vocal-dry / vocal-processed / instrumental / mix。

| 开关 | 取值 | 默认 | 说明 |
|---|---|---|---|
| mixSettings.enabled | boolean | 自由工程开，旧工程关 | 关闭则整曲走原行为 |
| vocalGain | 0–2 | 1 | 人声总增益（自适应增益之上） |
| bandGain | 0–2 | 1 | 伴奏总增益 |
| reverb | 0–0.25 | 0.08 | 人声房间混响发送量 |

**自适应、不可手动**：按实际 PCM 的 RMS/峰值/高频差分选择人声增益（0.45–2.2）、高切（75/95 Hz）、高频搁架（−3/−0.5 dB @6 kHz）、压缩阈值/比率；声像固定 drums 0、bass 0、guitar −0.3、keys +0.28、melody +0.12、vocal 0；总线 0.8 增益 + 压缩（−12 dB / 5:1）；单句拼接淡入 50 ms / 淡出 150 ms（引擎 padding 内，固定）。vocal-dry 不经任何处理。

**尚未实现（P3，原型不要先做开关）**：逐参数 EQ/压缩/De-esser/Delay 效果链、声像调节、参数自动化、可调 LUFS 目标与真峰值限制。工单 19 已新增服务端 MP4 固定目标 loudnorm 与实测报告，见下文；不属于浏览器效果链。

## 制作任务状态（main）

`POST /api/production` → 202 + job；`GET /api/production/:id` 轮询：state＝running/succeeded/failed，stage＝queued/checking/composing/planning/melody/validated/instruments/singing/ready-for-mix；失败时附 error、phraseId、completedPhrases。`POST /:id/retry/:phraseId` 仅重试失败句（610 秒）。**没有百分比进度**；任务为内存最多 30 条，重启 404；ready-for-mix ≠ 已导出 MP4。

## 导出与署名（main）

`POST /api/export`：scenes 恰好 4 幅 PNG（单幅 ≤2.5 MB base64、每幅 0.5–30 s）、总时长 15–35 s、字幕时间轴 ≤32 条；**style**＝cinema/poster/minimal；**singingCredit**＝demo/qixuan/external（默认 demo）。工程 JSON 导入上限 5 MB。

### 【新增 · 工单 19】MP4 响度归一与报告头

`POST /api/export` 保持原请求与 MP4 二进制下载响应；新增 **`X-Songyu-Loudness`** 响应头，内容为 JSON：

```json
{"input":{"integratedLufs":-25.7,"truePeakDbtp":-9.5},"output":{"integratedLufs":-13.6,"truePeakDbtp":-1.4},"target":{"integratedLufs":-14,"truePeakDbtp":-1.5,"lra":11}}
```

上例来自本轮本地规则自由编曲/真实 FluidSynth/Chromium 混音/MP4 实测，不是真实 LLM 新创作。input 测量上传的 mix.wav，output 测量编码后 AAC；静音测量值可为 null。FFmpeg loudnorm 固定目标 -14 LUFS / -1.5 dBTP / LRA 11，AAC 192k/48kHz；**没有请求可调 LUFS 开关**，不改变浏览器混音。本例距目标 +0.4 LU / +0.1 dB，报告如实保留编码偏差，不宣称严格达标。当前 Client 返回 Blob，页面尚不展示该响应头；独立客户端需要自行读取头。

## 状态查询（main）

`api.health()`：ffmpeg、llm、llmStatus（local/unverified/verified）。`api.engines()`：器乐 installed/ready/soundfonts/version 与歌声模式。`api.qixuan()`：available 判别联合，可用时含 engineVersion、parameters{steps,depth}、runners，v0.4.0 起另含可选 capabilities。`api.dictionary()`：拼音→音素。旧原生 `/api/singing/voices`、`/api/singing/render` 文件交换接口保留，React 工作台不直接调用。

## SongProject 可选持久化字段速查

`mode='free'`、`creationRequestId`、`melodyDraft`、`songPlan`、`planning`、`rhythmCompletion`、`mixSettings`、`performanceHistory`、`vocalAssets`、`vocalHistory`、`singingRunner`、`instrumentMode`、`soundfont`、`instrumentPrograms`、`vocalMode`。均向后兼容：旧 JSON 无新字段仍可读，不自动改写音符。schemaVersion 恒为 1。

## 原型防坑：不存在或不应暴露的开关

- 百分比进度、任务持久化、跨进程断点恢复——没有，不做假。
- 声码器 steps/depth、模型选择/路由（P2-B 待排期）——前端不可调；模型由本机后台配置，密钥不出后端。
- ene/张力 tenc/换气声/voiceColor/phonemeEnvelope——v0.4.0 起经 `capabilities.unsupported` 如实标注，契约不收；气声（brec）、逐音素时序/发音已在 v0.4.0 真实支持，见上文演唱调教节。
- 效果链、声像、自动化、用户可调 LUFS 目标（P3 待排期）；服务端 MP4 已有固定目标 loudnorm / 实测报告，混响仍仅 0–0.25 一个发送量。
- 超 35 秒长歌曲、超过四段结构（P2-A 待排期）。
- AI 生图开关——画面是原创程序化 Canvas；VisualPlanner 为本地规则。
- 管理后台接口（/api/admin/*）不属于创作前端，不解限、不代理。

## Mock 覆盖现状

Mock 已定义 compose / melody / production 的固定夹具与阶段/失败/重试，未知接口返回 404，不会偷连真实后端；已有 plan/instrument/singing/export Mock 可用。新增 artifacts / loudness 端点及 groove 的真实事件效果尚无专用 Mock，不应把 Mock 参数透传当作真实 MIDI 人性化。Mock 歌声必须 `isDemo:true`，真实必须 `false`；真实模式拒绝 mock 标记响应与 Mock 缓存。新流程 Mock 扩展归 toge（[工单 5](../CC-Tasks/5-toge-free-creation.md)），pitch 曲线夹具当前不存在。
