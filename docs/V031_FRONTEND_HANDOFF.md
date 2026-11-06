# v0.3.1 红茶 → toge接入交接

历史交接基线：origin/main `480c924`，分支 `feature/backend-free-composition`；当时只实现后端/音乐核心及授权共享字段，未修改 React、hooks、CSS、Mock、前端 E2E。该后端 PR #2 已合并，当前接线基于最新 main，并同时阅读 [v0.3.2 交接](V032_FRONTEND_HANDOFF.md)。当前待办统一见[接入计划](plans/free-creation-integration.md)，本文件保留 compose 接入方法。

## 唯一正式创作入口

`api.compose({intent,lyrics?,bpm?,targetSeconds?})` 对应 POST `/api/compose`，公共契约在 `shared/contracts/free-composition.mjs` / `.d.mts`。

- intent 自由描述，1–500 字；lyrics 可选数组，保留每一行所有字词，1–8 行、每行最多100字。未提供时由本次 LLM 作词。
- bpm 可选整数60–160，提供则严格保留，否则由本次规划选择。targetSeconds 20–30，默认25，时间轴按整小节取近似时长，但保持20–30秒。
- 响应包含 requestId、source=llm、model、input、plan（BPM / SongPlan / 原创或保留歌词 / 乐句时长权重）、sections、draft（MelodyDraft）。失败返回非2xx与通用 error，不返回可误用的半成品，不静默回退旧模板、本地规则或 Mock。
- 客户端超时290秒，含规划和旋律最多两次生成/校验；不要因等待就先替换当前工程。

```ts
import {api} from '../api/client';
import {projectFromComposition} from '../melody';
// 先保存当前操作代次；请求期间仍可取消/编辑，但完成时须核对代次。
const result = await api.compose({intent, lyrics: lines, bpm, targetSeconds:25});
const next = projectFromComposition(result);
// 仅在代次仍有效时一次 onChange(next)，沿用现有 change 停播/保存行为。
```

`projectFromComposition` 从本次规划和最终旋律建立同一个 SongProject，然后生成与和声匹配的伴奏。**不要再调用 applySongPlan/composeFromIdea**，否则会把旋律还原为旧局部规则；旧入口对 mode=free 明确拒绝。新项目仍 schemaVersion=1，增加 mode=free、style=自由创作、creationRequestId；旧 JSON 不迁移、不改已有音符。

`createFreeProject` 现在只是空自由工程壳（无模板歌词、无伴奏、无 SongPlan），适合未开始创作的输入状态；它不是正式生成完成的结果。正式结果使用 projectFromComposition。

## 单句编辑与重唱

1. 保留词重作曲：`const req=melodyRequest(project,intent,[lineId]); const result=await api.melody(req); applyMelodyDraft(latest,req,result.draft)`。不重应用宏观规划，不重生成无关伴奏。完成时仍需核对当前工程ID/操作代次。
2. 音符锁：写 `lyric.notes[].locked`；乐句锁写 `lyric.locked`，沿用人声轨锁定。服务校验锁定音符逐字段不变，非目标句不变。
3. 只调教：`setPhrasePerformance(project,lineId,{preset:'soft',...})`，保留全部音符，然后仅调用当前句重唱。复用已有 generateQixuan / applyVocalResult / 历史版本处理。
4. 编辑音符后更新该段 vocal 混音轨（syncVocal），不要重建所有句ID。编辑第二句时不要清空 vocalAssets；依赖校验会自然标记第二句过期，第一句缓存继续有效。

## 状态与 Mock

直接 compose 调用的 Client plan 状态表示一次请求 running/succeeded/failed；不提供它的独立逐阶段订阅。自动制作请使用 v0.3.2 的 production 创建/轮询接口取得真实阶段，不必为了已有轮询能力另造 SSE 协议，也不能用定时器假装阶段推进。管理接口继续仅本机访问。

toge需补 `/api/compose`、`/api/melody` Mock；现有 Mock 是关闭的路由列表，未知路由明确404，不会偷连真实后端。可用固定且显式 mock:true 的数据开发，但正式 api.compose 不接受把它当 llm 结果；需要同步响应 Mock 标记与 projectFromComposition 的开发分支协议。该扩展未由红茶代改。

现有管理面板“检查引擎”通过 /api/admin/check 的 engines 分支读取 qixuan / FluidSynth / FFmpeg / GPU 等状态。管理 API 保留本机 Host/Origin/CSRF/DPAPI 限制。禁止为查状态电脑操控 OpenUtau 或将后台暴露到公网；必要的新状态项由后端增加诊断接口。

## 最终验收依赖

红茶自动回归不等于新自由入口网页验收。历史工单2未随仓库保存，后续按[接入计划](plans/free-creation-integration.md)的 A–D 执行：从正式网页现场输入全新主题/歌词，不读取旧完成工程；分别验收首次真实生成与缓存命中、锁定续写、只调教重唱、全曲试听、MIDI/WAV/MP4、字幕同步及人工听感。

原交接机器输出路径为 `D:\ai\hacson\external\runtime\exports\v031-full-flow`，不是两人电脑都必须存在的目录。新验收记录实际资源根目录及产物位置；脚本可移植性仍待计划 B2 处理，不使用旧 A/B/C 音频冒充本次完整作品。
