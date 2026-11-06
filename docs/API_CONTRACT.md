# SONGYU 公共 API（含 v0.3.2 后端能力）

2026-11-06 按源码核对；本次未运行接口。基础契约在 `shared/contracts/index.mjs`，自由作曲/旋律/制作分别在同目录 `free-composition.mjs`、`melody.mjs`、`production.mjs`，TypeScript 声明在相邻 `.d.mts`。SongPlan 只使用 `shared/song-plan.mjs`。业务 JSON 请求统一 `Content-Type: application/json`，HTTP 错误为非 2xx + `{error:string}`；已受理的制作任务也可能在后续 200 响应中返回 state=failed。契约只含公共音乐数据，不含后台设置或密钥。接口存在不代表新页面/Mock已接通，进度见[接入计划](plans/free-creation-integration.md)。

| 方法 / 路径 | 请求 | 成功响应 / 契约 | 客户端超时 |
|---|---|---|---|
| GET `/api/health` | 无 | `healthSchema`：ffmpeg、llm、llmStatus，及可选能力描述 | 15 秒 |
| POST `/api/plan` | 现有 `planInputSchema`：idea、style | 现有 `planResponseSchema`：title、mood、四句 lyrics、songPlan、source、model | 35 秒 |
| POST `/api/compose` | `freeInputSchema`：intent、可选 lyrics[] / bpm / targetSeconds | `freeResultSchema`：requestId/source/model/input/plan/sections/draft，完整规划与旋律事务 | 290 秒 |
| POST `/api/melody` | `melodyRequestSchema`：intent/bpm/songPlan/phrases、可选 targetIds/source | `melodyResponseSchema`：draft、可选 model/metrics，局部旋律 | 190 秒 |
| POST `/api/production` | 同 `freeInputSchema` | HTTP 202 + `productionJobSchema` 的 id/state/stage；不是成品 | 15 秒，仅受理请求 |
| GET `/api/production/:id` | 任务 ID | `productionJobSchema`，含实际 state/stage 及可选 project/error；不存在或重启后404 | 15 秒，每次查询 |
| POST `/api/production/:id/retry/:phraseId` | 空 JSON `{}` | `productionJobSchema`；不能重试时409 | 610 秒 |
| POST `/api/instruments/render` | `instrumentInput`：bpm、kind、notes、endBeat，可选 GM program、soundfont | `instrumentResultSchema`：audioUrl、key、providerId、soundfont、sampleRate=24000、startSeconds=0、cached | 130 秒 |
| GET `/api/singing/qixuan` | 无 | `qixuanStatusSchema`：available 判别联合；未安装返回 id/version/message；可用时包含 providerId/engineVersion/parameters/runners | 15 秒 |
| POST `/api/singing/qixuan/render` | `qixuanInput`：lyricId、lyrics、start/end（beat）、bpm、notes、engineVersion，可选 runner/take/performance | `qixuanResultSchema`：audioUrl/key、声库与引擎版本、renderParameters、take、startSeconds/durationSeconds、isDemo/cached/createdAt | 610 秒 |
| GET `/api/audio/:file` | 64 位小写十六进制 hash + `.wav`（`audioFileSchema`） | PCM WAV 二进制；缓存丢失 404 | 130 秒 |
| POST `/api/export` | `exportInput`：base64 wav、四幅 png/duration、lyrics 时间轴、style/title/duration、可选 singingCredit | `video/mp4` 二进制下载；时间轴/WAV/PNG 在后端进一步校验 | 180 秒 |
| GET `/api/engines` | 无 | `enginesSchema`：器乐可用性、音源列表、歌声模式 | 15 秒 |
| GET `/api/singing/dictionary` | 无 | `dictionarySchema`：拼音到音素映射 | 15 秒 |
| POST `/api/singing/import` | `importInput`：base64 WAV 与实际 voice 信息 | `audioResultSchema`：audioUrl/key | 15 秒 |

既有原生 `/api/singing/voices` 和 `/api/singing/render` 文件交换接口保留，当前 React 工作台不直接调用；继续由 `server/singing.mjs` 校验 DS 与授权声库注册，不扩大这轮迁移范围。`/api/admin/*` 是独立的本机安全接口，不属于前端公开 Client/Mock，不得为跨设备联调解除其限制。

