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
| [20-groove-render](#20-groove-render) | 工单 20 | Blacktea → Toge | 核心/API 已实现；页面与人工听评待安排 |
| [15-P1-review](#15-p1-review) | 工单 15 P1 | Blacktea → Toge | 后端已推送；等待接口接入 review |
| [15-P2A-contracts](#15-p2a-contracts) | 工单 15 P2-A | Blacktea → Toge | 等待本任务共享范围确认 |
| [15-P2B-routing](#15-p2b-routing) | 工单 15 P2-B | Blacktea → Toge | 后端已推送；等待接入 review 与安排 |
| [5-browser-timing](#5-browser-timing) | 工单 5 页面回归 | Blacktea → Toge | 待核对高负载下的测试时序稳定性 |
| [15-P3-mixgraph](#15-p3-mixgraph) | 工单 15 P3 | Blacktea → Toge | 等待共享契约及渲染归属确认 |
| [21-harmony-contracts](#21-harmony-contracts) | 工单 21 | Blacktea → Toge | 等待和声/拍号契约提案评审 |

以下后端分支与提交已推送，main 的交付范围以对应 PR 合并结果为准；待确认的 P2-A/P3 仍不构成实施授权。当前 main 的前端 Mock/局部编辑进度以[工单 5](CC-Tasks/5-toge-free-creation.md)为准。

<a id="15-p1-review"></a>

### 15-P1-review · 逐音素与高级表现接口

- 更新：2026-11-07；来源：[工单 15](CC-Tasks/后端/15-p0.md) P1；Blacktea → Toge；状态：等待接口 review。
- 已交付：已推送分支 `feature/backend-p1-phoneme` 的 `d00548b` 提供 phonemes 覆盖、颤音参数、dynCurve/表现曲线、能力查询；已有真实引擎 WAV 对照；本轮与最新 main 整合后重新运行真实音频回归，两项通过。
- 对方下一步：review 新 Performance 字段与 capabilities/phonemes 语义，确定 Mock 与调教界面的接入范围；UI 只能开放安装声库实际支持的参数。完整字段、示例及真实测试边界见该分支工单 15 的“P1 交接 Toge”节与契约记录。
- 边界与回执：共享契约 review 不自动授权代改对方 UI。后端交付见 [PR #9](https://github.com/cicikat/CantaLoom/pull/9)；接收方在本条写明 review 结论，再按工单 5/6 分别记录 Mock、真实联调和听感结果。

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


<a id="19-artifact-report"></a>

### 19-artifact-report · 产物与响度接入

- 更新：2026-11-07；来源：[工单 19](CC-Tasks/后端/19-render-quality-and-artifacts.md)；Blacktea → Toge；状态：后端已实现，页面展示待安排。
- 交付：`feature/backend-music-quality-tickets` 的只读 artifact 下载/分轨 ebur128 接口、MP4 `X-Songyu-Loudness` 报告，详见[架构说明](docs/ARCHITECTURE.md#创作产物与响度报告工单-19)，交付 [PR #10](https://github.com/cicikat/CantaLoom/pull/10)。UI 不在本轮范围；后续交付仅纳入已存在的 Mock 采样率单行兼容修改。
- 对方下一步：按需接下载/报告入口；确认 DAW 导入 MIDI 与实际作品听感。后端真实渲染/浏览器混音证据见工单与迭代日志，不代替人耳和设备验收。


<a id="20-groove-render"></a>

### 20-groove-render · 可选器乐渲染律动

- 更新：2026-11-07；来源：[工单 20](CC-Tasks/后端/20-groove-and-humanization.md)；Blacktea → Toge；状态：音乐核心/API 已实现，页面/Mock 与人工听评待安排。
- 已交付：自由模式新鼓组、TAP 保护、可选 groove 和保护标记契约；分支 feature/backend-music-quality-tickets，交付 [PR #10](https://github.com/cicikat/CantaLoom/pull/10)。本轮未修改 UI/Client/Mock/SongPlan/工程 Schema；字段与兼容边界见[契约记录](shared/contracts/CHANGELOG.md)及[接入说明](docs/ARCHITECTURE.md#groove-render)。
- 对方下一步：需要开放 swing/人性化时，先确认保存/Client/Mock/production/浏览器预览与导出的统一参数来源和保护状态；不能只给服务端一次性参数，使浏览器重新渲染时丢失。按项目 ID、轨道 ID、版本构造稳定种子，不使用时间戳。
- 验收/回执：本机对照音在 temp/task20/，工单与迭代日志有客观验证；人工抽听 backbeat 与段落推进尚未执行。本条不构成代改前端的授权。
