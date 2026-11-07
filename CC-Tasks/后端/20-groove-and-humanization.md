# 工单 20：鼓组律动与演奏人性化

Owner：Blacktea / Backend & Music Engine。状态：待实施。
来源：2026-11-07 专业音乐人视角后端评审：鼓全曲单一 pattern（kick 1/3 拍、军鼓仅第 4 拍，无 backbeat、无 fill）、踩镲恒力度、全事件严格落网格、力度被 `velocity*(.5+energy*.5)` 压缩——`shared/free-score.mjs` `freeArrangement`。
范围：`shared/free-score.mjs`、`shared/midi.mjs`、`server/services/instruments.mjs` 缓存键，以及旧模式作曲器（`src/composer.ts` 六轨鼓点）是否共用同一节奏模块的对齐决策。不改 UI、不改锁定语义。
核心约束：**确定性**。所有人性化偏移必须由稳定种子（工程 ID + 轨道 ID + 版本 + 参数）驱动，同输入逐字节一致；种子与律动参数进入渲染输入 hash，缓存精准命中/失效。锁定/手写轨道数据不因此改动（AGENTS 数据保护 2/4）。

## 应做清单

- [ ] 鼓 pattern 重写：backbeat（2、4 拍军鼓）为基础层；按段落 energy 分档（稀疏/标准/加花）；段落末小节自动生成 fill（确定性，随 energy 变化复杂度）；保留用户已录入底鼓落点与密度建议只补允许部分的既有语义。
- [ ] 踩镲动态：强/弱拍力度分层，可选开镲点缀；避免恒力度 8 分/16 分 machine-gun。
- [ ] Swing：可选律动参数（偶数 8 分后移量，tick 级整数），进 SongPlan 或渲染输入（字段走 CHANGELOG）；`shared/midi.mjs` 在 tick 层应用，不影响工程 beat 数据。
- [ ] 演奏人性化：鼓以外轨道的 timing（±10–20 tick 级）与 velocity 抖动，种子化伪随机；人性化参数进入乐器渲染缓存 key。
- [ ] 动态范围：取消 `.5+energy*.5` 的统一压缩，段落 energy 映射到更宽 velocity 区间（下限随段落可低至 .25 以下），保留上限防爆音。
- [ ] 旧模式对齐：`src/composer.ts` 鼓点生成与自由模式共用模块或明确保持差异，结论写进工单；不借本单重构旧流程。
- [ ] 测试：同输入 MIDI 逐字节一致（确定性回归）；不同 energy/swing 产生实际事件差异；真实 FluidSynth 渲染 WAV 差异与缓存命中回归（无引擎跳过）；锁定轨道渲染输入不变。

## 验收

同一工程在不同律动/能量参数下产出可区分的事件流与真实 WAV；同参数渲染缓存命中且字节一致；人性化开关前后锁定轨道数据逐字段不变；人工抽听确认 backbeat 与段落推进成立。完成记录写入 [迭代日志](../../docs/iteration-log.md)，注明本工单。

## 交接入口

swing/律动字段若进入 SongPlan 属共享契约，先写 [CHANGELOG](../../shared/contracts/CHANGELOG.md) 提案并登记 [CROSS-END-HANDOFF](../../CROSS-END-HANDOFF.md)；届时在本节补交接 ID。
