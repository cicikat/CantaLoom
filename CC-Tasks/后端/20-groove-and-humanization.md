# 工单 20：鼓组律动与演奏人性化

Owner：Blacktea / Backend & Music Engine。状态：后端/音乐核心实施完成，真实链路回归通过；人工听评待验收。
来源：2026-11-07 专业音乐人视角后端评审：鼓全曲单一 pattern（kick 1/3 拍、军鼓仅第 4 拍，无 backbeat、无 fill）、踩镲恒力度、全事件严格落网格、力度被 `velocity*(.5+energy*.5)` 压缩——`shared/free-score.mjs` `freeArrangement`。
范围：`shared/free-score.mjs`、`shared/midi.mjs`、`server/services/instruments.mjs` 缓存键，以及旧模式作曲器（`src/composer.ts` 六轨鼓点）是否共用同一节奏模块的对齐决策。不改 UI、不改锁定语义。
核心约束：**确定性**。所有人性化偏移必须由稳定种子（工程 ID + 轨道 ID + 版本 + 参数）驱动，同输入逐字节一致；种子与律动参数进入渲染输入 hash，缓存精准命中/失效。锁定/手写轨道数据不因此改动（AGENTS 数据保护 2/4）。

## 应做清单

- [x] 鼓 pattern 重写：backbeat（2、4 拍军鼓）为基础层；按段落 energy 分档（稀疏/标准/加花）；段落末小节自动生成 fill（确定性，随 energy 变化复杂度）；保留用户已录入底鼓落点与密度建议只补允许部分的既有语义。
- [x] 踩镲动态：强/弱拍力度分层，可选开镲点缀；避免恒力度 8 分/16 分 machine-gun。
- [x] Swing：可选律动参数（偶数 8 分后移量，tick 级整数），进 SongPlan 或渲染输入（字段走 CHANGELOG）；`shared/midi.mjs` 在 tick 层应用，不影响工程 beat 数据。
- [x] 演奏人性化：鼓以外轨道的 timing（±10–20 tick 级）与 velocity 抖动，种子化伪随机；人性化参数进入乐器渲染缓存 key。
- [x] 动态范围：取消 `.5+energy*.5` 的统一压缩，段落 energy 映射到更宽 velocity 区间（下限随段落可低至 .25 以下），保留上限防爆音。
- [x] 旧模式对齐：`src/composer.ts` 鼓点生成与自由模式共用模块或明确保持差异，结论写进工单；不借本单重构旧流程。
- [x] 测试：同输入 MIDI 逐字节一致（确定性回归）；不同 energy/swing 产生实际事件差异；真实 FluidSynth 渲染 WAV 差异与缓存命中回归（无引擎跳过）；锁定轨道渲染输入不变。

## 验收

同一工程在不同律动/能量参数下产出可区分的事件流与真实 WAV；同参数渲染缓存命中且字节一致；人性化开关前后锁定轨道数据逐字段不变；人工抽听确认 backbeat 与段落推进成立。完成记录写入 [迭代日志](../../docs/iteration-log.md)，注明本工单。

## 交接入口

swing/律动字段若进入 SongPlan 属共享契约，先写 [CHANGELOG](../../shared/contracts/CHANGELOG.md) 提案并登记 [CROSS-END-HANDOFF](../../CROSS-END-HANDOFF.md)；届时在本节补交接 ID。


## 2026-11-07 实施与边界

- 自由模式：独立纯模块 `shared/drum-pattern.mjs`，每小节 2/4 军鼓 backbeat；energy <.35 / <.7 / ≥.7 三档 kick、hat 与末小节 fill。踩镲按四分/八分/十六分位置区分力度，再以稳定种子作小幅变化；本轮不新增开镲 sound 枚举。
- TAP 使用原有 16 格量化和至少 4 次敲击判定，录入 kick 不被自动 kick 补齐或删除；补全关闭时只留下 TAP 底鼓。低能量动态映射改为 `.2+.8*energy`，鼓组单独 `.25+.75*energy`，低力度可小于 .25，鼓组上限 .92。
- 可选 `InstrumentInput.groove`：projectId、trackId、version 为稳定种子来源；swingTicks 0–120 整数、timingTicks 0–20 整数、velocityAmount 0–.2，后三项默认 0。swing 仅后移偶数八分音符；非鼓 timing/velocity 种子抖动，全部只在 MIDI tick 层应用，不改工程 beat。种子与参数经 Zod 进入 input hash，render revision=3。
- locked / manuallyEdited / 任一 notes[].locked 禁用整轨偏移；后端在 hash 前剔除该轨 groove，因此开关不使受保护轨道缓存失效。调用方须透传真实保护标记，不靠后端猜测。自由作曲器遇到同样保护直接返回原 notes 的副本。
- **旧模式明确保持差异**：已有 2/4 backbeat、TAP、风格节奏和保护测试，不在本单重构 `src/composer.ts` 或旧 guided 分支；自由模式原有调用点自然获得新鼓型。SongPlan / 工程 Schema 未增字段。
- 生产与浏览器当前不自动携带可选 groove，参数由 API/MIDI 调用方显式指定；UI 开关/Mock/保存接线需要后续跨层确认，未代改 Toge 文件。鼓组与 energy 则已在自由制作核心默认生效。
- 实测对照音在 `temp/task20/variant-0.wav`（直拍器乐）、`variant-1.wav`（swing+人性化）、`variant-2.wav`（低能量鼓组）、`variant-3.wav`（高能量鼓组）。真实引擎渲染、重复缓存与 PCM 差异断言通过，未作人工抽听。
- 交接 ID：[20-groove-render](../../CROSS-END-HANDOFF.md#20-groove-render)。结果与验证证据见[迭代日志](../../docs/iteration-log.md#groove-humanization-20)。实施清单完成不代表人工听感验收，暂不归档。

2026-11-08 后续更新：[工单 31](../../CC-Tasks/已完成/31-production-groove-integration.md)已完成制作与工程参数、统一 FluidSynth 输入；页面/Mock/Client 制作类型及 Synth 仍由 Toge 按 20-groove-render 接入。上文为当时核对边界。
