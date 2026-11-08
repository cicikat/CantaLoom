# 工单 35：AI HTML 动态 PV · 视觉规划、可信渲染与 MP4 导出

Owner：Blacktea / Backend & Music Engine；共享 Schema、渲染适配与最终页面由 Toge review/接入。
状态：P0/P1 后端与共享渲染已完成（2026-11-08），P2 接口交接已登记；正式页面/存档/Mock 与共同观感验收待 Toge，整单未关闭。
基线：2026-11-08 开工已核对 `origin/main` 为 `889f424`、本地前序工单 HEAD 为 `b8d21fd`；本任务沿用已验证的本地后端堆叠，分支 `feature/backend-ai-html-pv`，保留原有未提交删除。
依赖：[工单 15 P2-B](15-p0.md) 既有 LLM 任务路由、[工单 6](../6-joint-acceptance.md) 真实页面/音频联合验收、[工单 27](../27-frontend-interface-sync.md) 接线纪律。新功能不依赖工单 31–34 完工。

## 一、目标（不是换四套固定 PV 模板）

用户在歌曲制作完成后，可选择「AI 视觉导演」：**额外调用一次独立 LLM**，根据当前歌曲的歌词、BPM、段落、情绪/能量、旋律节奏，产出一份可复现的视觉设计方案；可信渲染器将其落实为真正的 **HTML/CSS/SVG 动态画面**，支持随播放进度任意 seek、歌词同步，并通过 FFmpeg 输出与浏览器预览一致的 MP4。

保持原程序化 Canvas PV 作为默认模式与不依赖 LLM/Chromium 的可用路径；HTML PV 是可选能力，不修改原音乐生成、演唱、混音或控制台基础安全规则。**不可把仅生成 HTML 预览、返回字符串或单张 PNG 截图宣称为“动态 PV 已完成”。**

## 二、已核实的仓库基础和缺口

- `src/visual.ts`：`drawPV()` 是程序化 Canvas + 由 SongProject 定时的字幕；`Landscape` / LOOP! 的 `#pv` 章节使用当前播放器时间。
- `src/features/export/files.ts`：`exportPVFile()` 从 `renderAudio()` 得到 WAV，为 4 个 section 分别画 1 张背景 PNG，调用已有 `api.exportVideo()`。
- `shared/contracts/index.mjs`：当前 `exportInput` 要求 **恰好 4 张** `scenes[].png`、wav/base64、歌词、style/title/duration 等；不认识 HTML 动画。
- `server/services/export.mjs`：FFmpeg 对四张 PNG 做 zoompan、concat，再以 ASS 加字幕与原有 loudnorm 编码 MP4。`server/routes/export.mjs` 已验证 WAV、PNG、时间轴、并发；现有成功输出是 MP4 Blob 和响度报告。
- `server/services/llm-router.mjs`：仅有 `lyrics_planning` / `melody_composition` / `performance_planning` 三类任务；后台依赖 `taskNames`、`routesSchema` 和 `server/admin-config.mjs` 中的 `routeKeys` 枚举。
- `src/model.ts` 尚无 AI PV 设计持久化字段；当前页面有字幕样式、换色、预览与导出按钮，但没有动态 HTML PV 选择与生成流程。

因此，本工单应 **延展独立视觉任务 + 现有导出分支**，不复制一套创作后端、视频后台、工程数据库或通用 Agent 框架。

## 三、方案和边界

### A. LLM 只输出“视觉编排数据”，不是可执行的任意网页代码

推荐 `pvDesignSchema v1`（结构仅为提案，字段确认后实施），支持 1280×720 / 16:9、4 个既有段落映射、分层背景、渐变、粒子、几何/SVG 图形、动态字体、镜头式位移/缩放、透明度/旋转、文字节奏和切换。让 LLM **可以自由组合与设计**颜色、排版、层、位置、节奏和关键帧，而不是只能从 3–4 个模板 ID 中选择；但每个字段须严格校验数值范围、长度和复杂度。

可以把模型输出理解为“受约束的 HTML 场景树 + 动画关键帧”：渲染器用受控 DOM 元素、CSS、SVG 和自有时间轴脚本实现 HTML。不得执行 LLM 输出的 JS、事件属性、`iframe`、`script`、`style` 任意文本、网络 URL、外部字体、远程图片、`@import`、`url()` 等；不接入外部图像/视频下载。不允许 `innerHTML` 直接塞模型文本。

可考虑结构（示意，并非未经审批已生效的 Schema）：

