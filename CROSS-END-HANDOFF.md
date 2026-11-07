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
| [5-C-synth-mix](#5-c-synth-mix) | 工单 5 C | Toge → Blacktea | 前端已接；浏览器伴奏增益核心待接手 |
| [15-P1-review](#15-p1-review) | 工单 15 P1 | Blacktea → Toge | 等待接口 review；实现尚在本地分支 |
| [15-P2A-contracts](#15-p2a-contracts) | 工单 15 P2-A | Blacktea → Toge | 等待本任务共享范围确认 |
| [15-P2B-routing](#15-p2b-routing) | 工单 15 P2-B | Blacktea → Toge | 等待后端交付 review 与接入安排 |
| [15-P3-mixgraph](#15-p3-mixgraph) | 工单 15 P3 | Blacktea → Toge | 等待共享契约及渲染归属确认 |

以下分支、提交与实测说明来自本轮已核对的本地交付记录，不代表这些实现已在 main 或已发布。当前 main 的前端 Mock/局部编辑进度以[工单 5](CC-Tasks/5-toge-free-creation.md)为准。

<a id="5-c-synth-mix"></a>

### 5-C-synth-mix · 浏览器伴奏增益与前端接线边界

- 更新：2026-11-07；来源：[工单 5 C](CC-Tasks/5-toge-free-creation.md#c局部编辑与调教)；Toge → Blacktea；状态：等待音乐核心接手。toge 明确选择「只接前端，核心问题交接红茶」，本条不授权前端修改混音核心。
- 已交付：`feature/frontend-free-creation-mock` 本轮调教/混音前端提交（主题 `feat: connect phrase expression and supported mix controls`）。默认折叠的句级/音符级调教、锁定/历史、现有单句重唱、四种 stem 试听与 mixSettings 持久化；证据见[迭代日志](docs/iteration-log.md#expression-mix-controls)。没有修改公开 Schema / Client / `src/audio.ts` / `src/audio-mix.ts`。
- 已定位：`src/audio.ts` 的 addWav/processed 分支给 FluidSynth 应用 bandGain，但浏览器 synth 直接 schedule 到 master，未应用 bandGain；元音演示亦未接 vocalBus。默认 Mock 自由制作的伴奏是 synth，直接开放伴奏滑杆会无效。前端当前仅在 fluidsynth 启用伴奏音量；人声音量/混响仅在 external 启用；有明确禁用说明，不自动切引擎。
- 对方下一步：在共同混音边界内确认并修复 synth 的伴奏增益路径，保持静音/独奏、现有 stem、WAV/PV、旧工程 enabled 默认和未处理干人声语义；提供实际 PCM/导出回归后回执，前端再解除相应禁用。顺带核对表达锁元数据进入 singingDependency 导致锁切换保守失效的预期；本轮按既有依赖处理，不伪造音频有效性。
- 验收与回执：前端已验证 external 人声增益归零、混响 PCM 变化、FluidSynth Mock 两路归零后 WAV 与 PV 输入静音；这些是测试音，不是实际 FluidSynth/绮萱引擎验收。真实资源、制作闭环和人工听感继续[工单 6](CC-Tasks/6-joint-acceptance.md)。完成后证据写回工单/迭代日志，再移除本条。

<a id="15-p1-review"></a>

### 15-P1-review · 逐音素与高级表现接口

- 更新：2026-11-07；来源：[工单 15](CC-Tasks/后端/15-p0.md) P1；Blacktea → Toge；状态：等待接口 review。
- 已交付：本地 `feature/backend-p1-phoneme` 的 `d00548b` 提供 phonemes 覆盖、颤音参数、dynCurve/表现曲线、能力查询；本地记录已有真实引擎 WAV 对照。本次文档任务未重跑引擎，也未将该提交合入 main。
- 对方下一步：review 新 Performance 字段与 capabilities/phonemes 语义，确定 Mock 与调教界面的接入范围；UI 只能开放安装声库实际支持的参数。完整字段、示例及真实测试边界见该分支工单 15 的“P1 交接 Toge”节与契约记录。
- 边界与回执：共享契约 review 不自动授权代改对方 UI。对应实现进入可访问的后端交付 PR 后补 PR 链接；接收方在本条写明 review 结论，再按工单 5/6 分别记录 Mock、真实联调和听感结果。

<a id="15-p2a-contracts"></a>

### 15-P2A-contracts · 长歌共享范围确认

- 更新：2026-11-07；来源：[工单 15](CC-Tasks/后端/15-p0.md) P2-A；Blacktea → Toge；状态：等待确认，未授权继续跨层实现。
- 已交付：Kimi 的长歌草稿涉及 `SongPlan.structure`（role/bars/energy/repeatOf）、动态段落和歌词数量、长时间轴/导出边界及工程校验。草稿保存在本机 stash 与 `backup/cross-end-handoff-2026-11-07/`，未提交或推送；恢复方式见[本轮日志](docs/iteration-log.md#cross-end-handoff)。其他电脑无法直接读取该本地 stash。
- 对方下一步：确认具体字段、数量与时长边界、旧工程兼容策略，以及 `shared/`、`src/model.ts`、声明/Client/Mock 和相关跨层调用的本轮修改 Owner。数字与字段目前只是草稿提案，不能当作生效契约。
- 验收与回执：先在契约变更记录写清关联工单和明确确认范围，再由各自 Owner 实施；至少补 90 秒多段歌曲的真实生成/保存、MIDI/USTX/WAV/MP4 完整性、局部修改缓存稳定和失败恢复证据。曾通过的草稿夹具不代表这些验收完成；确认后本条更新为“已确认，待实施/验证”。

<a id="15-p2b-routing"></a>

### 15-P2B-routing · 模型路由后端交付

- 更新：2026-11-07；来源：[工单 15](CC-Tasks/后端/15-p0.md) P2-B；Blacktea → Toge；状态：等待后端交付 review 与接入安排。
- 已交付：本地分支 `feature/backend-p1-phoneme` 的 `9718420` 提供 lyrics_planning / melody_composition / performance_planning，Admin 的 `LLM_ROUTES` 配置与 `GET /api/admin/llm` 脱敏追溯。未新增公共创作端点或共享工程字段；该实现未随本次文档 PR 发布。
- 对方下一步：确定是否及如何接入后台路由控件和任务追溯；如需将追溯写入工程，另提共享契约确认。不要把当前进程最近 100 次记录当作持久化工程历史；未配置单价或费用未知时显示未知。
- 验收与回执：已交付分支的独立快照记录为构建通过、72 项通过/3 项跳过，真实三任务使用不同模型 ID 的调用 1/1 通过；这些是前一轮证据，本轮只做文档验证。review 后补可访问的后端 PR、Mock/页面接入工单及实际验证结果；不把模型输出成功标为页面、真实歌声或人工听感通过。

<a id="15-p3-mixgraph"></a>

### 15-P3-mixgraph · 混音契约与统一音频入口

- 更新：2026-11-07；来源：[工单 15](CC-Tasks/后端/15-p0.md) P3；Blacktea → Toge；状态：等待设计与跨层确认，未实施。
- 对方下一步：双方确定 MixGraph / EffectChain / Automation 的字段、版本、效果器顺序/旁路、轨道音量/声像及参数自动化，以及 `src/audio.ts` / `src/audio-mix.ts` 试听和导出的统一渲染归属；明确本轮 Owner 与调用点。
- 验收与回执：确认记录进入契约变更记录后再实施；补保存恢复、试听/离线一致性、真实分轨导出、LUFS 与 True Peak 的达标或无法达标报告。仅后端能力或现有 Web Audio 参数不能提前标作 P3 完成。
