# 工单 36：Toge · 工单 31–35 前端接线与剩余交接

Owner：Toge / Frontend & UX。Backend / 音乐与渲染 reviewer：Blacktea。
状态：待实施；先取得后端提交并确认本单涉及的共享接线范围。2026-11-08 仅整理工单，未实施页面。
范围：汇总本轮 31–35 后端交付后尚未完成的前端、Client/Mock、存档与页面验证；本单是这些前端待办的唯一 checkbox 入口。原后端工单保留实现与验证证据，旧工单 27 和 35 不重复维护已转入的前端 checkbox。

## 开工依赖与授权边界

- 先读[团队工作流](../docs/TEAM_WORKFLOW.md)、[现有前端工单 5](5-toge-free-creation.md)、[工单 27](27-frontend-interface-sync.md)，只按下表 ID 读取有关[交接](../CROSS-END-HANDOFF.md)。保留 LOOP! 原型版式和折叠入口，不重做视觉/导航。
- 后端最初为本地提交；用户本轮已明确授权**统一推送、创建 PR 并合并**。完整后端基线为 `d550b9c`，本工单分支继承全部31–35提交及已有启动器重启提交 `eedadd3`。整理时远端main仍为 `889f424`；Toge开工先更新main并核验已包含上述提交，若PR尚未完成或本机仍是旧main，应先同步再联调。本次授权不延伸为Toge后续改动的自动推送/合并，也不授权代发消息。
- Toge 负责组件/Hook/Mock/前端测试。`shared/`、`src/model.ts`、`src/api/client.ts`、`src/audio.ts` 和 `src/features/` 等共享/跨层调用，须先在 [CHANGELOG](../shared/contracts/CHANGELOG.md)关联**工单 36 的具体字段/调用点/兼容性/负责人**取得限定确认；31–35 的后端授权不延伸为此次前端新增共享改动授权。
- 不重做服务器、LLM 路由、歌声、声库、缓存或 FFmpeg 算法。发现核心问题交 Blacktea；共用已有音乐/HTML runtime，不在 UI 另写随机或 swing 算法。本文是任务安排，不是跨区实现授权。

## 交付基线与待接缺口

