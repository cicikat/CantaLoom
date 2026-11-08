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
| [VIDEO-38](#video-38) | 工单 38 | 视频制作 Agent → Toge / 剪辑协作者 | 待真实录屏与授权配乐 |
| [35-ai-html-pv](#35-ai-html-pv) | 工单 35 | Blacktea → Toge | 后端/动态MP4已交付；页面/共验待接 |
| [27-phoneme-zero](#27-phoneme-zero) | 工单 27 / 15 P1 | Blacktea → Toge | 核心已修复；待 Toge 清理旧限制提示 |
| [24-test-review](#24-test-review) | 工单 24 | Blacktea → Toge | 测试审计交付；待浏览器测试语义 review |
| [5-C-synth-mix](#5-c-synth-mix) | 工单 5 C | Toge → Blacktea | 核心已修复；待 Toge 解禁 Synth 伴奏控件 |
| [20-groove-render](#20-groove-render) | 工单 20 | Blacktea → Toge | 核心/API 已实现；页面与人工听评待安排 |
| [15-P2A-contracts](#15-p2a-contracts) | 工单 15 P2-A | Blacktea → Toge | 等待本任务共享范围确认 |
| [15-P2B-routing](#15-p2b-routing) | 工单 15 P2-B | Blacktea → Toge | 后端已推送；等待接入 review 与安排 |
| [15-P3-mixgraph](#15-p3-mixgraph) | 工单 15 P3 | Blacktea → Toge | 等待共享契约及渲染归属确认 |
| [21-harmony-contracts](#21-harmony-contracts) | 工单 21 | Blacktea → Toge | 等待和声/拍号契约提案评审 |

以下后端分支与提交已推送，main 的交付范围以对应 PR 合并结果为准；待确认的 P2-A/P3 仍不构成实施授权。前端接线进度见[工单 5](CC-Tasks/5-toge-free-creation.md)与[工单 27](CC-Tasks/27-frontend-interface-sync.md)。

<a id="27-phoneme-zero"></a>

### 27-phoneme-zero · 核心已修复，待清理前端旧限制说明

- 2026-11-08 接收方执行入口：[工单36 · A1](CC-Tasks/36-toge-backend-followup.md#quick-fixes)。本轮31–35的前端剩余checkbox统一在36；用户已授权31–36统一推送PR合并，接收方开工需同步main核验d550b9c；下文“未推送”为历史阶段状态。完成后按36回执再关闭本ID。

- 更新：2026-11-08；[工单 32](CC-Tasks/已完成/32-phoneme-explicit-zero.md)由 Blacktea 完成；原 Toge → Blacktea 修复请求已回执，现 Blacktea → Toge 仅交接提示清理。
- 已交付：显式首音素 offsetMs:0 不再继承句级 consonantMs；USTX 必要时输出 offset:0；仅相关零覆盖更新歌声依赖/缓存 revision，其他句与器乐不变。源码及缓存边界见[契约记录](shared/contracts/CHANGELOG.md)，证据见[日志](docs/iteration-log.md#phoneme-explicit-zero-32)。本地 feature/backend-phoneme-explicit-zero，未推送。
- 验证：P1/P0/Qixuan 定向 20/20、全量 115 通过/8 外部验收跳过，真实绮萱三组 USTX/WAV 与重复缓存通过。未测音素起点、未做人工听评；非静音不作为时序或听感结论。
- Toge 下一步：移除音素表单“0 偏移可能被继承”的旧提示，按正式页面实际复核；完成后将证据回写工单 27/迭代日志，再删除本条与索引。此处保留是因为 UI 清理尚未完成，不是核心仍待修复。

<a id="24-test-review"></a>

### 24-test-review · 测试精简与运行方式

- 更新：2026-11-07；来源：[工单 24](CC-Tasks/已完成/24-test-system-audit.md)；Blacktea → Toge；本轮用户授权修改测试/必要 CI，不修改页面或音乐业务逻辑。
- 交付：Mock 浏览器 API 独立场景合入 A2 页面闭环，其 PCM/导入恢复/来源断言迁入，Node Mock/契约测试保留；TAP 虚拟时钟、完成响应闸门与失败截图统一配置。全部锁定/缓存/回滚/隔离/真实演唱场景保留。详见[审计证据](docs/iteration-log.md#test-system-audit)。
- 接收方：review 测试语义与新的[快速/真实验收入口](docs/TEAM_WORKFLOW.md#test-tiers)。默认浏览器不执行 4 项 @acceptance，真实验收显式设置 SONGYU_TEST_TIER=acceptance；Qixuan 工程输入由 SONGYU_ACCEPTANCE_PROJECT 指定，不再依赖某台机器路径。
- 边界：本轮不代表真实声库/模型、人工听感或手机/Safari 验收完成。回执后先留工单/日志证据，再移除此条。

<a id="5-c-synth-mix"></a>

### 5-C-synth-mix · 核心已修复，待前端解禁与回归

- 2026-11-08 接收方执行入口：[工单36 · A2/A3](CC-Tasks/36-toge-backend-followup.md#quick-fixes)。本轮31–35的前端剩余checkbox统一在36；用户已授权31–36统一推送PR合并，接收方开工需同步main核验d550b9c；下文“未推送”为历史阶段状态。完成后按36回执再关闭本ID。

- 更新：2026-11-08；[工单 33](CC-Tasks/已完成/33-browser-synth-band-gain.md)由 Blacktea 完成；本会话用户已确认限定共享音频范围。原 Toge → Blacktea 请求已回执，现 Blacktea → Toge 交接解禁。分支 feature/backend-synth-band-gain，本地提交，未推送。
- 已交付：renderAudio 内 Synth 器乐经独立 band bus，处理时应用既有 bandGain；人声仍走原路径，FluidSynth 沿用原增益且不重复。保留 enabled/default、stem/mute/单轨、dry 与峰值保护；WAV/PV 共用同一 PCM。
- 验证：Chromium PCM 夹具、实际 WAV/PV 入口透传、真实 FluidSynth 增益 0/1/2、真实 FFmpeg MP4 通过；证据见[日志](docs/iteration-log.md#synth-band-gain-33)。夹具不是实际声库听评，真实 MP4 编码不是正式页面全流程验收。
- Toge 下一步：在 MixControls 解除 Synth 伴奏音量禁用与旧说明，核对当前页面保存/重载、试听与导出；不要连带解禁元音演示的人声音量/混响。完成后先写工单 5/27 与日志证据，再删除本条和索引。
- 原表达锁元数据进入 singingDependency 的保守失效行为维持原策略，本单不改人声依赖。Groove 浏览器事件同步仍归工单 31 后续接线，真实制作/人工听感仍归工单 6。

<a id="15-p2a-contracts"></a>

### 15-P2A-contracts · 长歌共享范围确认

- 更新：2026-11-07；来源：[工单 15](CC-Tasks/后端/15-p0.md) P2-A；Blacktea → Toge；状态：等待确认，未授权继续跨层实现。
- 已交付：Kimi 的长歌草稿涉及 `SongPlan.structure`（role/bars/energy/repeatOf）、动态段落和歌词数量、长时间轴/导出边界及工程校验。草稿保存在本机 stash 与 `backup/cross-end-handoff-2026-11-07/`，未提交或推送；恢复方式见[本轮日志](docs/iteration-log.md#cross-end-handoff)。其他电脑无法直接读取该本地 stash。
- 对方下一步：确认具体字段、数量与时长边界、旧工程兼容策略，以及 `shared/`、`src/model.ts`、声明/Client/Mock 和相关跨层调用的本轮修改 Owner。数字与字段目前只是草稿提案，不能当作生效契约。
- 验收与回执：先在契约变更记录写清关联工单和明确确认范围，再由各自 Owner 实施；至少补 90 秒多段歌曲的真实生成/保存、MIDI/USTX/WAV/MP4 完整性、局部修改缓存稳定和失败恢复证据。曾通过的草稿夹具不代表这些验收完成；确认后本条更新为“已确认，待实施/验证”。

<a id="15-p2b-routing"></a>

### 15-P2B-routing · 模型路由后端交付

- 2026-11-08 接收方执行入口：[工单36 · C](CC-Tasks/36-toge-backend-followup.md#planning-trace)。本轮31–35的前端剩余checkbox统一在36；用户已授权31–36统一推送PR合并，接收方开工需同步main核验d550b9c；下文“未推送”为历史阶段状态。完成后按36回执再关闭本ID。

- 更新：2026-11-07；来源：[工单 15](CC-Tasks/后端/15-p0.md) P2-B；Blacktea → Toge；状态：后端已推送；等待接入 review 与安排。
- 已交付：已推送分支 `feature/backend-p1-phoneme` 的 `9718420` 提供 lyrics_planning / melody_composition / performance_planning，Admin 的 `LLM_ROUTES` 配置与 `GET /api/admin/llm` 脱敏追溯。未新增公共创作端点或共享工程字段；该实现通过 [PR #9](https://github.com/cicikat/CantaLoom/pull/9) 交付，页面接入仍需 Toge review。
- 2026-11-08 工单 34 续接：[制作追溯契约](CC-Tasks/已完成/34-production-trace-contract.md)后端/共享响应已完成；本会话用户确认限定范围。GET/retry 白名单序列化，新增可选 performancePlanning 与 PERFORMANCE_PLANNING_FAILED；现有 Client 共享 Zod 保留字段。分支 feature/backend-production-trace，本地提交，未推送；实际回归与夹具边界见[日志](docs/iteration-log.md#production-trace-34)。
- Toge 下一步：按[契约与夹具](docs/ARCHITECTURE.md#production)决定轻量状态/错误展示并补 Mock；disabled/skipped/无 trace 不伪装 LLM 调用，费用 null 显示未知，失败仍不进入演唱。没有新增 URL、路由设置或永久工程追溯；本条仍保留等前端 review/接线回执。
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



<a id="20-groove-render"></a>

### 20-groove-render · 可选器乐渲染律动

- 2026-11-08 接收方执行入口：[工单36 · B](CC-Tasks/36-toge-backend-followup.md#groove-31)。本轮31–35的前端剩余checkbox统一在36；用户已授权31–36统一推送PR合并，接收方开工需同步main核验d550b9c；下文“未推送”为历史阶段状态。完成后按36回执再关闭本ID。

- 更新：2026-11-07；来源：[工单 20](CC-Tasks/后端/20-groove-and-humanization.md)；Blacktea → Toge；状态：音乐核心/API 已实现，页面/Mock 与人工听评待安排。
- 已交付：自由模式新鼓组、TAP 保护、可选 groove 和保护标记契约；分支 feature/backend-music-quality-tickets，交付 [PR #10](https://github.com/cicikat/CantaLoom/pull/10)。本轮未修改 UI/Client/Mock/SongPlan/工程 Schema；字段与兼容边界见[契约记录](shared/contracts/CHANGELOG.md)及[接入说明](docs/ARCHITECTURE.md#groove-render)。
- 2026-11-08 工单 31 后端续接：限定跨层范围已由本会话用户明确确认；[工单 31](CC-Tasks/已完成/31-production-groove-integration.md)已接 productionInputSchema、SongProject.grooveSettings、生产与 external-audio 的统一输入。新提交在 feature/backend-production-groove（本地提交，未推送），验证见[日志](docs/iteration-log.md#production-groove-31)。
- Toge 下一步：Client 制作输入改用 ProductionInput；Mock 保留设置并显式标记夹具；页面只保存三参数；Synth 复用 shared/groove 的 performedNotes，并透传锁定/手工保护，核对预览与导出一致。不要将本轮真实 FluidSynth PCM 当作 Synth、真实 LLM/绮萱或人工听感验收。
- 对方下一步：需要开放 swing/人性化时，先确认保存/Client/Mock/production/浏览器预览与导出的统一参数来源和保护状态；不能只给服务端一次性参数，使浏览器重新渲染时丢失。按项目 ID、轨道 ID、版本构造稳定种子，不使用时间戳。
- 验收/回执：本机对照音在 temp/task20/，工单与迭代日志有客观验证；人工抽听 backbeat 与段落推进尚未执行。前端接线核对与当前缺口继续由[工单 27](CC-Tasks/27-frontend-interface-sync.md)维护，未因其他接口补接将本条标为完成。本条不构成代改前端的授权。


<a id="35-ai-html-pv"></a>

### 35-ai-html-pv · AI HTML PV 后端/共享渲染已交付，页面与共验待接

- 2026-11-08 接收方执行入口：[工单36 · D/E](CC-Tasks/36-toge-backend-followup.md#html-pv)。本轮31–35的前端剩余checkbox统一在36；用户已授权31–36统一推送PR合并，接收方开工需同步main核验d550b9c；下文“未推送”为历史阶段状态。完成后按36回执再关闭本ID。

- 更新 2026-11-08，Blacktea → Toge；本会话用户已确认限定范围。P0 `be95902`，P1/验收同 feature/backend-ai-html-pv 本地后续提交；未推送。工单：[35](CC-Tasks/后端/35-ai-html-pv.md)，[实际日志](docs/iteration-log.md#ai-html-pv-35)。
- 共享入口：shared/contracts/pv.mjs/.d.mts 的快照、PvDesign/PvResult、pvFingerprint；shared/pv-render.mjs 的 pvDocument。POST /api/pv/design 需显式配置 pv_design；GET /api/pv/status 是 Chromium 探测。完整字段、成功/失败/Mock夹具、HTML与旧PNG导出示例见[架构](docs/ARCHITECTURE.md#ai-html-pv)、[资源](docs/ENGINES.md#html-pv)、[测试夹具](tests/support/pv-fixture.mjs)。
- Toge 下一步：另行确认并接 SongProject 的设计/快照指纹存储与重开、统一Client/Mock、LOOP! #pv 可选按钮与状态；生成/应用/导出时投影当前工程并比对指纹，歌词或BPM变化使旧设计过期；iframe只给sandbox=allow-scripts，无allow-same-origin，父页仅给持有的frame发送cantaloom-pv-seek毫秒消息；共用runtime，不重写随机/动画算法。保持原Canvas默认与可选回退，不在制作后自动扣视觉Token。
- 导出：原/api/export旧四PNG/WAV不变；新HTML分支带visualMode、pvProject、pvDesign、inputFingerprint与同一renderAudio混音WAV，不带scenes，不再加ASS。400校验/失效、429占用、503资源缺失、500编码/预算失败；Blob/响度头保留，180s既有Client在本机77.7s基准内足够，复杂设计仍可能触发512MiB/170s预算。Mock设计必须source=mock/mock=true，不伪造trace或MP4。
- 资源/证据：temp/task35/preview-harness.html、ai-html-pv.mp4、两首设计JSON、render-report.json/frame-check.json；实际模型两次、新设计真实600帧MP4、seek字节稳定、活动歌词视频SSIM约0.9900、FFprobe、黑帧/完整解码、旧Canvas真实导出均通过。两秒采样进程树约1.22GB、临时帧454MB，仅为本机基准。音频是本地规则/元音演示，不是真实中文演唱。
- 未验边界：产品页面/工程保存接线、跨端字体差异、手机/Safari和人工观感尚未共同验收。请在工单35 P2/工单6留下实际前端证据后再关闭交接；不要因后端动态成片已产出宣布产品端到端完成。

<a id="video-38"></a>

### VIDEO-38 · 黑客松视频真实素材

- 更新时间：2026-11-08；来源：[工单 38](CC-Tasks/38-hackathon-mg-video.md)。发起方：视频制作 Agent；接收方：Toge / 黑客松剪辑协作者；状态：MG 工程交付后待提供素材。
- 交付：`feature/frontend-mg-demo-video` 的 [独立工程](video/mg/README.md)，102 秒时间轴与透明窗口；产物位于本机 `temp/mg-video/`，未上传远端。
- 下一步：按工程素材清单提供四段真实录屏及授权配乐，保留首尾余量，再做实际功能核对、音画同步与人工观感验收。
- 不涉及共享业务契约，不授权修改产品代码；回执与实际素材验证写回工单 38 和迭代日志。
