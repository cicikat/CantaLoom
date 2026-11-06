# 工单 5：Toge · 自由创作 Mock、页面与局部编辑

Owner：Toge（toge / Frontend / UX）。状态：待实施。
来源：2026-11-06 原自由创作接入计划 A、C；保留 A1/A2 编号。先完成最小流程，再接编辑器。
本次仅整理工单；清单不代表已经开工，也不授权修改真实 LLM、作曲算法或引擎。

## 先读与现状

先读 [AGENTS](../AGENTS.md)、[团队工作流](../docs/TEAM_WORKFLOW.md)、[API 契约](../docs/API_CONTRACT.md)和 [v0.3.1](../docs/V031_FRONTEND_HANDOFF.md) / [v0.3.2](../docs/V032_FRONTEND_HANDOFF.md)交接。
接口材料与联调环境由 Blacktea 按 [工单 4](4-blacktea-integration.md)交付；共享字段仍须确认。

- compose、melody、production API 及统一 Client 已在代码中；`src/melody.ts` 有结果应用、局部旋律、调教和历史逻辑，`src/audio.ts` 有统一分轨渲染。
- `src/hooks/useStudio.ts` 仍走 `composeFromIdea`；`src/api/mock.ts` 没有新三类接口，未知路径返回 404。现有 Mock 测试覆盖旧工作台。
- [v0.3.2 后端报告](../docs/iteration-log.md#v032)记录真实后端制作、浏览器加载工程试听/导出；正式新页面从输入开始的流程和人工听感未验收。
- 本次没有重跑历史测试或检查外部模型/音频产物，不把报告当成本机当前状态。历史工单 2/3 不在本仓库，不补造其内容或复用编号；后续按本工单与现存交接执行。

## A：Mock 与最小页面流程

Owner：toge；红茶配合确认接口。先做 A1，再做 A2；不把完整编辑器当作最小流程的前置条件。

- [ ] **A1 新流程 Mock**：扩展现有 transport，覆盖 compose、melody、production 创建/轮询/重试；固定数据与测试音显式标记，未知路径继续失败，不连接真实模型。覆盖成功、处理中、失败、任务丢失、局部重试。
- [ ] **A1 共享确认**：双方先在[契约记录](../shared/contracts/CHANGELOG.md)确认 Mock 标记与工程来源处理。真实 `freeResultSchema.source=llm`，不能把测试结果记成真实生成成功；必要字段改动同步运行时、声明、Client 与测试。
- [ ] **A2 最小页面接线**：自由主题/可选手写歌词 → `startProduction` → 轮询实际 state/stage → 校验完整 project → 一次应用 → 试听。处理失败、404、离开页面或编辑导致结果过期；保留原工程，不显示伪造百分比。
- [ ] **A2 页面测试**：没有后端时完成上述交互；验证新旧存档隔离、错误保留工程与过期结果不覆盖。页面/Mock 完成不勾选真实验收。

接入说明：[v0.3.2 交接](../docs/V032_FRONTEND_HANDOFF.md)。`ready-for-mix` 只表示资产就绪，浏览器仍需混音/导出。直接 compose 模式应用 `projectFromComposition`，不能调用旧 `applySongPlan/composeFromIdea` 覆盖新旋律。

## C：局部编辑与调教

Owner：toge；音乐算法/服务问题交红茶，字段变化双方确认。A 的最小流程完成后推进。

- [ ] 钢琴卷帘展示/编辑音符音高、位置、长度，保持稳定 ID 和歌词对齐；支持句锁、音符锁，修改顺序后核对逐音符 overrides 索引。
- [ ] 接 `melodyRequest` / `api.melody` / `applyMelodyDraft`，验证只改目标句、手写词与锁定音符保留、无关音频不失效。
- [ ] 接 Auto/Manual、自然/轻柔/强烈、人工覆盖、表达锁及最多三版恢复；只改表达后仅重唱该句。
- [ ] 接干声/处理人声/伴奏/全混音试听及必要混音控件，沿用 `renderAudio` 与原导出链路。
- [ ] 补相应 Mock 与页面测试；参数只暴露真实支持的能力。

## 验收边界

页面/Mock 完成后按 [工单 6](6-joint-acceptance.md)共同验收。Mock 页面、真实引擎、正式新页面闭环和人工听感分别记录；不提前勾选真实验收。

## 完成与交接

完成一项后立即勾选本工单；在 [迭代日志](../docs/iteration-log.md) 顶部记录日期、实际结果、验证边界、工单及相关文档地址，再按范围本地提交。推送和 PR 按 [团队工作流](../docs/TEAM_WORKFLOW.md)及当前任务授权执行，不自动合并 main。