| 来源 / 提交 | 已完成 | 本单剩余 / 交接 ID |
|---|---|---|
| [31](已完成/31-production-groove-integration.md) / `ab95301` | grooveSettings 工程校验、productionInputSchema、制作返回与 external-audio 统一 FluidSynth 输入 | Client/Mock/控件、制作提交与应用、Synth 事件同步；[20-groove-render](../CROSS-END-HANDOFF.md#20-groove-render) |
| [32](已完成/32-phoneme-explicit-zero.md) / `65f9b5e` | 首音素显式 0 优先级、相关旧缓存失效、USTX/真实 WAV 对照 | 删除旧限制提示、核对实际请求含数值 0；[27-phoneme-zero](../CROSS-END-HANDOFF.md#27-phoneme-zero) |
| [33](已完成/33-browser-synth-band-gain.md) / `68de0f3` | Synth band bus 与统一 renderAudio、真实 FluidSynth/MP4 回归 | 解禁现有 Synth 伴奏增益控件、页面/保存/导出回归；[5-C-synth-mix](../CROSS-END-HANDOFF.md#5-c-synth-mix) |
| [34](已完成/34-production-trace-contract.md) / `b8d21fd` | performancePlanning 五态/可选 trace/errorCode、公开安全序列化；现有 Client 的共享 Zod 已能保留字段 | 轻量状态/错误/可选追溯展示、Mock 场景；[15-P2B-routing](../CROSS-END-HANDOFF.md#15-p2b-routing)，仅本轮表现规划追溯，不接管其余历史路由提案 |
| [35](后端/35-ai-html-pv.md) / `be95902`、`d550b9c` | 独立 pv_design、严格设计与快照契约、可信 HTML runtime、原 export HTML 分支、真实动态 MP4 | 工程持久化、Client/Mock、#pv 可选入口/隔离预览/seek/导出、共同验收；[35-ai-html-pv](../CROSS-END-HANDOFF.md#35-ai-html-pv) |

建议顺序：先 A（32/33 小修）→ B（31 Groove）→ C（34 轻量状态）→ D（35 HTML PV）。按阶段验证和本地提交，避免用一组开关掩盖未接的核心。后端历史测试数字与当前前端是否通过分开记录。

## 唯一应做清单

<a id="quick-fixes"></a>

### A · 清理已修复限制、启用现有有效控件（32/33）

- [ ] A1 在 `AdvancedPerformanceControls.tsx` 移除“首个音素 0 毫秒可能继承整句辅音偏移、已交引擎修复”的过期提示；保留音素序号/数量/词表与整句音素没有逐音符对应的说明。页面输入 0 与留空分别验证，实际请求必须保留数值 `offsetMs:0`，不得用 truthy 判断丢失。
- [ ] A2 在 `MixControls.tsx` 解除**仅因 Synth 模式**而禁用伴奏音量的条件及旧说明，沿用已有 0–200% 和 mixSettings；busy/处理关闭等原保护继续有效。不要自动切引擎，不要连带解禁元音演示的人声音量/混响。
- [ ] A3 补页面回归：0 偏移与非零句级偏移组合经保存/重开仍提交 0，兄弟句/锁定不变；Synth bandGain=0/1/2、enabled、mute/单轨与各 stem、保存/重载、WAV/PV 输入的实际 PCM 验证。人声不能被伴奏归零一起静音；单纯 slider 可操作不是验收。

接入证据：`tests/p1-phoneme.test.ts`、`tests/qixuan-zero-real.test.mjs`、`tests/browser/synth-band-gain.spec.js`。不要重开已修复算法；页面实际请求失败则提供证据交 Blacktea。

<a id="groove-31"></a>

### B · Groove 的制作、存档、试听与导出统一（31）

- [ ] B1 经本次限定确认后，`api.startProduction` 从旧 FreeInput/freeInputSchema 改接既有 ProductionInput/productionInputSchema，同步 Hook/输入适配调用点；不将 grooveSettings 再塞进严格的 compose/LLM 创作输入。不新增 production URL。
- [ ] B2 在既有创作设置中提供可选三参数：swingTicks 0–120 整数、timingTicks 0–20 整数、velocityAmount 0–0.2。仅持久化既有 `SongProject.grooveSettings?`，新制作提交并原子应用返回工程；导入/保存/重开/取消/失败和迟到响应保护均保留。旧工程缺字段不迁移、不自动补零；关闭与全零沿用旧输入。
- [ ] B3 Mock 制作保留设置并返回到工程，明确 mock:true；覆盖参数非法、成功、失败和迟到结果。projectId/trackId/version 只从工程和轨道派生，不能让页面填写或重复持久化。
- [ ] B4 经音频共享范围确认后，把浏览器 Synth 的器乐事件接到 `shared/groove.mjs` 的 projectInstrumentInput/performedNotes，按 480 tick/beat 换算播放起止与演奏 velocity；不复制随机算法、不改写工程音符。人声不做 Groove；轨道 locked/manuallyEdited/任意 notes[].locked 保护语义须与现有 MIDI/FluidSynth 一致。
- [ ] B5 验证同工程同设置重复渲染稳定，改变参数确实影响允许器乐的 PCM；受保护数据/有效输入不变，关闭恢复基线，保存重开保持。试听、WAV、PV 共用 renderAudio；FluidSynth 请求已由 external-audio 透传，避免重复应用。若 B4 未完成，不先开放一个只影响后端、试听却无效的开关。

字段与调用：[groove-render](../docs/ARCHITECTURE.md#groove-render)、`shared/contracts/groove.mjs`、`shared/contracts/production.mjs`、`shared/groove.mjs`、`src/external-audio.ts`、`tests/production-groove.test.ts`。当前 `src/audio.ts` 已有 band bus，但**尚未接 Groove 事件**，两项不能混淆。

<a id="planning-trace"></a>

### C · 表现规划状态和可选追溯（34）

- [ ] C1 在现有制作状态区域轻量显示 `performancePlanning`；缺字段表示旧响应/尚无信息，不能自行当作成功。区分 disabled/running/succeeded/failed/skipped；disabled/skipped 或无 trace 不显示虚构模型/Token。可选 trace 的费用 null 显示未知，时间/Token 等只来自本次响应。
- [ ] C2 显示 `PERFORMANCE_PLANNING_FAILED` 与保留的中文 error，不把它当成可跳过的单句重唱失败，不新增“绕过规划继续演唱”。规划失败、服务重启404、歌声失败重试、迟到结果仍保留当前工程与已完成资产。
- [ ] C3 补 Mock 五态、无 trace、旧响应与错误码兼容；若用追溯字段夹具必须明确标记 mock，不把夹具 Token/费用当真实调用。验证 GET/retry 解析与成功结果应用。现有 Client 已能通过共享 Schema 保留新字段，不另造重复字段或管理后台路由 UI。

类型/错误夹具见[production](../docs/ARCHITECTURE.md#production)及 `tests/production-trace.test.mjs`。不得期待公开响应里的根级 input/failureContext/performanceTrace/instrumentAssets 或引擎 sourceProject 路径，按稳定公开字段消费；追溯不作为永久工程历史。

<a id="html-pv"></a>

### D · AI HTML PV 的产品接线（35）

- [ ] D1 **先提案并确认新增工程存储结构**：设计、规范化 PvProject 快照、inputFingerprint、source/mock 与可选视觉模式如何承载/校验/保存/重开/导入。当前 SongProject **没有 pvDesign 字段**，不能把后端已交付说成已持久化；旧 v1/旧 Canvas 工程无字段直接可用，不迁移。确认后同步 model/校验/用例测试。
- [ ] D2 经 Client 边界确认后接 `POST /api/pv/design`、`GET /api/pv/status` 和既有 export HTML 分支。project 为最小投影，不上传整个工程、WAV、配置或资源；sections/lyrics 用 beat，按既有 Schema 规范化和 pvFingerprint。响应 source/Mock 标记及请求代次校验后再原子应用；失败保留旧工程与旧设计，不因制作成功自动追加视觉调用。
- [ ] D3 在 LOOP! **既有 #pv 区**提供明确的可选“AI 视觉导演”入口、进行中/失败/资源不可用提示和 Canvas 选择；保持默认 Canvas、原版式与播放器语义。未配置独立 pv_design、模型失败或 Chromium 缺失时原 Canvas 可用，但 HTML 失败不得静默替换后当作成功。
- [ ] D4 共用 `pvDocument` 输出可信场景，iframe 仅 `sandbox="allow-scripts"`，不加 allow-same-origin，不插入模型任意 HTML/JS/CSS/URL。按当前播放/seek/重播进度向自己持有的 iframe 发 `{type:'cantaloom-pv-seek',timeMs}`，beat→秒→毫秒映射正确；模型文字只取可信工程标题/歌词。保持单一歌词/署名绘制，不额外叠一套字幕；不要独立重写动画或随机算法。
- [ ] D5 生成/应用/预览/导出前核对当前快照指纹。手动改歌词、BPM、段落或其他投影字段后，明确提示旧设计已失效并由用户选择重新生成/Canvas；覆盖修改、切换工程、取消等待后返回的旧响应不能覆盖新工程。不要把停止等待说成服务器推理已被终止。
- [ ] D6 经导出用例边界确认后，让 HTML 导出带 visualMode='html'、pvProject、pvDesign、inputFingerprint、同一 renderAudio 混音 WAV 及匹配的歌词秒时间/标题/时长/署名，**不带 scenes**。保留旧四 PNG 请求、Canvas/WAV、MP4 Blob/响度头。正确处理400快照失效、429占用、503资源缺失、500编码失败；失败不下载假 MP4，不丢旧设计。
- [ ] D7 补独立 Mock 的设计/状态/失败/迟到/资源场景；设计响应 `source:'mock',mock:true`，**PV Mock 不带真实 trace**。可以用同一可信 runtime 预览明确标记的设计夹具；Mock 导出仍是 `.mock-export.json` 回执，不伪造模型调用、真实 MP4 或后台资源可用。
- [ ] D8 页面验证：新建→显式生成→seek/重播→保存/重开→歌词/BPM变化失效→重新生成→WAV/HTML PV/Canvas 导出；含失败保留和 Mock/真实来源隔离。真实资源环境单独从正式页面核对预览/视频指定帧、歌词/署名、音频设置与时长；未实际运行的环节标未验，交工单6共验。

权威入口：[AI HTML PV](../docs/ARCHITECTURE.md#ai-html-pv)、[资源/复现](../docs/ENGINES.md#html-pv)、`shared/contracts/pv.mjs/.d.mts`、`shared/pv-render.mjs/.d.mts`、`shared/contracts/index.mjs/.d.mts` 的 VideoExportInput/HtmlExportInput、`tests/support/pv-fixture.mjs`、`tests/browser/pv.spec.js`。

当前 Client 的 ExportInput 仍是 Canvas-only；不要因 exportInput runtime 已支持 union 就以为 Client 类型/Mock/导出用例已接。GET /api/pv/status.available 仅探测 Chromium 路径，不代表独立模型、FFmpeg、字体或实际启动都就绪。现有 Client 180s，本机25秒HTML基准77.7s；512MiB临时帧/170s HTML总预算可能失败，不能把本机耗时当所有电脑保证。preview/export 字体一致性需要同一 Chromium/系统字体策略。

<a id="validation"></a>

### E · 验证、回执与收尾

- [ ] E1 按阶段运行 build、受影响的单元/契约和 Mock/真实HTTP页面回归，验证实际请求、原子应用、保存重开、PCM/WAV/PV；列出通过/失败/跳过。不以截图或构建代替音频变化、实际动态视频或人工观感。
- [ ] E2 在[唯一迭代日志](../docs/iteration-log.md)顶部记录本单、相关接口/代码/提交、Mock与真实资源边界；更新架构/接口当前页面状态。按模块把结果回执到上表原工单及交接ID；完成并有证据后删除对应交接，尚未完成的保留。分阶段本地提交，推送/PR遵照用户当时授权。
- [ ] E3 将本轮页面可验入口、资源前置与未验项交给[工单6](6-joint-acceptance.md)，由 Toge 与 Blacktea 做正式页面/人工听感及观感共同验收；共同验收 checkbox 只在工单6维护，不把本单的 Mock/后端历史记录直接勾成共同通过。

## 真实证据、同步与完成定义

后端已完成的客观/资源证据见[迭代日志](../docs/iteration-log.md)各工单锚点：production-groove-31、phoneme-explicit-zero-32、synth-band-gain-33、production-trace-34、ai-html-pv-35。32修复与33音频核心不应重复实现；34本轮仅接口模型夹具；35有两次真实视觉模型调用与25秒真实动态MP4，但音频是本地规则/元音演示。

本机 `temp/task31/`、`temp/task32/`、`temp/task33/`、`temp/task35/` 中的 WAV/视频/离线harness/资源报告**被Git忽略，不会随代码同步到Toge电脑**。需用户提供产物或在有已授权资源的机器按现有工具复现；不能假定有模型Key、声库、Chromium、FFmpeg或中文字体，不能复制DPAPI密钥当作可迁移配置。35的完整类型与示例不依赖这些临时文件，已在共享契约/测试夹具/架构文档。

本单完成标准：A–D在已确认的前端/共享范围完成接线与对应页面验证，E有回执；现有创作、锁定、保存、WAV/PV和Canvas路径不退化；Mock/真实资源/正式页面/人工验收分开。没有现场资源或共同人工验收时，清楚标明限制，不能宣称完整产品已验收。35整单关闭须另等本单与工单6的实际回执。

不包含：长歌/和声/拍号、MixGraph、缓存LRU/持久化/并发池、重做管理后台模型路由、模型训练/生图视频模型、原生桌面或移动端适配工程。已有其他交接ID不因本单被接管。