```json
{
  "version": 1,
  "canvas": {"width": 1280, "height": 720},
  "scenes": [
    {
      "sectionId": "existing-section-id",
      "background": {"type": "gradient", "colors": ["#111a38", "#ae75e6"]},
      "layers": [
        {"id": "rain", "type": "particles", "seed": 17, "count": 36, "color": "#b8cfff", "motion": "fall"},
        {"id": "headline", "type": "text", "textSource": "current_lyric", "x": 0.5, "y": 0.70,
         "style": {"fontSize": 60, "color": "#ffffff"},
         "keyframes": [{"at": 0, "opacity": 0, "scale": 0.94}, {"at": 0.2, "opacity": 1, "scale": 1}]}
      ]
    }
  ]
}
```

上例中的 sectionId 为占位符，不得硬编码假 ID。**段落开始/结束、歌词原文、字幕时间、作品署名与演唱来源由可信 SongProject 绑定**，不可依赖模型臆造或修改。LLM 只能决定视觉表现，不重新作曲、不改写歌词、音符、BPM 或工程保护数据。字幕支持 HTML 视觉设计但必须读取真实歌词；旧 Canvas/ASS 继续原样工作，HTML 模式不能把同一句歌词重复绘制两遍。

采用固定种子和显式时间 `renderAt(timeMs)`；不得使用系统时间、未播控的 CSS wall-clock 动画、`Math.random()` 或外部请求决定帧状态。跳到 12.5s 与从 0s 连续播放到 12.5s 应得到相同画面；相同输入的渲染帧应稳定。LLM 本身可每次产生不同设计，但每份已保存的设计必须可重复渲染。

### B. 独立 PV 模型任务

- 新增任务类型 `pv_design`，复用 `createTaskRouter` / 现有后台模型供应商、keyRef、Prompt 版本与调用追溯，不另造 LLM HTTP 客户端。
- 从当前工程构造**最小必要上下文**：title、idea/mood、bpm、sections (id、start、beats、energy)、歌词原文与时间、旋律强弱/节拍提示等简要数据。不要上传 WAV、完整用户私密配置、声库文件或 Key；不把历史工程文本当系统指令。
- 新增 `POST /api/pv/design`（优先于在 `/api/production` 中硬塞生成），后端返回经 Schema 严格校验的设计、可选脱敏 task trace/source；调用失败明确非 2xx，不伪称成功、不悄悄返回本地假 AI 结果。
- 采用显式用户请求或之后前端由用户点击触发，**不默认每次制作都额外扣 LLM Token**。未配置 `pv_design`、模型不可用、输出非法，应可继续使用原 Canvas PV。
- 跟随 `taskNames` 逐项核对 `routesSchema`、`server/admin-config.mjs` 的 `routeKeys`、后台路由清单/类型/测试。管理 API 只返回脱敏配置及调用记录，不返回 prompt/key/原始报错；不复制一套创作页路由管理。

### C. 浏览器与导出共用一份 HTML 场景语义

- 采用一份受控场景编译/时间轴核心，浏览器预览和离线视频渲染使用相同视觉方案、相同布局/字体策略与歌词时间源；**服务端不得 import React 或 `src/`**。纯契约/无 I/O 的编译器可放 `shared/`，以限定的可信 runtime 将其呈现为 HTML/CSS/SVG。
- 前端未来以 sandbox iframe 或其他隔离容器挂载受控生成结果；若使用 iframe，不允许同源权限与任意网络访问，只运行仓库可信的时间轴代码，模型没有任何脚本执行入口。内容安全策略（CSP）、尺寸上限、资源上限均需测试。
- 导出扩展现有 `POST /api/export`，不是另建与当前视频出口平行的编码系统。新增可选 `visualMode:'html'` 和经验证的 pvDesign 后，HTML 路径可以使用独立安装的 headless Chromium/Playwright 将 `renderAt(timeMs)` 按固定帧率采样为视频帧，送已有 FFmpeg 合成；旧请求（仅 4 张 PNG，未带 visualMode）**逐字段、逐行为兼容**。不要错误地把 HTML 当 PNG 传入当前 FFmpeg 滤镜。
- 首个版本保留 1280×720、24fps、现有 15–35s 时长与 4 section 边界；评估逐帧截图成本、进程超时、内存、临时文件、同时编码限制与跨 Windows 环境 Chromium 安装/探测。Chromium 为**可选依赖**，不可因缺它导致旧 Canvas PV 无法导出。
- HTML 路径仍使用现有 `renderAudio()` 提供的**同一份已混音 WAV**，以及现有音频 loudnorm/AAC/报告。不得另做音频渲染或改变用户的伴奏/人声设置。
- 对 HTML 路径的歌词/字幕与版权署名设置单一权威来源，避免浏览器文本和 FFmpeg ASS 字幕叠加。导出失败时保留旧工程与原导出能力，临时文件清理、超时、并发与 400/503/500 语义明确；失败不得下载伪 MP4。

