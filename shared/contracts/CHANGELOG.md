# 公共契约变更

## v0.2.1

- 汇总已有 health、器乐、绮萱、音频文件、导出、引擎/词典/导入契约；SongPlan 复用原 Schema。
- 新增可选 `mock:true` 开发标记（PlanResponse / Planning / VocalAsset），旧工程与真实响应无需增加字段。Mock VocalAsset 的 isDemo 为 true，真实资产仍为 false。
- HTTP 路径、成功数据含义、锁定和缓存规则保持不变。请求生命周期是客户端状态，不新增后台管理权限。
- MIDI 基础类型由 shared 拥有，前端 Note 只扩展 ID / syllable，消除 shared 到 src 的反向类型依赖；字段和运行时 MIDI 不变。

## 后续共享字段变更模板

在实现 PR 前提交一条提案，两人共同确认；下面的空白不是已经审批。

```text
状态：提案 / 双方已确认 / 已合并
Frontend reviewer：
Backend reviewer：
路径/Schema/字段：
新增、删除或语义变更：
旧工程与旧调用方兼容方式：
受影响的 UI / 服务 / Mock：
契约与回归测试：
关联 PR：
```

## v0.3 MelodyDraft / Performance（用户已统一确认，2026-11-05）

Owner 红茶；用户在本轮明确授权“由我统一确认，按工单实现契约”。不代表小由 UI 已接入。

新增 `melody.mjs` / `.d.mts` 与 POST `/api/melody`：intent、bpm、现有 songPlan、动态数量 phrases、可选 targetIds、source。空 text 表示请 LLM 原创歌词；非空 text 原样保护。phrase.locked 冻结整句；notes[].locked 冻结指定音符；只生成 targetIds，其他句逐字段保留。notes 使用绝对 beat，syllable 为单字或 `+` 连音，间隙表示休止。响应 draft.source 明确 llm / local-rules，附模型与 token/耗时记录，不返回 Key 或上游错误。

SongProject 新增可选 melodyDraft；Note 新增可选 locked；Lyric 新增可选 performance。旧 JSON 无需迁移。绮萱请求新增可选 performance；未提供时保留旧行为与旧缓存。新表现参数与音符锁定相关依赖只影响当前句，不改兄弟缓存。

小由接入：通过共享客户端 melody(request) 获取完整验证结果，再用 src/melody.ts 的 applyMelodyDraft 原子应用；按 phrase ID / note ID 操作锁定。只改表现可用 setPhrasePerformance，无需重作曲。natural/soft/strong 是内部 preset ID；UI 中文分别自然/轻柔/强烈。Mock 扩展由小由维护，本轮不改其文件。

验收：契约约束、歌词/音符对齐、锁定和局部生成、和声检查、失败原子性、旧缓存兼容、真实 LLM 与歌声实测；详细证据见 docs/V03_BACKEND.md。
