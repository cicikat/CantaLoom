# 跨端交接

只保存需要对方接手、确认或配合验证的未完成交接。执行计划与 checkbox 仍在原工单，完成证据仍在[迭代日志](docs/iteration-log.md)。这里登记的待办不构成跨区授权。

按需读取：本文件不作为 Agent 启动必读或自动注入内容。处理跨端事项时，先用 `rg -n '交接 ID|工单号|接收方|模块名' CROSS-END-HANDOFF.md` 定位，只读取有关条目；无关任务不读取全文。

## 维护方式

发现需要对方完成的接线、契约确认、环境准备或联调事项时，发起方 Agent 在本轮提交前主动新增或更新条目，同时在原工单留下交接 ID 和链接；不等用户另行提醒。同一事项沿用 ID，不能在多处复制另一套应做 checkbox。

接收方更新状态及具体确认范围；共享字段仍先走 `shared/contracts/CHANGELOG.md` 的提案和确认流程。完成需写入原工单与迭代日志的实际结果、证据和边界，然后默认删除本文件的对应条目及索引行。需要短暂保留给对方核实时，标注“已完成”、完成日期及证据链接，在下一次交接整理时移除。已确认但尚未实施或验证的条目不能当作已完成删除。

条目至少包含：ID、更新时间、来源工单、发起方、接收方、状态、已交付内容及其所在分支/提交、对方下一步、涉及契约/文件、验收与回执入口。用工单号和主题命名稳定 ID；不复用已关闭 ID。

## 待交接索引

