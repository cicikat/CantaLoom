# 工单 34：制作任务表现规划追溯与安全响应契约

Owner：Blacktea / Backend & Music Engine；共享响应 Schema、Client、Mock 后续由 Toge review。
状态：后端与共享响应阶段已完成（2026-11-08），Mock/页面轻量展示交 Toge review。原始基线：2026-11-08 远端 `main` 静态核对；本地未推送分支实施前复核。
来源：[工单 15 P2-B](../后端/15-p0.md)已交付 task routing、后台配置/追溯；[工单 27](../27-frontend-interface-sync.md)确认创作任务追溯入口尚未完整对齐。

## 问题定义

`server/services/production.mjs` 在配置 `performance_planning` 时产生 `job.performanceTrace`，失败时内部持有 `failureContext`；`GET /api/production/:id` 目前直接 `res.json(job)`，但 `shared/contracts/production.mjs` 的 `productionJobSchema` 没有声明 performanceTrace，`src/api/client.ts` 的 Zod 解析会剥离该未知字段。生产端有追溯，公共契约没有稳定、最小、安全的形状。

## 目标与范围

为已有 `GET /api/production/:id` 提供可消费的表现规划状态与脱敏追溯。**不是重做模型路由**，不新增管理后台设置，不要求创作首页展示完整模型费用分析，不引入工程级永久追溯或新数据库。任务重启后可查、缓存 LRU、并发池等属于[工单 22](../后端/22-backend-production-ops.md)。

## 唯一应做清单

- [x] 在 `shared/contracts/CHANGELOG.md` 提出最小可选返回字段，并给出 TS 声明、请求/响应及错误示例。建议 `performancePlanning?: {status:'disabled'|'running'|'succeeded'|'failed'|'skipped', trace?: {provider,model,promptVersion,attempts,promptTokens,completionTokens,milliseconds,cost,costCurrency}}`；最终枚举/字段须与现有 router trace 实际结构核对，不照抄猜测。
- [x] 明确 disabled（未启用路由）、skipped（已启用但没有可规划句）、succeeded、failed；无 trace 不假装跑过 LLM；失败仍保持现有全任务失败、不进入演唱的语义。
- [x] 对生产 job 添加**显式公开响应序列化**，不再直接暴露内部 `input`、`failureContext`、环境引用、原始提示词、上游响应体或任何密钥。现有必要的 `id/state/stage/project/composition/phraseId/completedPhrases/error` 必须保留，且成功结果应用与单句 retry 不退化。
- [x] 如增加稳定错误码（例如 `PERFORMANCE_PLANNING_FAILED`），以可选字段向后兼容，不移除已有中文 `error`、HTTP status、`state/stage`；后台已有的任务路由记录继续保持原隔离/脱敏边界。
- [x] 更新 `productionJobSchema` 与相邻 `.d.mts`；提供供 Toge 后续扩展 Client / Mock 的最小示例。未获前端 Owner 确认，不改 React、Hook 或 Mock。
- [x] 单元/HTTP 测试覆盖未配置、成功、失败、全锁定跳过、trace 可选、敏感字段不可序列化、旧客户端兼容、失败工程保留。真实模型调用只在显式开启和有资源环境下验收。

## 示例（接口形状夹具，非真实调用）

`GET /api/production/:id` 保持既有结果结构，额外返回：

```json
{
  "id":"00000000-0000-4000-8000-000000000001",
  "state":"succeeded",
  "stage":"ready-for-mix",
  "performancePlanning":{
    "status":"succeeded",
    "trace":{
      "provider":"configured-provider",
      "model":"configured-model",
      "promptVersion":"performance_planning/1/0123456789abcdef",
      "attempts":1,
      "promptTokens":300,
      "completionTokens":200,
      "milliseconds":2500,
      "cost":null,
      "costCurrency":null
    }
  }
}
```

示例为契约形状，不是实际调用数据。若未配置表现规划，应写 `status:'disabled'`，不填虚构的模型/Token。公开字段不得包含 baseUrl、keyRef、systemPrompt、Authorization、原始请求/模型响应或 stack trace。

## 验收

后端响应可被声明的 Schema 正确解析；无密钥/提示词泄漏；真实/Mock 标记兼容；已有制作应用、失败重试和管理后台路由不变。若未实测模型，只验接口夹具并标注范围。

## 交接入口

仍沿用 [15-P2B-routing](../../CROSS-END-HANDOFF.md#15-p2b-routing) 的后续前端 review，必要时更新交接内容；前端只需显示轻量状态/错误与可选追溯，不复制整个 Admin 路由配置。测试与实际交付回写[迭代日志](../../docs/iteration-log.md)，实际端到端验收仍归[工单 6](../6-joint-acceptance.md)。


## 2026-11-08 交付与边界

- 用户在本会话针对具体共享响应/序列化范围回复「确认上述限定范围」后实施。公开性能 trace Schema/声明按实际 router 成功字段定义，仅 succeeded 可带 trace；失效/未知追溯不伪造或从全局历史串取。
- 新增显式 serializeProductionJob，GET 和 retry 统一使用；保留必要的工程/作曲结果、Mock 标记及现有错误/重试语义。根级 input/failureContext/performanceTrace 与未知内部字段不公开；composition.input 沿用已有创作输入契约。前序阶段可无新增状态，进入表现规划后区分 disabled/running/succeeded/skipped/failed。
- 规划失败保留当前谱面与原中文错误，新增可选 PERFORMANCE_PLANNING_FAILED；不进入器乐/演唱，也不能用 retry 绕过。旧字段与旧响应继续兼容，现有 Client 的共享 Zod 解析能够保留新字段，无需改 Client 代码；未改 Mock/UI/Hook。
- 验证命令、数字与日志见[迭代日志](../../docs/iteration-log.md#production-trace-34)，请求、响应和错误夹具见[架构](../../docs/ARCHITECTURE.md#production)。全部模型输出为显式测试夹具，未调用真实上游，不把接口验证当作真实模型/声库/人工听感验收。
- 交接 ID：[15-P2B-routing](../../CROSS-END-HANDOFF.md#15-p2b-routing)：Toge 后续接 Mock 场景与轻量状态/费用未知提示；不是新增后台配置或永久工程历史。工单 22 的持久化/并发不在本单范围。
- 本地分支 feature/backend-production-trace，未推送；原有两个脚本删除与 BACKEND-EXECUTION-NOTE.md 保留。

工单 34 序列化补充：project.vocalAssets 仅返回既有 VocalAsset 工程字段，剔除引擎返回的 sourceProject 绝对缓存路径与额外诊断，保留 dependency/voice/renderParameters 与成功应用/单句重试所需数据。内部资产不修改。

2026-11-08 前端汇总：本单剩余 Toge 接线/提示清理及页面验证统一在[工单 36](../36-toge-backend-followup.md)维护 checkbox；沿用原交接 ID，本文保留后端历史证据，不复制前端清单。