## 四、分阶段实施（每阶段停下来检查边界）

### P0 · 后端模型任务与稳定契约

- [x] 核对当前工作区、已有编号/工单及 `AGENTS.md`、`docs/TEAM_WORKFLOW.md`；在 `shared/contracts/CHANGELOG.md` 写 `pv_design`、`pvDesignSchema`、导出兼容提案，并取得限定共享范围确认。
- [x] 设计并实现严格受限的 `pvDesignSchema` / `.d.mts`：4 个 section ID 精确匹配、对象/文本/关键帧数量边界、颜色/坐标/数值/文本来源校验、未知字段拒绝；旧项目无需 pvDesign。
- [x] 在现有 LLM Router / 管理设置中新增独立 `pv_design`；补后端 `POST /api/pv/design`、请求/响应类型、错误码和安全日志，不改生产制作主链。
- [x] 用两首不同曲风、不同歌词的输入验证模型视觉方案确实不同；禁止只给同一个静态模板换三种颜色。带 API 的验证必须记录模型 ID、耗时、Token 和是否为真实调用，失败不回退伪成功。

### P1 · 可信 HTML 动态渲染核心与独立导出

- [x] 实现受控 HTML/CSS/SVG 场景编译器、可信 `renderAt(timeMs)` 时钟与歌词绑定，不执行模型 JS/任意 HTML/网络资源。可在无 React 的小型离线 harness 中独立预览。
- [x] 实现 HTML 帧渲染到既有 FFmpeg 导出分支，保留旧 PNG+ASS 路径和 loudnorm/响度响应头/MP4 Blob 语义；单独声明 Chromium/FFmpeg 检测和资源要求。
- [x] 基准测量 20–30 秒、1280×720、24fps 的逐帧渲染/MP4 耗时与峰值资源，确认旧 180s Client / 120s 进程超时是否需按 HTML 模式调整；不可假设 600 张截图一定能在旧时限内编码完成。必要时做流式帧输入与限量并发，但不要引入常驻视频渲染服务。
- [x] 验证同一时间点 seek 帧一致、场景切换/歌词无跳跃、无双重字幕、无黑帧/截断；至少实际产出可播放的 HTML 模式 MP4，使用 FFprobe 验证轨道、时长、分辨率和音频同步。
- [x] 禁用 LLM / Chromium 资源时原 Canvas 导出仍按原接口成功；HTML 模式明确拒绝且不静默变回旧画面。缓存与临时目录清理正确。

### P2 · 前端交接（本轮只写接口交接，不代 Toge 实施）

- [x] 在 `CROSS-END-HANDOFF.md` 登记稳定 ID `35-ai-html-pv`，提供设计响应、Schema/TS 类型、导出新旧示例、错误状态、资源探测、Mock 夹具规范、真实 MP4 测试位置和旧模式回退说明。
- [x] 交 Toge 后续实现：工程 `pvDesign?` 保存/重开、统一 Client、LOOP! `#pv` 内可选生成按钮和 HTML 预览、seek 进度绑定、Canvas 回退、真实/Mock 状态标记、导出按钮分支；**不要在后端工单中改 `App.tsx`、Hooks、CSS 或 Mock。**
P2 剩余页面/存档/Mock、预览导出一致性与失效提示接线已统一转入[工单 36 D/E](../36-toge-backend-followup.md)。共同人工验收 checkbox 仅由[工单 6](../6-joint-acceptance.md)维护，本单等待两者回执，不在此重复维护前端 checkbox。

## 五、拟定接口示例（提案，不代表已经交付）

`POST /api/pv/design`：

```json
{
  "project": {
    "id": "project-id",
    "title": "雨停后的未读",
    "idea": "雨后的克制电子流行",
    "bpm": 108,
    "sections": [{"id":"s1","start":0,"beats":8},{"id":"s2","start":8,"beats":8},{"id":"s3","start":16,"beats":8},{"id":"s4","start":24,"beats":8}],
    "lyrics": [{"id":"l1","text":"雨停之后","start":0,"end":8}]
  }
}
```

> 上述为最小投影示意，最终校验字段、时间单位及 `sections` 与当前 SongProject 的映射须在契约评审定案。**不能信任客户端自行声明的歌词/ID/时间轴与生成结果匹配**；返回/应用时均校验当前工程快照。若后端无完整工程权威源，至少将请求快照的指纹传回，由前端比对，不能把校验当作权限鉴权。

