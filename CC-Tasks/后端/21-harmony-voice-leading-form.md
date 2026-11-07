# 工单 21：和声词汇、声部连接、贝斯织体与拍号速度（契约提案）

Owner：Blacktea 起草；涉及共享契约，需双方或 Toge 明确授权后实施。状态：待排期（契约提案待评审）。
来源：2026-11-07 专业音乐人视角后端评审（锐评 P1 项）：和声仅 4 个级内三和弦循环、无转位/七和弦/副属、无 voice leading、贝斯永远根音、拍号与单 tempo 三处硬编码（`shared/midi.mjs`、`server/services/qixuan.mjs`、`shared/free-score.mjs`）、`validateMelody` 拒绝一切调外音。
与既有工单关系：本单是[工单 15 P2-A](15-p0.md)「扩展和声、配器、节奏型」的音乐性细案与契约提案，**不复制 15 的 checkbox**；实施顺序、字段边界以 [15-P2A-contracts](../../CROSS-END-HANDOFF.md#15-p2a-contracts) 确认结果与本单提案授权为准。曲式结构（自由段落/长歌）仍归 15 P2-A，不在本单。

## 提案清单（授权前不实施）

- [ ] 和声 schema：`chordProgression` 由「4 个级数」扩展为每小节 1–2 个和弦，支持 7/9/sus/add、转位（低音指定）、副属/借用标记；`scaleClasses`/`chordClasses`（shared/melody.mjs、shared/free-score.mjs）同步扩展，枚举只在共享契约定义。
- [ ] 旋律校验放宽弱拍：非强拍允许经过音/辅助音等规则化调外音（邻音解决方向校验），强拍和弦音约束保留；锁定音符保护语义不变。
- [ ] 声部连接：keys/guitar 和弦 voicing 采用最小移动（上一和弦音到下一和弦最近可用音），替代逐小节封闭位置硬跳。
- [ ] 贝斯织体：root-five、walking、pedal 至少三档，按 energy/风格选择，替代全曲根音长音。
- [ ] 拍号与速度：工程拍号支持 3/4、6/8，分段 tempo map；统一消除三处 4/4 与单 tempo 硬编码，事件仍以 beat 保存、换算规则不变。
- [ ] 流程留痕：先在 [CHANGELOG](../../shared/contracts/CHANGELOG.md) 写字段、兼容性、调用点与测试说明，经授权后实施；历史授权不延伸到本单。

## 验收（授权后细化）

至少真实生成并保存：含七和弦与转位进行的工程、3/4 拍工程，端到端通过规划→旋律校验→渲染→导出；旧工程导入不改写既有数据；`validateMelody` 对合法经过音放行、对错误强拍仍拒绝。完成记录写入 [迭代日志](../../docs/iteration-log.md)，注明本工单与 15 P2-A。

## 交接入口

[21-harmony-contracts](../../CROSS-END-HANDOFF.md#21-harmony-contracts)：等待 Toge/双方评审契约提案（与 15-P2A-contracts 一并处理）。
