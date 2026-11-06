# 工单 4：Blacktea · 接口交接与真实联调准备

Owner：Blacktea（红茶 / Backend / Music Engine）。状态：待实施。
来源：2026-11-06 原自由创作接入计划 B，保留 B1–B3 编号以便旧交接定位。
本次仅整理工单；清单不代表已经开工，也不扩大到前端代码的授权。

## 先读与边界

先读 [AGENTS](../AGENTS.md)、[团队工作流](../docs/TEAM_WORKFLOW.md)、[API 契约](../docs/ARCHITECTURE.md#public-api)和 [v0.3.2 交接](../docs/ARCHITECTURE.md#production)。
负责 server、引擎桥接、音乐核心、缓存、FFmpeg 及后端测试；不代改 Toge 的页面、hooks、Mock 和前端 E2E。共享字段先在 [契约记录](../shared/contracts/CHANGELOG.md)确认。

## 应做清单（原计划 B）

Owner：红茶。可与 A 并行，但不修改toge页面、hooks、Mock 或前端 E2E。

- [ ] **B1 接口交接材料**：提供符合共享契约、无密钥的成功/失败/任务状态示例及来源说明，由toge纳入 Mock；明确哪些是夹具、哪些来自实际调用。
- [ ] **B2 跨电脑可复现**：将实测工具的配置、缓存、输入/输出目录集中为可配置入口，核对 `tests/browser/qixuan.spec.ts`、`scripts/verify-*` 等历史绝对路径；记录前置工程生成顺序与复现命令。不得自动删除旧产物或移动配置。
- [ ] **B3 联调环境**：在有授权资源的 Windows 主机确认 LLM、FluidSynth、绮萱、FFmpeg 可用，提供公共 API 的 SSH 转发说明。管理后台保持仅本机；保存当前引擎版本及依赖说明。

B2 是待实现项；目前仅设置 `SONGYU_EXTERNAL_ROOT` 不会覆盖所有脚本中的写死路径。涉及共享配置/测试边界时仍按团队流程确认。

## 交给 Toge

每次交接提供字段/失败示例、实际调用与夹具的区别、复现命令、资源版本、结果及产物位置。Toge 按 [工单 5](5-toge-free-creation.md)补 Mock 和页面；两边就绪后按 [工单 6](6-joint-acceptance.md)共同验收。接口完成不能写成页面已接通。

## 完成与交接

完成一项后立即勾选本工单；在 [迭代日志](../docs/iteration-log.md) 顶部记录日期、实际结果、验证边界、工单及相关文档地址，再按范围本地提交。推送和 PR 按 [团队工作流](../docs/TEAM_WORKFLOW.md)及当前任务授权执行，不自动合并 main。