音符单位始终为 beat；返回音频 startSeconds/durationSeconds 为秒。器乐从全曲零点开始，歌声包含本句休止及原有尾音。绮萱缓存依赖、take 规则、OpenUtau 参数和混音算法保持原实现。客户端为单句计算 dependency，再依据**最新工程**核对歌词、音符、runner、锁定后原子应用；生成期间用户编辑不能被覆盖。

`src/api/client.ts` 统一 base URL、JSON 编码、超时（含读 body）、错误解析、响应 Zod 校验与二进制类型校验。默认同源路径，经 Vite 代理；`VITE_API_BASE_URL` 可显式覆盖公共地址。未配置 CORS 的后端应继续使用代理，而非直接跨域。

`createApiClient({onTask})` 提供 plan/instrument/singing/export 请求的 `GenerationTask`，state 为 running/succeeded/failed，带 mock 和可选 error。它表示一次浏览器请求生命周期；compose/melody 使用 plan 类型。production 三个方法目前不发布这个 onTask 事件，需读返回任务的实际 state/stage。超时或断开不等于引擎子进程必然立即终止，不伪造百分比。

开发响应可带 `mock:true`；Mock 歌声音频必须同时 `isDemo:true`，真实绮萱必须 `isDemo:false`。Mock plan 的 source 保持旧 wire 格式以复用现有 Schema，但显式带 mock/model 标记；应用工程时记为 `source:local-rules, mock:true`，UI 显示固定测试方案，不记录真实 LLM 成功。Mock export 响应是明确标注的 JSON 状态回执。生产构建强制使用真实模式，不能通过 `VITE_API_MODE=mock` 冒充实际推理。

变更流程见 [TEAM_WORKFLOW.md](TEAM_WORKFLOW.md) 和 [共享变更记录](../shared/contracts/CHANGELOG.md)。

## 自由创作、制作任务与应用结果

`FreeInput`：intent 为1–500字；可选 lyrics 为1–8行、每行1–100字，手写文字原样保留；bpm 为整数60–160；targetSeconds 为20–30，默认25。时间轴按小节分配，不承诺精确等于目标秒数。旧 plan 仍是四句计划接口，不承载新自由创作。

compose 只生成规划与旋律，由 `projectFromComposition` 建立完整自由工程；失败不应用半成品，不退回旧模板。新正式作品不能再调用旧 applySongPlan/composeFromIdea 覆盖其旋律。局部编辑用 melodyRequest → api.melody → applyMelodyDraft，保留非目标句与锁定音符。调用前后还需核对当前工程与操作代次，避免完成时覆盖期间编辑。

production 串联规划、旋律、器乐与歌声。stage 契约枚举为 queued/checking/composing/planning/melody/validated/instruments/singing/ready-for-mix；state 为 running/succeeded/failed。不要假定每次轮询会观察到所有阶段。只有 succeeded 且 ready-for-mix，并经 validateProject 校验完整 project 后才原子应用。响应中的 project/composition 当前为 unknown，不能直接当作已校验工程。阶段就绪不是 MP4 已导出，仍需浏览器 renderAudio 与导出用例。

任务最多30条、进程内存保存，重启或任务淘汰后查询可404，前端保留已保存工程。歌声失败时按 error/phraseId/completedPhrases 展示，可重试缺失句，复用已有结果；规划失败不能保证恢复中间态。超时和状态查询成功都不是作品完成证明。

## 调教、混音与 Mock 边界

Performance 支持 natural/soft/strong、Auto/Manual、人工 overrides/锁定；只改表现后仅重唱该句。分轨与混音不是新增 HTTP 导出路由：浏览器 `renderAudio` 支持 vocal-dry/vocal-processed/instrumental/mix，原 WAV/PV 用例复用该入口。逐音符 overrides 按当前句音符索引，UI 调整顺序需核对。

当前 Mock **未定义** compose / melody / production；上述接口返回404，不连接真实模型。新增 fixture 的来源标记、工程应用协议需双方确认，不能把 source=llm 的夹具记为实际 LLM 调用。后端与 Mock 可按团队流程分 PR，但必须明确未接入项。

方法与边界见 [v0.3.1 交接](V031_FRONTEND_HANDOFF.md)、[v0.3.2 交接](V032_FRONTEND_HANDOFF.md)；真实历史执行与人工/网页验收缺口见 [v0.3.2 报告](V032_BACKEND_ACCEPTANCE.md)。