`200`：`{ "pvDesign": {"version":1, "canvas":..., "scenes":...}, "trace": {"task":"pv_design", "model":"...", "promptVersion":"..."}, "source":"llm", "inputFingerprint":"..." }`（脱敏 trace；示意）

`POST /api/export` **旧输入不变**；HTML 模式新增 `visualMode:'html'` 与 `pvDesign`，保留 WAV/歌词/标题/时长/署名和二进制 MP4 响应。应使用判别式契约兼容旧输入，不得因 HTML 新参数要求旧请求多传字段。无 Chromium 时 HTML 模式 503；模型规划失败不影响旧 Canvas 视频接口。Mock 返回带 `mock:true` 的设计夹具，绝不伪造 MP4。

## 六、验收与回归

- **契约**：合法/非法内容、安全白名单、模型输出校验、section/歌词时间戳、旧工程/旧请求、TS 声明、Admin 的 `pv_design` 路由持久化和敏感字段隔离。
- **一致性**：同一设计任意 seek 的 HTML 画面与视频指定帧匹配，不能用 4 张静态截图凑“动态”；歌词原文、开始结束时间、署名均与可信项目一致。
- **安全**：恶意 prompt/HTML/script/CSS URL/外链/超长 SVG/极端关键帧被拒绝或安全转义；Chromium 无外网与无访问本机敏感 API 的能力，隔离不因导出放宽。
- **真实产物**：有可用 LLM + Chromium + FFmpeg 时至少 1 首此前未用于夹具的歌曲从请求 PV 设计到完整 MP4 跑通，记录 sha/工具版本、时长、资源、截图与 FFprobe；真实绮萱/FluidSynth 不一定是本工单前置，但与当前合法 WAV 联调不可用模拟 MP4 冒充。
- **回归**：旧 `drawPV`、原四张 PNG 导出、MP4 报告、Mock JSON 回执、工程 JSON、字幕、WAV/PV 路径不能破坏；快速测试与资源验收分别报通过/失败/跳过。

## 七、不做

不做任意 LLM HTML/JS 执行器、联网抓图、AI 视频/文生图模型、素材平台下载、视频剪辑时间轴编辑器、长歌/多拍号、MixGraph/新混音器、3D/Live2D、重做 LOOP! 设计、常驻渲染微服务，也不自动增加每首歌的 LLM 花费。

## 八、文档、协作、提交

1. 按仓库约定先检查 `git status --short`、当前分支与最新提交；**不要恢复/暂存用户已有启动脚本删除修改**。本任务新增实现不得覆盖并行的工单 31–34 或 Toge 页面分支。
2. 共享字段和跨层渲染先提案/评审：`shared/contracts/CHANGELOG.md`、`.mjs` / `.d.mts`、必要 Client/Mock 责任边界明确后实施；不能拿旧工单的“已授权”当本次授权。
3. 实施/验证证据归入 [docs/iteration-log.md](../../docs/iteration-log.md) 顶部，更新 [docs/ARCHITECTURE.md](../../docs/ARCHITECTURE.md) 和 [docs/ENGINES.md](../../docs/ENGINES.md) 原主题节，交接登记 [CROSS-END-HANDOFF.md](../../CROSS-END-HANDOFF.md)。checkbox 只留本工单，不复制到交接索引。
4. 每阶段在本地独立验证与提交，报告提交 SHA、文件列表、实际测试与未验内容。用户尚未要求本工单推送/创建 PR，不主动推送、合并或操作 main。

**完成定义**：P0 + P1 必须有真实 HTML 动态 MP4、明确可消费的 Schema/错误语义、兼容的旧导出回归与可核验日志，才算后端/接口交付；P2 页面/Mock 未交付前**不能宣布产品端到端完成**。


## 2026-11-08 实施结果与阶段检查

