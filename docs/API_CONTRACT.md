# SONGYU API v0.2.1

运行时契约在 `shared/contracts/index.mjs`，TypeScript 类型在相邻 `.d.mts`；SongPlan 仍只使用 `shared/song-plan.mjs`，不另建 Schema。所有业务 JSON 请求统一 `Content-Type: application/json`，错误为非 2xx + `{error:string}`。契约仅包含公共音乐数据，不包含后台设置或密钥。

| 方法 / 路径 | 请求 | 成功响应 / 契约 | 客户端超时 |
|---|---|---|---|
| GET `/api/health` | 无 | `healthSchema`：ffmpeg、llm、llmStatus，及可选能力描述 | 15 秒 |
| POST `/api/plan` | 现有 `planInputSchema`：idea、style | 现有 `planResponseSchema`：title、mood、四句 lyrics、songPlan、source、model | 35 秒 |
| POST `/api/instruments/render` | `instrumentInput`：bpm、kind、notes、endBeat，可选 GM program、soundfont | `instrumentResultSchema`：audioUrl、key、providerId、soundfont、sampleRate=24000、startSeconds=0、cached | 130 秒 |
| GET `/api/singing/qixuan` | 无 | `qixuanStatusSchema`：available 判别联合；未安装返回 id/version/message；可用时包含 providerId/engineVersion/parameters/runners | 15 秒 |
| POST `/api/singing/qixuan/render` | `qixuanInput`：lyricId、lyrics、start/end（beat）、bpm、notes、engineVersion，可选 runner/take | `qixuanResultSchema`：audioUrl/key、声库与引擎版本、renderParameters、take、startSeconds/durationSeconds、isDemo/cached/createdAt | 610 秒 |
| GET `/api/audio/:file` | 64 位小写十六进制 hash + `.wav`（`audioFileSchema`） | PCM WAV 二进制；缓存丢失 404 | 130 秒 |
| POST `/api/export` | `exportInput`：base64 wav、四幅 png/duration、lyrics 时间轴、style/title/duration、可选 singingCredit | `video/mp4` 二进制下载；时间轴/WAV/PNG 在后端进一步校验 | 180 秒 |
| GET `/api/engines` | 无 | `enginesSchema`：器乐可用性、音源列表、歌声模式 | 15 秒 |
| GET `/api/singing/dictionary` | 无 | `dictionarySchema`：拼音到音素映射 | 15 秒 |
| POST `/api/singing/import` | `importInput`：base64 WAV 与实际 voice 信息 | `audioResultSchema`：audioUrl/key | 15 秒 |

既有原生 `/api/singing/voices` 和 `/api/singing/render` 文件交换接口保留，当前 React 工作台不直接调用；继续由 `server/singing.mjs` 校验 DS 与授权声库注册，不扩大这轮迁移范围。`/api/admin/*` 是独立的本机安全接口，不属于前端公开 Client/Mock，不得为跨设备联调解除其限制。

音符单位始终为 beat；返回音频 startSeconds/durationSeconds 为秒。器乐从全曲零点开始，歌声包含本句休止及原有尾音。绮萱缓存依赖、take 规则、OpenUtau 参数和混音算法保持原实现。客户端为单句计算 dependency，再依据**最新工程**核对歌词、音符、runner、锁定后原子应用；生成期间用户编辑不能被覆盖。

`src/api/client.ts` 统一 base URL、JSON 编码、超时（含读 body）、错误解析、响应 Zod 校验与二进制类型校验。默认同源路径，经 Vite 代理；`VITE_API_BASE_URL` 可显式覆盖公共地址。未配置 CORS 的后端应继续使用代理，而非直接跨域。

`createApiClient({onTask})` 提供 `GenerationTask`：kind 为 plan/instrument/singing/export，state 为 running/succeeded/failed，带 mock 和可选 error。它表示一次浏览器请求生命周期，没有伪造服务端排队 ID 或百分比。后台仍记录原有真实任务。超时或连接断开不等于引擎子进程必然立即终止，重新请求仍经过既有并发/缓存保护。

开发响应可带 `mock:true`；Mock 歌声音频必须同时 `isDemo:true`，真实绮萱必须 `isDemo:false`。Mock plan 的 source 保持旧 wire 格式以复用现有 Schema，但显式带 mock/model 标记；应用工程时记为 `source:local-rules, mock:true`，UI 显示固定测试方案，不记录真实 LLM 成功。Mock export 响应是明确标注的 JSON 状态回执。生产构建强制使用真实模式，不能通过 `VITE_API_MODE=mock` 冒充实际推理。

变更流程见 [TEAM_WORKFLOW.md](TEAM_WORKFLOW.md) 和 [共享变更记录](../shared/contracts/CHANGELOG.md)。