| ID | 来源 | 发起方 → 接收方 | 状态 |
|---|---|---|---|
| [27-phoneme-zero](#27-phoneme-zero) | 工单 27 / 15 P1 | Toge → Blacktea | 首个音素 0 毫秒覆盖可能继承辅音偏移，核心待修复 |
| [5-C-synth-mix](#5-c-synth-mix) | 工单 5 C | Toge → Blacktea | 前端已接；浏览器伴奏增益核心待接手 |
| [20-groove-render](#20-groove-render) | 工单 20 | Blacktea → Toge | 核心/API 已实现；页面与人工听评待安排 |
| [15-P2A-contracts](#15-p2a-contracts) | 工单 15 P2-A | Blacktea → Toge | 等待本任务共享范围确认 |
| [15-P2B-routing](#15-p2b-routing) | 工单 15 P2-B | Blacktea → Toge | 后端已推送；等待接入 review 与安排 |
| [5-browser-timing](#5-browser-timing) | 工单 5 页面回归 | Blacktea → Toge | 待核对高负载下的测试时序稳定性 |
| [15-P3-mixgraph](#15-p3-mixgraph) | 工单 15 P3 | Blacktea → Toge | 等待共享契约及渲染归属确认 |
| [21-harmony-contracts](#21-harmony-contracts) | 工单 21 | Blacktea → Toge | 等待和声/拍号契约提案评审 |

以下后端分支与提交已推送，main 的交付范围以对应 PR 合并结果为准；待确认的 P2-A/P3 仍不构成实施授权。前端接线进度见[工单 5](CC-Tasks/5-toge-free-creation.md)与[工单 27](CC-Tasks/27-frontend-interface-sync.md)。

<a id="27-phoneme-zero"></a>

### 27-phoneme-zero · 首个音素显式零偏移仍继承辅音时机

- 更新：2026-11-07；来源：[工单 27](CC-Tasks/27-frontend-interface-sync.md)、[工单 15 P1](CC-Tasks/后端/15-p0.md)；Toge → Blacktea；状态：已复现，核心待修复。本轮不修改共享音乐计算。
- 证据：`shared/performance.mjs` 的 `notePerformance` 先以 truthy 的 `offsetMs` 生成 offset，再过滤掉无 offset/phoneme 的条目，导致 `{index:0,offsetMs:0}` 消失；后续非零 consonantMs 再插入第 0 音素。不是前端丢参数。
- 最小复现：`notePerformance([{beat:0,duration:1,midi:60,syllable:'甲'}],0,120,{preset:'natural',consonantMs:12,overrides:[{index:0,phonemes:[{index:0,offsetMs:0}]}]}).phoneme_overrides` 实际返回 `[{index:0,offset:12}]`，预期显式 0 不继承句级偏移。现有测试仅覆盖 0 位替换发音、无句级偏移的其他位置 offset=0，没有覆盖该组合。
- 对方下一步：修复显式 0 的存在性判断/合并顺序，兼容旧 consonantMs 与不带覆盖的历史依赖；补该组合回归，并核对实际 USTX/演唱结果。前端已在音素表单提示此边界，不自行改算法。
- 验收/回执：结果回写本工单与[迭代日志](docs/iteration-log.md#frontend-interface-sync)，完成后通知前端移除限制说明，再清除此条。

<a id="5-c-synth-mix"></a>

### 5-C-synth-mix · 浏览器伴奏增益与前端接线边界

- 更新：2026-11-07；来源：[工单 5 C](CC-Tasks/5-toge-free-creation.md#c局部编辑与调教)；Toge → Blacktea；状态：等待音乐核心接手。toge 明确选择「只接前端，核心问题交接红茶」，本条不授权前端修改混音核心。
- 已交付：`feature/frontend-free-creation-mock` 本轮调教/混音前端提交（主题 `feat: connect phrase expression and supported mix controls`）。默认折叠的句级/音符级调教、锁定/历史、现有单句重唱、四种 stem 试听与 mixSettings 持久化；证据见[迭代日志](docs/iteration-log.md#expression-mix-controls)。没有修改公开 Schema / Client / `src/audio.ts` / `src/audio-mix.ts`。
- 已定位：`src/audio.ts` 的 addWav/processed 分支给 FluidSynth 应用 bandGain，但浏览器 synth 直接 schedule 到 master，未应用 bandGain；元音演示亦未接 vocalBus。默认 Mock 自由制作的伴奏是 synth，直接开放伴奏滑杆会无效。前端当前仅在 fluidsynth 启用伴奏音量；人声音量/混响仅在 external 启用；有明确禁用说明，不自动切引擎。
- 对方下一步：在共同混音边界内确认并修复 synth 的伴奏增益路径，保持静音/独奏、现有 stem、WAV/PV、旧工程 enabled 默认和未处理干人声语义；提供实际 PCM/导出回归后回执，前端再解除相应禁用。顺带核对表达锁元数据进入 singingDependency 导致锁切换保守失效的预期；本轮按既有依赖处理，不伪造音频有效性。
- 验收与回执：前端已验证 external 人声增益归零、混响 PCM 变化、FluidSynth Mock 两路归零后 WAV 与 PV 输入静音；这些是测试音，不是实际 FluidSynth/绮萱引擎验收。真实资源、制作闭环和人工听感继续[工单 6](CC-Tasks/6-joint-acceptance.md)。完成后证据写回工单/迭代日志，再移除本条。

<a id="15-p2a-contracts"></a>

### 15-P2A-contracts · 长歌共享范围确认

- 更新：2026-11-07；来源：[工单 15](CC-Tasks/后端/15-p0.md) P2-A；Blacktea → Toge；状态：等待确认，未授权继续跨层实现。
- 已交付：Kimi 的长歌草稿涉及 `SongPlan.structure`（role/bars/energy/repeatOf）、动态段落和歌词数量、长时间轴/导出边界及工程校验。草稿保存在本机 stash 与 `backup/cross-end-handoff-2026-11-07/`，未提交或推送；恢复方式见[本轮日志](docs/iteration-log.md#cross-end-handoff)。其他电脑无法直接读取该本地 stash。
- 对方下一步：确认具体字段、数量与时长边界、旧工程兼容策略，以及 `shared/`、`src/model.ts`、声明/Client/Mock 和相关跨层调用的本轮修改 Owner。数字与字段目前只是草稿提案，不能当作生效契约。
- 验收与回执：先在契约变更记录写清关联工单和明确确认范围，再由各自 Owner 实施；至少补 90 秒多段歌曲的真实生成/保存、MIDI/USTX/WAV/MP4 完整性、局部修改缓存稳定和失败恢复证据。曾通过的草稿夹具不代表这些验收完成；确认后本条更新为“已确认，待实施/验证”。

<a id="15-p2b-routing"></a>

### 15-P2B-routing · 模型路由后端交付

- 更新：2026-11-07；来源：[工单 15](CC-Tasks/后端/15-p0.md) P2-B；Blacktea → Toge；状态：后端已推送；等待接入 review 与安排。
- 已交付：已推送分支 `feature/backend-p1-phoneme` 的 `9718420` 提供 lyrics_planning / melody_composition / performance_planning，Admin 的 `LLM_ROUTES` 配置与 `GET /api/admin/llm` 脱敏追溯。未新增公共创作端点或共享工程字段；该实现通过 [PR #9](https://github.com/cicikat/CantaLoom/pull/9) 交付，页面接入仍需 Toge review。
- 对方下一步：确定是否及如何接入后台路由控件和任务追溯；如需将追溯写入工程，另提共享契约确认。不要把当前进程最近 100 次记录当作持久化工程历史；未配置单价或费用未知时显示未知。
- 验收与回执：已交付分支的独立快照记录为构建通过、72 项通过/3 项跳过，真实三任务使用不同模型 ID 的调用 1/1 通过；这些是前一轮路由证据；本轮整合的回归结果另记迭代日志。review 后补 Mock/页面接入工单及实际验证结果；不把模型输出成功标为页面、真实歌声或人工听感通过。

<a id="15-p3-mixgraph"></a>

### 15-P3-mixgraph · 混音契约与统一音频入口

- 更新：2026-11-07；来源：[工单 15](CC-Tasks/后端/15-p0.md) P3；Blacktea → Toge；状态：等待设计与跨层确认，未实施。
- 对方下一步：双方确定 MixGraph / EffectChain / Automation 的字段、版本、效果器顺序/旁路、轨道音量/声像及参数自动化，以及 `src/audio.ts` / `src/audio-mix.ts` 试听和导出的统一渲染归属；明确本轮 Owner 与调用点。
- 验收与回执：确认记录进入契约变更记录后再实施；补保存恢复、试听/离线一致性、真实分轨导出、LUFS 与 True Peak 的达标或无法达标报告。仅后端能力或现有 Web Audio 参数不能提前标作 P3 完成。


<a id="21-harmony-contracts"></a>

### 21-harmony-contracts · 和声/拍号契约提案评审

- 更新：2026-11-07；来源：[工单 21](CC-Tasks/后端/21-harmony-voice-leading-form.md)；Blacktea → Toge；状态：等待提案评审，未授权实施。
- 已交付：工单 21 的音乐性契约提案（每小节 1–2 和弦与 7/9/sus/add/转位/副属、弱拍经过音放行、voice leading、贝斯织体分档、3/4 与 6/8 拍号及分段 tempo map），仅文档，无代码改动。
- 对方下一步：与 [15-P2A-contracts](#15-p2a-contracts) 一并评审对 SongPlan 字段与旧工程兼容的影响（chordProgression 结构变化、validateMelody 弱拍放宽、三处 4/4 硬编码统一）；确认后先在 shared/contracts/CHANGELOG.md 写清关联工单与授权范围，再由 Owner 实施。
- 验收与回执：见工单 21 验收节；本条目不构成跨区授权，工单 15/19/20/22 的实施也不以本条为前置。

<a id="5-browser-timing"></a>

### 5-browser-timing · 页面测试的高负载时序稳定性

- 更新：2026-11-07；来源：[工单 5](CC-Tasks/5-toge-free-creation.md)；Blacktea → Toge；状态：待核对测试稳定性，不代表低负载下功能失败。
- 证据：本轮真实音频与页面并行回归时，Mock 的 LOOP tap 检查期望 BPM >90，实际 76；未改动的 main 7bee0eb 同一检查也失败（89）。低负载串行重跑该用例 1/1 通过。无 API 播放检查首跑在 5 秒内未见暂停按钮，main 基线及本分支串行重跑均通过。
- 对方下一步：核对浏览器测试对真实墙钟点击间隔和异步离线混音的依赖；区分机器负载影响与产品行为，评估可重复的节奏输入/播放器就绪等待策略，不靠放宽断言掩盖节奏错误。涉及 tests/browser/mock.spec.ts 与 tests/browser/plan.spec.ts，本轮后端交付未改这些文件。
- 验收与回执：在工单 5 记录测试环境、复现和稳定性验证，完整功能断言仍需保留；完成后按维护规则清除此条及索引。原始日志保存在本机 temp/backend-p1-p2b-mock.log、temp/backend-p1-p2b-http.log、temp/baseline-loop-tap.log 及对应 retry 日志。


<a id="20-groove-render"></a>

### 20-groove-render · 可选器乐渲染律动

- 更新：2026-11-07；来源：[工单 20](CC-Tasks/后端/20-groove-and-humanization.md)；Blacktea → Toge；状态：音乐核心/API 已实现，页面/Mock 与人工听评待安排。
- 已交付：自由模式新鼓组、TAP 保护、可选 groove 和保护标记契约；分支 feature/backend-music-quality-tickets，交付 [PR #10](https://github.com/cicikat/CantaLoom/pull/10)。本轮未修改 UI/Client/Mock/SongPlan/工程 Schema；字段与兼容边界见[契约记录](shared/contracts/CHANGELOG.md)及[接入说明](docs/ARCHITECTURE.md#groove-render)。
- 对方下一步：需要开放 swing/人性化时，先确认保存/Client/Mock/production/浏览器预览与导出的统一参数来源和保护状态；不能只给服务端一次性参数，使浏览器重新渲染时丢失。按项目 ID、轨道 ID、版本构造稳定种子，不使用时间戳。
- 验收/回执：本机对照音在 temp/task20/，工单与迭代日志有客观验证；人工抽听 backbeat 与段落推进尚未执行。前端接线核对与当前缺口继续由[工单 27](CC-Tasks/27-frontend-interface-sync.md)维护，未因其他接口补接将本条标为完成。本条不构成代改前端的授权。