- 限定授权：用户在本会话就 PV shared 契约/纯 HTML runtime、独立模型任务、后台配置和原 export 的兼容分支回复「确认上述限定范围」。未改 SongProject、Client、Mock、React/Hook/CSS。P0 本地提交 `be95902`；P1/交接另提交，均未推送。
- P0：严格四段快照/设计、指纹、数量/数值/未知字段校验；API 与 pv_design 路由/密钥持久化/后台任务清单已实现；不自动触发、不回退其他模型。真实验收工具仅在显式开关下在其进程里指定现有可用模型，不写回用户配置。
- 真实两首新歌词/不同曲风：`deepseek-v4.1-flash`，provider=default；「黎明前的纸灯」一次调用 43,573ms，prompt/completion=2240/8657；「磁暴后的奔跑」一次 53,274ms，2641/10891；均通过完整设计/ID/复杂度校验，图层类型、数量、布局和关键帧不同，不是固定模板换色。费用未知为 null，未做费用估算。
- P1：同一 pvDocument/renderAt 供 opaque sandbox 预览和离线 Chromium；native sandbox/离线/网络拒绝/CSP/文本转义。固定24fps，145s帧阶段/150s watchdog、170s 总预算、512MiB临时帧、共用编码互斥；原 Canvas/ASS与音频路径保留。没有另起常驻渲染服务。
- 真实 25s HTML MP4：1280×720、600帧、24fps、音视频轨道/时长由 FFprobe 验证；约77.7s，临时帧454MB，Node观测324MB、2秒采样进程树约1.22GB（含验收harness，非严格瞬时峰值）。12.5s SSIM=0.990783，14s有效歌词 SSIM=0.990036；完整解码无黑场，首末帧/音频完整。字幕/署名单源，未额外叠ASS。首轮截图触发145s预算并清理，改CDP捕获后上述实际通过。
- 资源缺失与旧模式：HTML禁用/缺失明确503，旧请求可继续；禁用HTML Chromium后原四背景/ASS+真实FFmpeg的页面导出1/1通过。预算/失败不输出伪MP4、不改工程。增加响度测量的可选超时，仅HTML用剩余总预算，旧调用默认120s不变。
- 安全补充：Admin state/llm 不返回 systemPrompt；服务端对表单省略的原 prompt 保留，不因脱敏丢配置，显式空串可清除；密钥仍按原DPAPI，未放松Host/Origin/CSRF。模型不输出任意DOM代码，SVG仅白名单基本形状，不接远程素材。
- 交付入口：完整 Schema/类型/错误/新旧请求见[架构](../../docs/ARCHITECTURE.md#ai-html-pv)，资源/复现见[引擎](../../docs/ENGINES.md#html-pv)，交接 ID [35-ai-html-pv](../../CROSS-END-HANDOFF.md#35-ai-html-pv)。独立离线可拖动 seek 的 `temp/task35/preview-harness.html` 和实际 `ai-html-pv.mp4`、`mix.wav`、两份设计 JSON、FFprobe/SSIM/资源报告可本机检查。
- 测试及边界：快速/资源数字统一见[迭代日志](../../docs/iteration-log.md#ai-html-pv-35)。音频为本地规则Web Audio混音/元音演示，真实LLM只生成视觉数据；未生成真实中文歌声，不把此成片当作正式LOOP!页面端到端或人工观感验收。P2剩余执行已转入工单36，本文不再重复维护checkbox；整单仍等工单36/6实际回执，留在当前目录不归档。


## 分阶段文件清单

P0（`be95902`）：`CC-Tasks/后端/35-ai-html-pv.md`、`CROSS-END-HANDOFF.md`、`docs/iteration-log.md`、`scripts/verify-html-pv.mjs`、`server/admin-config.mjs`、`server/admin.mjs`、`server/index.mjs`、`server/public/admin.js`、`server/routes/pv.mjs`、`server/services/llm-router.mjs`、`server/services/pv-render.mjs`、`server/services/pv.mjs`、`shared/contracts/CHANGELOG.md`、`shared/contracts/pv.d.mts`、`shared/contracts/pv.mjs`、`tests/pv.test.mjs`、`tests/support/pv-fixture.mjs`。

P1/交接（随本轮后续提交）：`CC-Tasks/后端/35-ai-html-pv.md`、`CROSS-END-HANDOFF.md`、`README.md`、`docs/ARCHITECTURE.md`、`docs/ENGINES.md`、`docs/INTERFACES.md`、`docs/iteration-log.md`、`scripts/verify-html-pv.mjs`、`server/admin-config.mjs`、`server/admin.mjs`、`server/routes/export.mjs`、`server/services/export.mjs`、`server/services/loudness.mjs`、`server/services/pv-render.mjs`、`shared/contracts/CHANGELOG.md`、`shared/contracts/index.d.mts`、`shared/contracts/index.mjs`、`tests/pv.test.mjs`、`scripts/check-html-pv.mjs`、`shared/pv-render.mjs`、`shared/pv-render.d.mts`、`tests/browser/pv.spec.js`。

2026-11-08 前端汇总：Toge 的统一执行入口为[工单 36](../36-toge-backend-followup.md)，沿用 35-ai-html-pv；本单范围/阶段文件清单与真实成片证据保留，不因文档归并宣称页面完成。
