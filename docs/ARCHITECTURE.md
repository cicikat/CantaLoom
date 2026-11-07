# SONGYU 架构、数据与接口

这里维护当前代码结构、工程保护和前后端调用方法。分工与协作规则见 [TEAM_WORKFLOW](TEAM_WORKFLOW.md)，引擎安装和后台见 [ENGINES](ENGINES.md)。历史测试数字与交付过程只在[迭代日志](iteration-log.md)，待办只在 [CC-Tasks](../README.md#协作工单)。

<a id="system"></a>

## 系统边界与目录

单仓库、React + TypeScript / Vite 前端、Node + Express 后端；没有数据库、登录或微服务。浏览器负责工程、音乐计算、播放与混音；后端负责带密钥的 LLM、外部引擎、缓存与 FFmpeg。

开发时 Vite 5173 经 /api 代理到 loopback 后端，默认 3001；构建后 Express 同源提供 dist 与 API。所有 VITE_ 配置均对浏览器公开。服务端不导入 src/React，共享模块不做 I/O、不读取环境或秘密。

| 目录／文件 | 用途 |
|---|---|
| `src/main.tsx`、`App.tsx` | 浏览器入口与页面组合 |
| `src/components/`、`*Panel.tsx`、CSS | 展示与交互；`visual.ts` 管程序化画面/字幕 |
| `src/hooks/` | useStudio / usePlayer / useQixuan，协调状态与交互 |
| `src/features/project`、`export`、`singing` | 工程恢复/保存、导出、歌声结果与历史事务 |
| `src/api/` | client：请求/超时/校验；mock：独立测试 transport |
| `src/model.ts`、音乐模块 | 工程数据、保护策略、计划/旋律/调教；浏览器运行不等于 UI 所有权 |
| `src/audio.ts`、`audio-mix.ts`、`external-audio.ts` | 共同试听/混音入口、处理、外部资产适配 |
| `server/index.mjs` | 启动、装配与配置 |
| `server/routes/`、`services/` | HTTP 与引擎服务，含 melody / free-composition / production |
| `server/admin*.mjs`、`public/` | 本机管理 API、DPAPI 配置与无构建管理页面 |
| `server/singing.mjs`、旧平铺导出 | 既有文件交换接口与 instruments/qixuan/planner 兼容导出 |
| `shared/contracts/` | API Zod Schema、相邻 TS 声明与变更记录 |
| `shared/*.mjs`、`.d.mts` | 唯一 SongPlan、MIDI、旋律/调教/时间轴/伴奏纯逻辑 |
| `scripts/`、`openutau-bridge/` | 启动、实测/报告工具、小型 .NET 引擎桥接 |
| `tests/`、`tests/browser/` | 单元/接口及 Playwright 页面流程 |
| docs/ | 协作流程、架构与接口、引擎与后台、迭代日志 |
| CC-Tasks/数字-任务简述.md | 本项目计划/工单，含清单、Owner、依赖、验收和 checkbox；旧工单标明历史范围 |
| `.github/`、根目录配置 | CI、npm 命令、Vite/TS/Playwright 配置与环境示例 |
| `03_patchlab_playful.html` | LOOP! 布局、样式与交互的设计源；正式接线在 App / PatchlabCreation / patchlab.css；文件自身保留原始演示 |
| `dist/`、`node_modules/`、测试输出 | 可生成的本机产物，忽略提交；不自行清理他人文件 |

<a id="prototype-frontend"></a>

## LOOP! 原型作为前端的接线边界

2026-11-07，toge 明确要求删掉当前接线、重新接入 `03_patchlab_playful.html`。`index.html` → `src/main.tsx` → `App.tsx` 现在加载 LOOP! 单页，停止挂载原四页工作台及 style.css / plan.css。`src/patchlab.css` 提取原型样式并补实际控件；保留船、日落、贴纸、主题按钮、TAP、积木、歌词与 PV 区域。旧样式和可复用模块留在仓库，旧四页 App 可从 Git 历史查询，存档没有迁移或清除。

| 原型区域 | 当前实际接线 |
|---|---|
| 灵感输入与一键开工 | PatchlabCreation → useProduction → 统一 Client；主题 1–500 字，输入框左侧铅笔按需打开歌词、速度与时长设置；真实阶段、取消等待、失败保留、缺失句重试、完整校验后一次应用；四个主题按钮填写意图，不伪造新模式的曲风字段 |
| 音乐积木与 TAP | 由 SongProject 当前段落实际音轨生成，六类音轨不固定为原型五条演示轨；段落选择在 LOOP BOARD 标题内，16 格为四拍概览；锁定、静音、单轨试听、独立重做、手改格子、拖动及 ↑↓ 顺序均写回工程。自由作品保留格子编辑与整轨重做限制，使用逐句卷帘 |
| 本地规则与方案 | 「本地搭建积木」无需模型；「创作配方」显示有效计划与保护决策，可使用既有 api.plan 更新旧模式积木方案。自由作品不套用旧模板 |
| 歌词卡片与歌姬 | 按实际歌词数量展示，旧模式可编辑文本；自由模式保留原词，卡片下的「编辑旋律」展开同页 PianoRoll 并选中对应句。复用音符/句锁、局部重作与代次保护；折叠区复用 QixuanPanel 逐句演唱与重唱 |
| 播放与 PV | 同一个 usePlayer / AudioEngine 时钟，Landscape / drawPV 读取实际工程和 time；WAV / PV / 工程仍走原导出链路，字幕样式和换色实际持久化；播放进度留在积木底栏，首页无悬浮播放器。PV 预览是页面第三章 `#pv`（区域名「歌词 PV」），导航「PV ✦」滚动到该章；章内的「PV 进度」条与积木底栏共用同一时钟。导出作品仍是原生 dialog 弹层，支持 Escape 与焦点返回 |
| 音色与状态文案 | 元音演示和外部歌声分开显示；Mock 明确标记；静态 AGENT IS READY 改为配置或本地可用状态。保存/导出、有效计划、音源、MIDI、USTX 和文件交换可在右上角作品设置访问 |

2026-11-07，toge 反馈接线新增的注释与控件使页面臃肿。本轮撤回新增默认区域；首页仅保留原稿布局，制作便签仅在实际任务后出现，制作准备与来源说明收进创作设置，作品信息/配方/引擎放入作品设置。歌词卡片回到正文加一个主按钮，单句试听/锁定为卡片角落控件，额外逐句演唱区按需打开。原始 HTML 及后端/共享契约未改。桌面首屏高度和积木起点与原稿差异 ≤2px，手机截图已检查且无横向溢出；结果与范围见[版式收简](iteration-log.md#loop-layout-restoration)。

同日 toge 要求把单页重构为三个视觉章节（[工单 19](../CC-Tasks/19-three-chapter-page.md)），因此首屏高度与积木起点不再对齐原稿，原稿的卡片、贴纸、积木和歌词便利贴保留：

| 章节 | 结构与实现 |
|---|---|
| 1 · 首屏 `#compose` | 至少占满一屏。`HeroTitle` 给标题一份完整读屏文字，动画字母对读屏隐藏；`src/chapters.css` 用 `--beat` 节拍让左右元素交替入场，「变成一首歌！」逐字由旋转星星弹出并向右溅碎片 |
| 2 · Music Blocks + 工作台 `#board` / `#lyrics` | `ChapterBridge` 是首屏之后的一段高滚动区（向上叠住首屏最后一屏），内部画面固定在视口；滚动进度写入 CSS 变量 `--p`，五个圆据此依次上升，铺满后显示 `Music Blocks` 并停留，之后接淡紫色工作台。过渡层 `aria-hidden`、不接收点击 |
| 3 · MV 放映页 `#pv` | 深色章节，含字幕走马灯、胶片框画面、播放条、字幕样式/换色/导出与说明；画面仍是 `Landscape` / `drawPV`，未改画面与导出代码 |

系统开启「减少动态效果」时，入场动画、过渡的圆和滚动联动全部关闭，过渡章变为普通纯色标题块。`.page` 使用 `overflow: clip`（替代 hidden）以保证过渡层的粘性定位生效且不产生横向滚动。

正式首页不再运行原型的随机格子、随机换词、独立振荡器或字幕定时器。原 HTML 文件保留原始演示，并提供正式入口说明，不能用 file:// 单文件代替 Node / Vite 应用。未改后端、公开契约、模型、混音或导出算法；UI 继续经既有 hooks、Client 和导出用例接入。原型重接后的构建、29 项相关单元测试、26 项 Mock 页面测试及 10 项真实模式页面/接口夹具已通过，详见[本轮记录](iteration-log.md#loop-prototype-wiring)。真实模型、绮萱、MP4 编码与人工听感仍按[工单 6](../CC-Tasks/6-joint-acceptance.md)验收。

<a id="launch"></a>

## 日常启动与制作准备

「打开声屿.bat」是面向使用者的入口，本机桌面「声屿」指向它。scripts/reuse-studio.mjs 先检查当前端口的 health、页面标识、与本地 dist 相同的资产路径和 JS 内容哈希；匹配则直接打开正在运行的当前版本，--check / --no-open 不开浏览器，也不停止已有进程。未匹配或服务未运行时，原样传递参数给现有 start.bat；没有第二套构建/服务启动逻辑，也不处理、停止或抢占其他程序。既有启动器负责环境/端口检查、按 lockfile 补依赖、构建、启动同源服务、确认页面与资产后打开浏览器。`--check` 不打开浏览器并在检查后退出，`--no-open` 保持服务但不打开浏览器。双击入口的启动逻辑未变，App 已切换为 LOOP! 接线；原 HTML 提示已改为实际首页入口说明，见[原型边界](#prototype-frontend)。

useProductionReadiness 通过既有 health / engines / qixuan Client 只读检查本机配置与资源；在进入页面、回到窗口及点击「重新检查」时刷新，使用代次保护丢弃过期检查结果。它接管原 useStudio 的 health 刷新，不新增 API 或改服务端设置。当前 production 服务要求 LLM、伴奏音源、歌声服务和 FFmpeg；缺项/未连接时「一键开工」仍可点击，打开已有创作设置并聚焦其入口，列出缺项、本机设置与本地积木选项；不提交 production 请求。只有正在操作、任务运行中或主题为空时禁用按钮；不为缺项新增常驻说明栏。

正式构建使用同源 `/admin`，开发联调沿用原有后端 loopback 管理地址；管理限制不变。前置检查不调用 LLM、渲染器或下载资源；llmStatus 继续来自真实 health，资源就绪不记为实际上游调用成功。Mock 仍为显式测试数据，真实模式没有自动回落 Mock。已有后台受理的任务、当前工程与存档不因准备状态刷新被改写。

本次入口验收与实机资源缺项见 [工单 16](../CC-Tasks/已完成/16-easy-launch.md)、[启动记录](iteration-log.md#easy-launch)。

<a id="project-data"></a>

## SongProject、SongPlan 与保护策略

SongProject 保存稳定 ID、版本、音符、歌词来源、锁定/静音和资产依赖。事件以 beat 保存，播放、字幕、导出统一按 beat * 60 / bpm 换算。JSON 不内嵌密钥、模型或真实音频；换电脑后缓存缺失可能需要重新生成。

下面的 SongPlan/保护策略适用于旧计划模式；自由作曲的完整旋律由 compose/MelodyDraft 返回，不把四句模板套到新模式。

### SongPlan 契约

前端、Node 接口、工程导入共用 `shared/song-plan.mjs` 的 Zod strictObject。嵌套对象也拒绝未知字段。类型声明在相邻 `.d.mts`，不需要新的服务器运行时。

| 字段 | 约束 | 对真实音符的影响 |
|---|---|---|
| key | C/D/E/F/G/A/B；major/minor | 移调与自然大小调音阶；和弦、贝斯、主旋律、演示人声一起使用 |
| emotion | calm / melancholic / bright / driving | 持续或短促的音符时值、演奏语气 |
| intensity | 0–1 | 音符 velocity；旋律每拍 1、2 或 4 个音的密度 |
| chordProgression | 恰好四个整数级数，每个 1–7 | 每小节一个三和弦，贝斯跟根音；全曲按绝对小节位置循环 |
| drumDensity | sparse / steady / busy | 踩镲间隔、底鼓与军鼓/过门密度 |
| melodyContour | rising / falling / arch / level | 音阶级数随段落上行、下行、先升后降或附近徘徊 |
| melodyRange | narrow / medium / wide | 上述走势使用的音域跨度 |
| sectionEnergy | intro/verse/chorus/outro 各 0.2–1 | 段落力度；鼓点与伴奏的分层密度 |
| reasons | 1–5 条；有限 decision 枚举，reason 1–120 字 | 普通中文解释，不作为指令执行 |

主旋律强拍靠近当前和弦音，弱拍使用同一调式的音阶音。元音演示的音高也遵循同一计划；星羽用音色区分，不再在计划模式下偏移两个半音，以免脱离调式。单轨重生成仍保留版本变化，使用和弦转位、轻微切分、力度或时值变化，不以换一个种子冒充应用计划。

### 锁定、手写与兼容

- 锁定轨道保留完整数据，包括 ID、版本、notes、静音和来源。
- 手工格子编辑的轨道同样在重新规划时保留。明确点「单轨重生成」或「重做未锁定积木」仍代表用户允许重做未锁定内容。
- 只有鼓点锁定时，不限制调性/和弦更新。录入过节奏时保留底鼓落点，密度建议调整补全部分；关闭补全后重规划也不会添加军鼓/踩镲。
- 如果某段存在带音高且有音符的锁定轨道、手写轨道或锁定歌词音符，**维持原来的全曲调性与和弦，并冻结该段所有带音高轨道与歌词音符**。该段仅更新允许改动的鼓点；其他段按有效计划生成。
- 这是保守的兼容策略，不分析任意人工音符的调性，不自动修复原本就存在的不协和，不偷偷改写锁定旋律。需要更改被冻结段落的和声时，先解锁相关内容；手工编辑轨道需要明确重生成后才解除手写保护。
- 手写歌词文本在重新规划中保留；未冻结段落的歌词旋律可以响应新计划。冻结段落保留整句歌词及其音节对齐，避免文字与演示音符错位。
- 页面展示的是保护策略调整后的**有效计划**，并单独说明被冻结的段落，而非声称 LLM 所有建议都已执行。

### LLM 状态与失败处理

- `local`：没有服务端 Key，使用本地关键词/风格规则，明确未调用 LLM。
- `unverified`：Key 已配置，但尚未成功返回有效方案，或最近一次调用失败。配置不代表真实接通。
- `verified`：当前 Node 进程最近一次实际上游调用成功，且完整输出和返回信封经过共享 Zod 校验。LLM 负责计划，本地算法负责音符与合成；不称为模型生成音频。

`/api/health` 提供运行时状态，`SongProject.planning` 保存当前方案来源、应用时间、模型名和兼容说明。导入工程的来源仅显示为「工程记录」，不当作本机刚刚完成的真实调用证明。

失败请求、错误 JSON、字段缺失/越界都不会应用部分结果。浏览器完成整个新工程后一次替换 state，并保留原有异步请求代次保护。失败时提示工程保留，用户可以明确选择「使用本地规则生成」。没有 API 服务/Key 时，本地模式完全不调用规划接口。

### 旧工程

保持 schemaVersion=1，新增可选 songPlan、planning、rhythmCompletion。旧 JSON 载入时不生成新音符、不覆盖 ID/版本；旧编曲器仍可运行。首次明确应用计划时才升级音乐内容。保存的新计划必须通过同一严格校验。

<a id="public-api"></a>

## 公共 HTTP 接口与统一 Client

基础契约在 `shared/contracts/index.mjs`，自由作曲/旋律/制作分别在同目录 `free-composition.mjs`、`melody.mjs`、`production.mjs`，TypeScript 声明在相邻 `.d.mts`。SongPlan 只使用 `shared/song-plan.mjs`。业务 JSON 请求统一 `Content-Type: application/json`，HTTP 错误为非 2xx + `{error:string}`；已受理的制作任务也可能在后续 200 响应中返回 state=failed。契约只含公共音乐数据，不含后台设置或密钥。接口、A1 Mock 和 A2 最小页面已提供；真实页面闭环仍需工单 6 验收，进度见[Toge 工单](../CC-Tasks/5-toge-free-creation.md)。面向原型接线的可调数据与开关速查见 [INTERFACES](INTERFACES.md)。

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

音符单位始终为 beat；返回音频 startSeconds/durationSeconds 为秒。器乐从全曲零点开始，歌声包含本句休止及原有尾音。绮萱缓存依赖、take 规则、OpenUtau 参数和混音算法保持原实现；v0.3.3 起渲染先写 pending 文件、校验后原子改名入缓存，单句 WAV 拼接加 padding 内微淡入淡出（见[演唱调教与分轨混音](#performance)）。客户端为单句计算 dependency，再依据**最新工程**核对歌词、音符、runner、锁定后原子应用；生成期间用户编辑不能被覆盖。

`src/api/client.ts` 统一 base URL、JSON 编码、超时（含读 body）、错误解析、响应 Zod 校验与二进制类型校验。默认同源路径，经 Vite 代理；`VITE_API_BASE_URL` 可显式覆盖公共地址。未配置 CORS 的后端应继续使用代理，而非直接跨域。

`createApiClient({onTask})` 提供 plan/instrument/singing/export 请求的 `GenerationTask`，state 为 running/succeeded/failed，带 mock 和可选 error。它表示一次浏览器请求生命周期；compose/melody 使用 plan 类型。production 三个方法目前不发布这个 onTask 事件，需读返回任务的实际 state/stage。超时或断开不等于引擎子进程必然立即终止，不伪造百分比。

开发响应可带 `mock:true`；Mock 歌声音频必须同时 `isDemo:true`，真实绮萱必须 `isDemo:false`。Mock plan 的 source 保持旧 wire 格式以复用现有 Schema，但显式带 mock/model 标记；应用工程时记为 `source:local-rules, mock:true`，UI 显示固定测试方案，不记录真实 LLM 成功。Mock export 响应是明确标注的 JSON 状态回执。生产构建强制使用真实模式，不能通过 `VITE_API_MODE=mock` 冒充实际推理。

变更流程见 [TEAM_WORKFLOW.md](TEAM_WORKFLOW.md) 和 [共享变更记录](../shared/contracts/CHANGELOG.md)。

<a id="composition"></a>

## 自由创作与单句编辑

### 完整创作结果

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

### 事务与制作结果的校验

`FreeInput`：intent 为1–500字；可选 lyrics 为1–8行、每行1–100字，手写文字原样保留；bpm 为整数60–160；targetSeconds 为20–30，默认25。时间轴按小节分配，不承诺精确等于目标秒数。旧 plan 仍是四句计划接口，不承载新自由创作。

compose 只生成规划与旋律，由 `projectFromComposition` 建立完整自由工程；失败不应用半成品，不退回旧模板。新正式作品不能再调用旧 applySongPlan/composeFromIdea 覆盖其旋律。局部编辑用 melodyRequest → api.melody → applyMelodyDraft，保留非目标句与锁定音符。调用前后还需核对当前工程与操作代次，避免完成时覆盖期间编辑。

production 串联规划、旋律、器乐与歌声。stage 契约枚举为 queued/checking/composing/planning/melody/validated/instruments/singing/ready-for-mix；state 为 running/succeeded/failed。不要假定每次轮询会观察到所有阶段。只有 succeeded 且 ready-for-mix，并经 validateProject 校验完整 project 后才原子应用。响应中的 project/composition 当前为 unknown，不能直接当作已校验工程。阶段就绪不是 MP4 已导出，仍需浏览器 renderAudio 与导出用例。

任务最多30条、进程内存保存，重启或任务淘汰后查询可404，前端保留已保存工程。歌声失败时按 error/phraseId/completedPhrases 展示，可重试缺失句，复用已有结果；规划失败不能保证恢复中间态。超时和状态查询成功都不是作品完成证明。

<a id="piano-roll"></a>

### 单句钢琴卷帘、锁定与重唱

1. 保留词重作曲：`const req=melodyRequest(project,intent,[lineId]); const result=await api.melody(req); applyMelodyDraft(latest,req,result.draft)`。不重应用宏观规划，不重生成无关伴奏。完成时仍需核对当前工程ID/操作代次。
2. 音符锁：写 `lyric.notes[].locked`；乐句锁写 `lyric.locked`，沿用人声轨锁定。服务校验锁定音符逐字段不变，非目标句不变。
3. 只调教：`setPhrasePerformance(project,lineId,{preset:'soft',...})`，保留全部音符，然后仅调用当前句重唱。复用已有 generateQixuan / applyVocalResult / 历史版本处理。
4. 编辑音符后更新该段 vocal 混音轨（syncVocal），不要重建所有句ID。编辑第二句时不要清空 vocalAssets；依赖校验会自然标记第二句过期，第一句缓存继续有效。
5. 改词：`setLyricText(project,lineId,text,{keepMelody})`。`keepMelody:true` 要求新歌词唱字数（`\p{L}\p{N}`）与现有唱词音符数一致，按时间顺序重挂音节、保留全部音高与时值；不一致则报错，不擅自增减音符；会改写锁定音符唱字时明确拒绝。`keepMelody:false` 清空本句音符与按旧音符索引的 performance overrides，随后用 melodyRequest + `targetIds=[lineId]` 重新作曲（沿用第 1 条事务）；句内含锁定音符时明确拒绝，不静默清除。两条路径都同步 syncVocal、递增 version，只使本句演唱依赖失效，失败不修改工程。
6. 编辑音高/起点/长度：`editPhraseNotes(project,lineId,notes)` 接受等数量、同 ID、同时间顺序、同音节的音符数组，逐音符经 melodyNoteSchema 校验并检查越界/重叠；锁定音符逐字段不变。不满足「只改音高、起点、长度」的编辑（数量、顺序、音节变化）明确拒绝，改用重新作曲或歌词编辑。音符数量不变时按索引的 performance overrides 保持有效。
7. 重唱与版本：单句重唱复用 `POST /api/singing/qixuan/render`（take 递增），旧版本自动进入 vocalHistory（最多 3 版）。`restoreVocalAsset(project,lineId,index)` 仅在该历史版本的 dependency 与当前歌词/音符/调教一致且 runner 匹配时恢复为当前演唱，被替换版本轮换入历史；歌词或音符已改的旧版本明确拒绝恢复，不制造词音错位。渲染失败不调用 applyVocalResult，旧资产保留。

#### 当前页面接线（工单 5 C 前两项）

自由作品生成或导入后，点击 LOOP! 歌词卡片下的「编辑旋律」，在同页展开 PianoRoll 并选择对应句；旧模板作品保持文本与单句重写交互。PianoRoll / usePhraseEditor / hooks/phrase-edit.ts 为本轮前端接线，复用既有 Schema、Client、melodyRequest / applyMelodyDraft 与自动表达纯函数；没有修改 shared、model、Client、服务或音乐算法定义。

- 按句选择、点音符或下拉选择音符；拖动改变音高和位置，右侧小柄改变长度。方向键改音高/位置，Shift＋左右改长度；拖动/键盘以 1/8 拍微调，精确数值也可直接填写，保留原有小数时间。音高范围沿用 MIDI 48–84，长度至少 1/8 拍，不允许重叠、越过句界或断开的 + 延音。
- 手工编辑保留 note ID；按时间排序后，为非 + 音符重新按原歌词字符对齐。若排序会改变锁定音符的歌词则拒绝整次修改；不增删音符、不改歌词原文。编辑器始终按稳定 ID 保持选中项。
- 句锁、音符锁和已有段落人声轨锁共同生效。锁定切换不改变实际音符时间/音高或歌声依赖；修改音符只更新该句及相应人声显示片段。手工编辑和局部结果应用均保留兄弟句、人声显示音符 ID、其他轨道和已有音频引用，不整段重置显示 ID。
- `melodyRequest(project,intent,[lineId])` → `api.melody` → `applyMelodyDraft` 后做前端适配，保留非目标草稿的完整数据，并核对当前工程、请求代次、锁定及音乐约束。修改工程/生成要求、切换句子、离开页面或停止等待会丢弃迟到响应；无效结果保留旧工程，不自动套旧模板。
- 重排时 current performance 与 performanceHistory 的逐音符 overrides 按旧 note ID 找新索引。生成替换了 ID 时，仅 Auto 模式中未锁定、origin=auto 的控制通过现有 automaticPhrase 重算；手工、锁定或来源不明的控制无法对应时拒绝整个生成结果，避免错误挂到另一音符。没有新增 Auto/Manual、preset 或混音控件。
- 音频引用保留，是否需重唱继续由 currentVocalAsset / vocalReady 判断。只改第一句使第一句过期，其他句和伴奏仍有效；先在原绮萱面板补该句，再试听。旧单句 WAV 可作为上次演唱保留，不称其为当前有效演唱。
- Mock 局部重作使用两版固定八度测试旋律，不按要求推理；部分音符锁定时沿用 A1 的整句保留夹具。全部音符锁定时不发起重作。页面/Mock 通过不代表真实 LLM 续写、实际歌声或人工听感通过。

现有后端音乐校验仍要求未锁定音符符合调式/强拍和弦；卷帘允许手工半音编辑，但要在局部生成中原样保留调外音符时，应先锁定它。现有音乐校验失败会保留工程，不在前端偷偷改音或放宽后端约束。音符增删、歌词文本改写、表达控制台和混音控件不属于本轮范围；证据见 [C 钢琴卷帘记录](iteration-log.md#c-piano-roll)。

### 来源与画面边界

- 旧 plan 生成标题、氛围、四句歌词与 SongPlan，本地规则生成具体音符；允许明确标注的本地模式。
- 新 compose 以一次事务生成宏观规划与 MelodyDraft；production 再协调器乐和歌声。真实 LLM 历史调用已有记录，不再写作“尚无真实密钥验证”；是否配置、调用成功、作品主观质量仍须区分。
- 音符数据通过共享 Schema 与音乐约束校验；LLM 不直接输出最终音频。手写歌词、锁定与局部编辑保护不能被生成覆盖。
- 画面为原创程序化 Canvas；VisualPlanner 的关键词与配色是本地规则，无 AI 生图调用。LOOP! 正式首页已复用工程、播放时钟及该 Canvas；原始 HTML 自身保留演示逻辑，见[原型边界](#prototype-frontend)。
- 正式新自由入口、Mock 与人工听感的缺口统一见[Toge 工单](../CC-Tasks/5-toge-free-creation.md)，不在本文件复制待办。

<a id="production"></a>

## 自动制作与真实阶段

### 首页最小创作流程（A2）

首页 `PatchlabCreation` 在原型首屏负责主题、可选手写歌词、可选 BPM 和目标时长；底部播放器继续复用 useStudio / usePlayer。原 FreeCreation 组件不再挂载。`useProduction` 通过既有 Client 的 `startProduction` / `production` / `retryProduction` 协调请求，不在组件内新增 fetch，不改公开契约、服务或音乐算法。Owner 为 toge，调用原有 validateProject / validateMelody / currentVocalAsset 进行只读校验。

- 先按 freeInputSchema 校验输入；空行忽略，非空手写行保留原字词与空格，支持 1–8 行、每行最多 100 字。未填写歌词时由对应真实服务或明确 Mock 夹具提供；不调用旧 composeFromIdea。
- 以约一秒间隔依次查询任务，展示返回的 state/stage 和已完成句数，不假定能观察到全部阶段，不显示百分比。Mock 显示“测试阶段”。
- 仅 succeeded / ready-for-mix 后校验完整自由工程、20–30 秒时间轴、手写词/来源与输入一致、旋律和实际音符一致、每句演唱引用有效，再经 useStudio.change 一次应用并复用原播放器。不重建谱面、不把部分 project 提前存入当前工程，也不把 ready-for-mix 称为已导出视频。
- 修改自由输入、调整当前工程、离开输入页、停止等待或卸载都会使操作代次失效；停止后不再轮询，迟到响应不能覆盖工程或新请求状态。Client 已发出的请求与后台已受理制作可能继续运行，界面明确说明这一点。
- 失败、超时、错误 JSON/工程或任务丢失时保留旧工程，无自动模板回退；任务丢失提示重新制作。singing 失败可按返回 phraseId 逐句重试缺失演唱，仍等整体成功后应用。
- 新作品成功后替换浏览器当前工程，入口提示先导出需要保留的作品；仍使用既有 Mock/真实存档隔离，刷新后可用底部播放器试听保存的工程。未改变旧 JSON 恢复方式。
- 自由作品继续禁用旧模板重作曲、节奏覆盖及旧格子/歌词改写，避免把新谱面送回旧作曲器；C 的钢琴卷帘与局部旋律现已在虚拟歌姬页接通。试听、静音、锁定、现有演唱/导出沿用；调教和混音控件尚未交付。

本次证据见 [A2 迭代记录](iteration-log.md#a2-free-creation-page)，工单 checkbox 仅在 [工单 5](../CC-Tasks/5-toge-free-creation.md)。上述是 React 工作台接线的历史结果；LOOP! 原型接线后的真实闭环与人工听感仍跟踪 [工单 6](../CC-Tasks/6-joint-acceptance.md)。

### API 调用顺序

1. `api.startProduction({intent,lyrics?,bpm?,targetSeconds?})` → 202 job id。
2. 用 `api.production(id)` 轮询真实 state/stage：checking、planning、melody、instruments、singing、ready-for-mix。没有百分比。
3. 只有 state=succeeded 且 stage=ready-for-mix 时，`validateProject(job.project)` 后再原子应用。该阶段表示乐谱/伴奏缓存/歌声就绪，**不是** MP4 已导出。浏览器仍调用统一 renderAudio 和现有导出用例。
4. singing 失败时显示 error、phraseId、completedPhrases。`api.retryProduction(jobId,phraseId)` 只重试缺失句，不重新调用 LLM，不清空兄弟音频。尚未完成的其他句可逐句重试。

制作队列为本机内存中最多30个任务，不是持久化调度器；重启后404，前端须保留当前已保存工程。规划失败的任务没有完整工程，需要重新发起创作；当前不支持跨进程恢复规划中间态。已完成伴奏和歌声由既有内容缓存复用。生产任务纳入后台 jobs 来源，运行中禁止后台改配置，保留 Host/Origin/CSRF/DPAPI 限制。

<a id="performance"></a>

## 演唱调教与分轨混音

### Auto / Manual

Performance 可选 mode=auto/manual、energy、locked、overrides。旧 JSON 无新字段仍可读。Auto 分析音符时长、间隔、跳进、重复音、乐句位置、歌词标点和 SongPlan 能量；不是随机修改 MIDI。

- `autoTuneProject(project,lineId?)`：全曲或单句自动调教，保留音符与歌词，跳过锁定句/轨/表达。
- `setPhrasePerformance`：手动字段优先，记录最多3版历史。
- `restorePerformance`：恢复上一版；表达锁定后禁止自动覆盖。
- overrides 用当前句的音符 index 指定参数；UI 调整音符顺序后须核对这些索引，不要把旧索引悄悄套到另一音符。
- overrides[].pitch 是可保存、可编辑的单音符 Pitch 曲线（v0.3.3）：x=相对音符毫秒、y=十分之一半音、shape=io/i/o/l，2–64 个严格递增点；提供时替换该音符自动过渡点（snap_first=false），经 notePerformance 进入 USTX 与演唱依赖。清除曲线即恢复自动过渡。契约与兼容记录见 [CHANGELOG v0.3.3](../shared/contracts/CHANGELOG.md)。
- 每次仅改变表达后只重唱该句，沿用现有 generateQixuan / applyVocalResult；不得重生成歌词/旋律。缓存含歌词、音符、表达解析版本与渲染修订。
- `performancePlan(project)` 可导出实际逐音符规划和 DYN 曲线。此为确定性分析结果；工程持久化的是每句 Performance 与人工 overrides/history。

使用真实支持的 USTX Pitch x=毫秒、y=十分之一半音、phoneme offset=按BPM换算的tick；大跳不强制连滑、长音延迟进入小颤音、休止后不提前辅音。没有伪造 breath/ENE 属性，未暴露未验证参数。

### 分轨与混音

2026-11-07 页面接线：每句 `QixuanPanel` 内新增默认折叠的「演唱调教」，支持 preset、Auto/Manual、四个句级数值、按音符稳定 ID 选择的人工覆盖/锁、句级表达锁，以及最多三版调教恢复。`PerformanceControls` 调用现有 `setPhrasePerformance` / `autoTuneProject(project,lineId)` / `restorePerformance`；输入范围来自共享 Schema，未修改音乐核心或公共契约。保存表达后由现有重唱按钮仅生成当前句，不重新调用作曲/旋律接口；失败保留旧资产，依赖过期由现有规则显示。原有 Pitch 曲线在修改四个数值时保留；「清除音符覆盖」会明确清除所选音符整项覆盖。表达锁仍进入既有演唱依赖，切换后可能标记本句需要重唱，本轮没有改依赖算法。

歌词区底部新增默认折叠的「混音与分轨试听」。`MixControls` 只更新并校验 `SongProject.mixSettings`；`usePlayer.play({stem})` 将现有 stem 选项透传给 `AudioEngine.play`，分轨从头播放。改设置通过既有 `change` 停止旧声音，下一次试听与既有 WAV/PV 用例读取同一设置；不新增 fetch、音频缓存或导出接口。人声音量/混响仅对 external 歌声启用；bandGain 仅对 fluidsynth 启用，浏览器 synth 未接增益，禁用并提示。toge 明确选择「只接前端，核心问题交接红茶」，未改 `audio.ts` / `audio-mix.ts`；交接 [5-C-synth-mix](../CROSS-END-HANDOFF.md#5-c-synth-mix)。接线与测试证据见[本轮记录](iteration-log.md#expression-mix-controls)，真实引擎与听感仍待工单 6。

`renderAudio(project,{stem:'vocal-dry'|'vocal-processed'|'instrumental'|'mix'})`，同一渲染入口服务于试听、WAV、PV。

- 单句拼接：外部歌声 WAV 以 startSeconds 精确落位；v0.3.3 起对每个单句 WAV 在引擎 padding 内施加 50 ms 淡入 / 150 ms 淡出（`phraseEdgeFades`，演唱主体不触碰），避免拼接爆点并自然保留混响尾音。这是拼接处理而非效果，对 vocal-dry 与处理后分轨一致生效。
- vocal-dry：当前歌声按时间轴拼接、无增益/EQ/压缩/混响；缓存中的原始44100Hz单句 WAV 不修改。浏览器导出为24000Hz立体声时间轴，不是原始文件的逐字节拷贝。
- vocal-processed：人声低切、自适应高频收敛/压缩、轻房间混响。
- instrumental：伴奏平衡与声像。
- mix：相同处理后的全曲结果。

自由工程默认启用处理；`mixSettings={enabled,vocalGain?:0..2,bandGain?:0..2,reverb?:0..0.25}`。旧工程默认保留原混音行为；显式 enabled 控制。输入 RMS/峰值/高频差分决定部分处理参数，reverb 是克制默认，可调不是所有歌唯一效果。EQ为基础处理，不宣称专业动态去齿音或响度母带。

保留原始声库输出，不改模型与桥接器程序集。生产内录音质检查包括长度、非静音、峰值/削波；客观指标不能代表人耳音质验收。

### 创作主题

新提示词明确把 intent 当作音乐/情绪/动态要求，不直接照抄成标题或首句。不要求工整时允许散文歌、不等长句与自然标点，短歌建议总字数而不是每句固定字数。手写歌词仍原样保留。

<a id="mock"></a>

## Mock、调用状态与接线边界

直接 compose 调用的 Client plan 状态表示一次请求 running/succeeded/failed；不提供它的独立逐阶段订阅。自动制作请使用 v0.3.2 的 production 创建/轮询接口取得真实阶段，不必为了已有轮询能力另造 SSE 协议，也不能用定时器假装阶段推进。管理接口继续仅本机访问。

A1 已补 `/api/compose`、`/api/melody`、`/api/production` Mock。仍为关闭的本地路由列表，未知路径或不支持的方法明确404，不回落真实后端。FreeResult / MelodyResponse / MelodyDraft / ProductionJob 支持可选 mock:true；Mock compose 保留兼容的 source=llm 接口格式并带 model=mock-fixture-no-inference，draft 为 local-rules / mock。projectFromComposition 复用 buildFreeScore 后，工程 planning 为 local-rules / mock，模板词为 local-template，手写词仍为 manual。真实响应及旧工程不必补字段。

现有管理面板“检查引擎”通过 /api/admin/check 的 engines 分支读取 qixuan / FluidSynth / FFmpeg / GPU 等状态。管理 API 保留本机 Host/Origin/CSRF/DPAPI 限制。禁止为查状态电脑操控 OpenUtau 或将后台暴露到公网；必要的新状态项由后端增加诊断接口。

Performance 支持 natural/soft/strong、Auto/Manual、人工 overrides/锁定；只改表现后仅重唱该句。分轨与混音不是新增 HTTP 导出路由：浏览器 `renderAudio` 支持 vocal-dry/vocal-processed/instrumental/mix，原 WAV/PV 用例复用该入口。逐音符 overrides 按当前句音符索引，UI 调整顺序需核对。

Client 在解析前后检查顶层及已知嵌套 Mock 来源（project、composition、draft、melodyDraft、planning、歌声资产及历史），真实模式拒收；Mock 新三类响应必须显式带标记。导入及启动恢复复用相同检查，拒绝的存档保留并停用自动覆盖。API Mock、A2 最小页面和真实验收分别记录；A2 页面已在本地接通并通过 Mock 回归，真实现场创作仍待工单 6。

默认 Mock 制作阶段由轮询推进固定测试状态，不是实际引擎进度。测试可用 `createMockRequest(scenario)` 从 src/api/mock.ts 建立独立 transport；scenario 为 success / planning-failure / singing-failure / lost，不向公共请求加测试字段。歌声失败保留已完成测试音，逐句 retry 可复用已有 composition / project；ready-for-mix 后仍须浏览器混音。伴奏使用既有浏览器 synth，歌声为显式 isDemo/mock 的本地 PCM 测试音；没有安装或调用 FluidSynth / 绮萱。部分音符锁定时，Mock 保留该句全部现有音符，不假装真实 LLM 续写；无法满足音乐约束的过密或无可唱字符歌词明确失败。

A1 授权见[契约记录](../shared/contracts/CHANGELOG.md)，当前证据见[A1 迭代记录](iteration-log.md#a1-free-creation-mock)。浏览器回归输出统一放在项目根目录的 `temp/`：`npm run test:e2e:mock -- --output=./temp/songyu-a1-mock-test-results`。本机备份放在根目录 `backup/`；两者均由 Git 忽略，不提交截图、下载临时文件或备份内容。旧仓库外产物的迁移与缺失项见[归位记录](iteration-log.md#project-local-artifacts)。此项只调整存放约定，未重新验证 Windows 下载文件占用问题。

方法与边界见[自由创作](#composition)、[自动制作](#production)；真实历史执行与人工/网页验收缺口见 [v0.3.2 报告](iteration-log.md#v032)。
