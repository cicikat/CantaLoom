# 工单 30：织声机 CantaLoom 更名与 PR 整合

Owner：Blacktea（本轮用户明确授权跨端品牌文案更新及未合并 PR 合并）。
状态：已完成；2026-11-08。
范围：审核并整合 PR 12 / 14；统一当前产品名称、启动入口、界面、文档与导出署名。不扩大到音乐算法或交互改版。
依赖：工单 24、27、29 的既有交付；保留真实引擎与人工验收边界。

## 应做

- [x] 检查工作区及 origin/main，整合 PR 12 的测试审计与 main 后台字段修复。
- [x] 整合 PR 14 的前端场景与工单 24 测试稳定性调整，保留双方记录与未完成交接。
- [x] 当前品牌改为织声机 CantaLoom，新增打开织声机启动文件，旧入口兼容。
- [x] 新工程下载使用 .cantaloom.json，保留旧 JSON 导入及 localStorage 数据。
- [x] 构建、单元、Mock、快速浏览器及启动/真实导出回归。
- [x] 更新迭代日志与 README，提交推送并合并 main。

## 验收与交接

验收入口：[README](../../README.md)、[迭代日志](../../docs/iteration-log.md#cantaloom-brand-integration)。
兼容入口：SONGYU_* 环境变量、旧存档键、HTTP 头与已安装 SongyuBridge 保留；历史工单与证据不全局重写。
原有跨端待办继续由 [交接登记](../../CROSS-END-HANDOFF.md)跟进，本轮不宣称真实 LLM、歌声与人工听感通过。
