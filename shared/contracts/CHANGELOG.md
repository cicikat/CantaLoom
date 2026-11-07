# 公共契约变更

## 2026-11-07 · A1 与 P0 合并兼容

- 本轮按 toge「推送」授权整合已完成的工单 5 与 main；仅解决相邻声明冲突，同时保留 A1 的可选 mock 标记与 P0 的 PitchPoint / pitchCurveSchema 声明。没有新增字段、修改约束或扩展调用语义；既有两项授权和说明保留。
- 交叉回归覆盖 Mock 来源隔离、P0 曲线/锁定、局部编辑与页面流程，实际结果见 [合并记录](../../docs/iteration-log.md#frontend-main-integration)。

## 工单 5 A1 · 自由创作 Mock 来源提案（2026-11-07）

状态：toge 已明确确认限定范围，A1 已实现并验证（2026-11-07），尚未推送。确认依据：本会话在审阅下列提案后回复「可以，继续做完」。
关联任务：[工单 5 A1](../../CC-Tasks/5-toge-free-creation.md)。Owner / Frontend reviewer：toge；Backend reviewer：未另行 review；本次按 toge 对下列限定范围的明确授权实施。

### 标记和工程来源

- 沿用已有 `mock:true`，不新增 `source=mock` 枚举，也不伪造模型用量。为 `FreeResult`、`MelodyResponse`、`MelodyDraft`、`ProductionJob` 增加可选 `mock?:true`，运行时 Zod 与相邻 `.d.mts` 同步；真实响应和旧工程无须补字段。
- Mock compose / production 的 composition 仍使用兼容的 `source:'llm'` 响应格式，但必须带 `mock:true` 和 `model:'mock-fixture-no-inference'`；这是模拟接口形状，不是实际调用证据。Mock draft 使用 `source:'local-rules', mock:true`，melody 响应外层同样带 `mock:true`。创建、轮询、失败和重试返回的 Mock job 都带该标记。
- `buildFreeScore` 只增加来源传递分支：Mock 结果写为 `planning.source:'local-rules', planning.mock:true`，保留 draft 的 Mock 标记；未提供手写歌词时，歌词来源写为 `local-template`，提供时仍为 `manual`。真实分支保持原有来源与全部音乐计算。
- Mock project 即使尚无歌声音频，也能依靠 `planning.mock` / `melodyDraft.mock` 被识别；测试歌声沿用 `mock:true, isDemo:true`。手写词、锁定和非目标句仍按现有校验保护。
- Client 校验前后拒绝真实模式收到的顶层及已知嵌套 Mock 标记，检查 job 的 project / composition、draft、planning 和歌声资产/历史，防止外层漏标或 Zod 剥离标记后误接收。Mock 模式的新三类响应要求显式标记。
- 工程导入及启动恢复沿用上述已知来源检查；真实模式拒绝 Mock 工程。继续使用隔离的 localStorage key、`.mock` 文件名和 JSON PV 回执。

### 限定改动范围与兼容

| 文件 / 调用点 | 本次已授权实施的变更 |
|---|---|
| `shared/contracts/free-composition.mjs` / `.d.mts` | 仅 FreeResult 可选 Mock 标记 |
| `shared/contracts/melody.mjs` / `.d.mts` | 仅 MelodyResponse / MelodyDraft 可选 Mock 标记，不改请求和音乐约束 |
| `shared/contracts/production.mjs` / `.d.mts` | 仅 ProductionJob 可选 Mock 标记，不改 state/stage 和任务语义 |
| `shared/free-score.mjs` | 仅 Mock 来源传递；不改伴奏、音符、时间轴或自动调教算法 |
| `src/api/client.ts` | 仅新 Mock 响应来源检查与真实模式拒收；沿用原有 API、超时、校验与错误保护 |
| `src/features/project/files.ts`、必要的前端来源检查 helper | 仅 Mock 工程导入/恢复隔离；不重写或删除已有存档 |
| `src/api/mock.ts`、必要的前端 Mock helper 与前端测试 | compose / melody / production 的本地固定数据、任务状态及重试；未知路由继续 404 |

不修改 server、真实 LLM / 声库 / 桥接、`src/melody.ts`、`src/model.ts` 或音乐算法。不接 A2 新页面、调教控件或混音控件，不推送或部署。

### 验证与交接

- 契约保留 Mock 标记，真实响应与旧工程继续通过，Mock 工程应用/保存/恢复后不变成真实 LLM 来源。
- compose 保留 1–8 行手写歌词；melody 保留非目标句、锁定及手写内容；测试数据也走既有音乐校验，不放宽约束。
- production 覆盖创建、处理中、成功、失败、404/任务丢失与单句重试，重试保留已完成资产；故障场景通过仅测试端可控入口选择，不往真实请求新增字段。
- 真实 Client 拒绝顶层/嵌套 Mock 数据；Mock 全流程不调用网络、引擎或后台；测试音明确标记。
- build、30 项相关定向测试和 3 项 Mock 页面/浏览器回归通过；结果已写回工单与迭代日志。A1 完成不代表 A2 页面接通、真实引擎或人工听感验收。
- 示例由前端依据已核对契约编写并标注为夹具；红茶实际调用示例与环境仍跟踪[工单 4](../../CC-Tasks/4-blacktea-integration.md)。关联 PR：未创建。

2026-11-06 文档说明：下文 v0.3–v0.3.2 的授权是对应历史任务记录，不适用于新字段或新任务；本次只整理说明，未修改任何 Schema、类型、Client 或 Mock。现行流程见[团队工作流](../../docs/TEAM_WORKFLOW.md)，当前缺口见[Toge 工单](../../CC-Tasks/5-toge-free-creation.md)。

## v0.4.0 逐音素与高级人声表现（工单 15 P1）

- 状态：工单授权范围内实施，后端已本地提交（分支 `feature/backend-p1-phoneme`，待推送合并 main）。
- 关联计划/任务与 Owner：[15 · 后端音乐制作升级 P1](../../CC-Tasks/后端/15-p0.md)，Owner Blacktea。工单交付清单明确「音素编辑：新增 PhonemeEdit 契约及能力查询」「调声/Pitch 编辑：扩展 Performance、Note 契约及应用函数」。
- Frontend reviewer：toge（待 PR）；Backend reviewer：Blacktea。
- 路径/Schema/字段：
  - `shared/contracts/melody.mjs`：`performanceSchema.overrides[]` 新增可选 `vibratoLength`（0–100）、`vibratoPeriod`（5–500）、`vibratoIn` / `vibratoOut`（0–100，含默认合计 ≤100）、`vibratoDrift`（±100）、`vibratoVolLink`（±100）与 `phonemes`（`phonemeEditSchema`：index 0–15，`offsetMs` ±300 与 `phoneme` 1–20 字至少其一，每音符 ≤8 条且位置唯一）；`performanceSchema` 新增可选 `dynCurve`（2–64 点，x=句首相对毫秒，y=−240–120 即 0.1 dB）与 `curves`（`expressionCurveSchema`：abbr ∈ brec/voic/genc/velc/pexp/shfc，points 2–64 严格递增，y 限各描述符范围，abbr 唯一）。相邻 `.d.mts` 新增 `PhonemeEdit` / `CurvePoint` / `ExpressionAbbr` / `ExpressionCurve` 类型与 `phonemeEditSchema` / `dynCurveSchema` / `expressionCurveSchema` / `curveRanges` 声明。
  - `shared/contracts/index.mjs`：`qixuanStatusSchema` 可用分支新增可选 `capabilities`（curves 八项布尔、phonemeOverride、unsupported 清单）；`qixuanResultSchema` 新增可选 `phonemes`（真实音素序列，桥接报告原有字段透传）。
- 新增、删除或语义变更：仅新增可选字段。音素 offsetMs 按 BPM 换算 USTX tick；phoneme 替换经服务端按声库四份音素词表交集预校验，非法在渲染前明确报错。velc/pexp 为渲染器建议表达，生成 USTX 时显式写入描述符。`dynCurve` 提供时整体替换自动 DYN；各曲线覆盖范围外回落引擎默认值。ene/tenc/换气声/voiceColor/phonemeEnvelope 明确不支持，不进入契约。
- 旧工程与旧调用方兼容方式：全部字段可选，旧 JSON 无需迁移；不含新字段的 Performance 生成的 USTX、依赖串与缓存键逐字节同 v0.3.3（单元回归锁定）。capabilities/phonemes 可选，旧客户端忽略。
- 受影响的 UI / 服务 / Mock：`notePerformance` / `performanceCurves`（shared/performance.mjs）映射新参数；`server/services/qixuan.mjs` 解析声库能力、音素预校验与 USTX 描述符；无新 HTTP 端点。Mock 不返回 capabilities/phonemes/新调教字段，扩展归 toge。
- Mock 示例提供人 / 实现人 / 待接入 PR：本任务提供真实请求/响应示例（见工单 P1 交接节）；Mock 与页面接入待 toge PR。
- 契约与回归测试：`tests/p1-phoneme.test.ts`（Schema、USTX 映射、精准失效、能力解析）、`tests/qixuan-p1-real.test.mjs`（真实引擎十组参数 WAV 对照、非法音素拒绝）；既有 `tests/p0-tuning.test.ts` 与 `tests/qixuan-real.test.mjs` 保持通过。
- 关联 PR：本地分支 `feature/backend-p1-phoneme`（未推送）；P0（v0.3.3）已随 `ed3c652` 快进合并 main。

## v0.3.3 可编辑 Pitch 曲线（工单 15-p0）

- 状态：工单授权范围内实施，已随 `ed3c652` 快进合并 main（2026-11-07）。
- 关联计划/任务与 Owner：[15 · 后端音乐制作升级 P0](../../CC-Tasks/后端/15-p0.md)，Owner Blacktea。工单交付清单明确「调声/Pitch 编辑：扩展 Performance、Note 契约及应用函数」。
- Frontend reviewer：toge（待 PR）；Backend reviewer：Blacktea。
- 路径/Schema/字段：`shared/contracts/melody.mjs` 的 `performanceSchema.overrides[]` 新增可选 `pitch`；新增 `pitchPointSchema` / `pitchCurveSchema`；相邻 `.d.mts` 新增 `PitchPoint` 类型与两个常量声明。
- 新增、删除或语义变更：仅新增可选字段。`pitch` 为单音符 Pitch 曲线：x=相对音符的毫秒（-500–30000）、y=十分之一半音整数（±1200）、shape=io/i/o/l，2–64 个按 x 严格递增的点；提供时替换该音符的自动过渡点并以 snap_first=false 进入 USTX，不影响其他音符、DYN 曲线与颤音。
- 旧工程与旧调用方兼容方式：字段可选，旧 JSON 无需迁移；不含 pitch 的演唱依赖串、缓存键与渲染结果保持原值。
- 受影响的 UI / 服务 / Mock：USTX 渲染（`notePerformance` → server 绮萱与 `openUtauProject` 导出）、演唱依赖（`resolvePerformance` 自动包含 pitch）；无新 HTTP 端点，单句重唱复用 `POST /api/singing/qixuan/render`。Mock 当前不返回 pitch，扩展归 toge。
- Mock 示例提供人 / 实现人 / 待接入 PR：本任务提供真实请求/响应示例（见工单交接节）；Mock 与页面接入待 toge PR。
- 契约与回归测试：`tests/p0-tuning.test.ts`（Schema、USTX 映射、精准失效）、`tests/qixuan-real.test.mjs`（真实引擎缓存/PCM 差异）、`tests/browser/p0-resing.spec.ts`（真实混音验收）。
- 关联 PR：分支 `feature/backend-p0-fine-tuning`，已快进合并 main（`ed3c652`）。

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
