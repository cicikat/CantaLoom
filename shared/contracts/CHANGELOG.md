# 公共契约变更

2026-11-06 文档说明：下文 v0.3–v0.3.2 的授权是对应历史任务记录，不适用于新字段或新任务；本次只整理说明，未修改任何 Schema、类型、Client 或 Mock。现行流程见[团队工作流](../../docs/TEAM_WORKFLOW.md)，当前缺口见[Toge 工单](../../CC-Tasks/5-toge-free-creation.md)。

## v0.2.1

- 汇总已有 health、器乐、绮萱、音频文件、导出、引擎/词典/导入契约；SongPlan 复用原 Schema。
- 新增可选 `mock:true` 开发标记（PlanResponse / Planning / VocalAsset），旧工程与真实响应无需增加字段。Mock VocalAsset 的 isDemo 为 true，真实资产仍为 false。
- HTTP 路径、成功数据含义、锁定和缓存规则保持不变。请求生命周期是客户端状态，不新增后台管理权限。
- MIDI 基础类型由 shared 拥有，前端 Note 只扩展 ID / syllable，消除 shared 到 src 的反向类型依赖；字段和运行时 MIDI 不变。

## 后续共享字段变更模板

在实现 PR 前提交一条提案，两人共同确认；下面的空白不是已经审批。

```text
状态：提案 / 双方已确认 / 已合并
关联计划/任务与 Owner：
Frontend reviewer：
Backend reviewer：
确认依据：双方 review / toge 对本任务范围的明确授权（记录范围，不推定批准）
路径/Schema/字段：
新增、删除或语义变更：
旧工程与旧调用方兼容方式：
受影响的 UI / 服务 / Mock：
Mock 示例提供人 / 实现人 / 待接入 PR：
契约与回归测试：
关联 PR：
```

## v0.3 MelodyDraft / Performance（用户已统一确认，2026-11-05）

Owner 红茶；用户在本轮明确授权“由我统一确认，按工单实现契约”。不代表toge UI 已接入。

新增 `melody.mjs` / `.d.mts` 与 POST `/api/melody`：intent、bpm、现有 songPlan、动态数量 phrases、可选 targetIds、source。空 text 表示请 LLM 原创歌词；非空 text 原样保护。phrase.locked 冻结整句；notes[].locked 冻结指定音符；只生成 targetIds，其他句逐字段保留。notes 使用绝对 beat，syllable 为单字或 `+` 连音，间隙表示休止。响应 draft.source 明确 llm / local-rules，附模型与 token/耗时记录，不返回 Key 或上游错误。

SongProject 新增可选 melodyDraft；Note 新增可选 locked；Lyric 新增可选 performance。旧 JSON 无需迁移。绮萱请求新增可选 performance；未提供时保留旧行为与旧缓存。新表现参数与音符锁定相关依赖只影响当前句，不改兄弟缓存。

toge接入：通过共享客户端 melody(request) 获取完整验证结果，再用 src/melody.ts 的 applyMelodyDraft 原子应用；按 phrase ID / note ID 操作锁定。只改表现可用 setPhrasePerformance，无需重作曲。natural/soft/strong 是内部 preset ID；UI 中文分别自然/轻柔/强烈。Mock 扩展由toge维护，本轮不改其文件。

验收：契约约束、歌词/音符对齐、锁定和局部生成、和声检查、失败原子性、旧缓存兼容、真实 LLM 与歌声实测；详细证据见[动态旋律迭代记录](../../docs/iteration-log.md#v03-backend)。

## v0.3.1 自由创作（历史工单2授权记录）

原工单2未随本仓库保存；此处保留当时授权记录，现行接入方法与验收条件以下方交接及当前计划为准。
新增 POST /api/compose，输入 intent、可选 lyrics[]、bpm、targetSeconds；响应为一次事务完成的宏观规划、分配时间轴和 MelodyDraft，含 requestId/model 来源。新工程 mode=free/style=自由创作，不从旧模板初始化。旧模式不迁移不改音符。前端接入与 Mock 属于toge，见[自由创作接入](../../docs/ARCHITECTURE.md#composition)。

## v0.3.2（历史工单3及当时授权记录）

原工单3未随本仓库保存；历史授权不延伸为后续修改许可。此阶段后端已合并，前端/Mock与共同验收仍见当前计划。
Performance 增加可选 mode=auto/manual、energy、locked、逐音符 overrides；无新字段仍走旧参数映射。SongProject 增加可选混音设置和调教历史。共享类型/校验/客户端由红茶维护，UI/Mock 仍交接toge。新增制作任务接口复用 compose、FluidSynth、绮萱无窗口桥接；ready-for-mix 不表示浏览器导出完成。主题为创作意图而非歌词原文，允许自由歌体。
