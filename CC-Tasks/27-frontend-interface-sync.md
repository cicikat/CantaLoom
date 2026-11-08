# 工单 27：已交付接口与前端接线核对

Owner：Toge / Frontend & UX。状态：高级调教、历史演唱恢复、产物下载与报告的前端阶段已完成；可选 groove 跨层接线与真实共同验收仍未完成。
来源：2026-11-07 toge 转述红茶反馈：Git 同步后，前端仍缺少已交付功能。Git 内容一致不能作为页面接入验收。
范围：先接现有 P0/P1 Performance 字段、能力查询、Mock 与页面验证；保持 LOOP! 布局与折叠入口。不修改后端、音乐算法、公开请求/响应 Schema、工程模型或混音核心。toge 随后明确授权「一并补下载与报告」，限定扩展 Client / 导出用例与对应 Mock / 页面 / 测试；见[契约接线记录](../shared/contracts/CHANGELOG.md#frontend-interface-27)。
依赖：[接口清单](../docs/INTERFACES.md)、[工单 15 P1](后端/15-p0.md#p1-交接-toge接口schema示例与语义)、[工单 5](5-toge-free-creation.md)。

## 核对结果与应做

- [x] 对照文档、共享契约、Client、Mock、Hook 与实际挂载组件；区分已交付、未接线和仍为提案。
- [x] 接音符 Pitch 曲线、六项颤音、逐音素覆盖、句级 DYN / 表现曲线；查询能力后决定可用项，未知能力不能假设支持。
- [x] 补能力/音素 Mock；验证实际单句请求、兄弟句与伴奏保留、失败保护、锁定、恢复和保存重开。
- [x] 更新接口/架构/工单与迭代日志，完成本阶段本地提交。
- [x] 工单 19：分轨 MIDI/USTX/WAV 下载、分轨响度与 MP4 报告展示；按本轮明确授权接 Client / 导出用例，保持 Blob 调用兼容与失败保护。
工单 20/31 的 Groove 剩余前端接线已转入[工单 36 B](36-toge-backend-followup.md#groove-31)，本单不再重复维护该 checkbox。

## 历史核对边界（2026-11-07；当前待接见工单 36）

| 能力 | 本轮核实结果 |
|---|---|
| 原有制作、局部旋律、四项调教、分轨试听 | 已有页面入口与调用，旧验证仍有其范围限制 |
| P0/P1 高级表达 | 本轮补上控件、能力判定与 Mock；曲线用数值点编辑与控制点预览，未做拖拽曲线画笔。音素仅有整句平面列表，不猜测逐音符映射 |
| 工单 19 产物与报告 | 本轮已接 Client / Mock / 页面；逐轨文件与报告可操作，Mock 明确是夹具。真实资源未验 |
| 工单 20 groove | 可选 HTTP 字段已交付；工程、production 与浏览器均不自动传入；自由鼓型升级已在核心默认生效 |
| 模型路由 | 本机管理后台已有控件与调用；不能列为创作页缺控件 |
| 长歌、专业和声、MixGraph | 仍为待确认提案，不能列为已交付接口漏接 |
| synth 伴奏增益 | 音频核心未修复，前端按既有交接禁用；不宣称滑杆可用 |

## 验收与交接

沿用原单句渲染、工程保存与三版恢复。Mock 明确是夹具/测试音；真实模型、绮萱听感与真实 MP4 仍归[工单 6](6-joint-acceptance.md)。前端完成证据写入[迭代日志](../docs/iteration-log.md)。
已完成前端交接 `15-P1-review` / `19-artifact-report`，证据归入[本轮记录](../docs/iteration-log.md#frontend-interface-sync)，从待交接中清除；真实闭环继续工单 6。未完成的 `20-groove-render` / `5-C-synth-mix` 保留在[跨端交接](../CROSS-END-HANDOFF.md)。

验证：build、20 项定向单元/契约测试、6 项 Mock 页面用例通过（分轮执行；末次历史演唱恢复后高级调教用例再次通过）；真实模式 HTTP 导出夹具 1 项通过、真实 FFmpeg 1 项因本机不可用跳过。未验证真实 LLM / 绮萱 / FluidSynth / DAW / 人工听感。

新增交接：[27-phoneme-zero](../CROSS-END-HANDOFF.md#27-phoneme-zero)。首个音素仅设置 offsetMs=0、同时有非零句级 consonantMs 时，现有核心仍继承偏移；界面已说明，不把这项算作真实生效验收。最小复现与期望在交接中，未越界修算法。

2026-11-08 后续更新：[工单 31](已完成/31-production-groove-integration.md)已完成制作与工程参数、统一 FluidSynth 输入；页面/Mock/Client 制作类型及 Synth 仍由 Toge 按 20-groove-render 接入。上文为当时核对边界。

2026-11-08 回执：[工单 32](已完成/32-phoneme-explicit-zero.md)已修复首音素显式零偏移，并通过 USTX/依赖回归和真实绮萱 WAV/缓存对照。上文该项问题为历史状态；Toge 待移除原限制提示，沿用 27-phoneme-zero 交接，人工听评仍未执行。

2026-11-08 回执：[工单 33](已完成/33-browser-synth-band-gain.md)已修复 Synth 伴奏增益核心，并完成 PCM/WAV/PV 输入、真实 FluidSynth 与 MP4 编码回归。上文该核心缺口为历史状态；Toge 待解禁现有控件并回归页面，沿用 5-C-synth-mix，元音人声增益/混响和人工听评不在本次范围。

2026-11-08 后端回执：[工单 34](已完成/34-production-trace-contract.md)已提供表现规划五态、可选脱敏 trace 与可选错误码，GET/retry 使用显式公开投影；现有 Client 能通过共享 Schema 保留字段。Mock/页面展示仍由 Toge review，沿用 15-P2B-routing；本轮只有接口夹具验证，无真实模型调用。

2026-11-08 汇总：31–35 的剩余前端事项与唯一执行 checkbox 已转入[工单 36](36-toge-backend-followup.md)。本单保留既有接线证据，不授权接管其他后端范围。
