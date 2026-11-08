# CantaLoom 架构、数据与接口

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
| 灵感输入与一键开工 | PatchlabCreation → useProduction → 统一 Client；主题 1–500 字，输入框左侧铅笔按需打开歌词、速度与时长设置（固定在视口右侧的滑出侧页，打开时锁住页面滚动，避免首屏误触章节转场）；真实阶段、取消等待、失败保留、缺失句重试、完整校验后一次应用；四个主题按钮填写意图，不伪造新模式的曲风字段 |
| 音乐积木与 TAP | 由 SongProject 当前段落实际音轨生成，六类音轨不固定为原型五条演示轨；段落选择在 LOOP BOARD 标题内，16 格为四拍概览；锁定、静音、单轨试听、独立重做、手改格子、拖动及 ↑↓ 顺序均写回工程。自由作品保留格子编辑与整轨重做限制，使用逐句卷帘 |
| 本地规则与方案 | 「本地搭建积木」无需模型；「创作配方」显示有效计划与保护决策，可使用既有 api.plan 更新旧模式积木方案。自由作品不套用旧模板 |
| 歌词卡片与歌姬 | 歌词区是工作台的侧页：`.bench-track` 并排放积木页与歌词页，平时歌词页 `display:none`；工作台滚到底停稳后，新的下滑手势才进入 Let's/MV，不用穿过隐藏歌词页。演唱卡片「打开逐句演唱 ↗」把整排左移 560ms 后收起积木页，「← 回到音乐积木」反向滑回，顶部导航总是回到积木页。只有滑动过程用 transform，停稳后两页都是普通布局。歌词页顶栏自带播放/暂停，「逐句演唱与重唱」折叠条常驻。按实际歌词数量展示，旧模式可编辑文本；自由模式保留原词，卡片下的「编辑旋律」展开同页 PianoRoll 并选中对应句。复用音符/句锁、局部重作与代次保护；折叠区复用 QixuanPanel 逐句演唱与重唱 |
| 播放与 PV | 同一个 usePlayer / AudioEngine 时钟，Landscape / drawPV 读取实际工程和 time；WAV / PV / 工程仍走原导出链路，字幕样式和换色实际持久化；播放进度留在积木底栏，首页无悬浮播放器。PV 预览是页面第三章 `#pv`（区域名「歌词 PV」），导航「PV ✦」滚动到该章；章内的「PV 进度」条与积木底栏共用同一时钟。导出作品仍是原生 dialog 弹层，支持 Escape 与焦点返回 |
| 音色与状态文案 | 元音演示和外部歌声分开显示；Mock 明确标记；静态 AGENT IS READY 改为配置或本地可用状态。保存/导出、有效计划、音源、MIDI、USTX 和文件交换可在右上角作品设置访问 |

演唱卡片对真实/自由作品显示「自然 / 轻柔 / 强烈」，经 `useVocalStyle` 复用 `setPhrasePerformance`、`generateLine` / `applyVocalResult` 和统一 Client；重唱全部成功后才替换工程。切换恢复预设的四项句级参数并使用手动模式，保留高级曲线与逐音符覆盖；锁定句、人声音轨和表达跳过，混合风格不高亮为统一风格。生成期间作品变化或失败则不应用。旧元音模式保留澄音/星羽/雾歌，不把元音音色当作真实声库切换。

2026-11-07，toge 反馈接线新增的注释与控件使页面臃肿。本轮撤回新增默认区域；首页仅保留原稿布局，制作便签仅在实际任务后出现，制作准备与来源说明收进创作设置，作品信息/配方/引擎放入作品设置。歌词卡片回到正文加一个主按钮，单句试听/锁定为卡片角落控件，额外逐句演唱区按需打开。原始 HTML 及后端/共享契约未改。桌面首屏高度和积木起点与原稿差异 ≤2px，手机截图已检查且无横向溢出；结果与范围见[版式收简](iteration-log.md#loop-layout-restoration)。

同日 toge 要求把单页重构为三个视觉章节（[工单 23](../CC-Tasks/23-three-chapter-page.md)），因此首屏高度与积木起点不再对齐原稿，原稿的卡片、贴纸、积木和歌词便利贴保留：

| 章节 | 结构与实现 |
|---|---|
| 1 · 首屏 `#compose` | 至少占满一屏。`HeroTitle` 给标题一份完整读屏文字，动画字母对读屏隐藏；`src/chapters.css` 用 `--beat` 节拍让左右元素交替入场，「变成一首歌！」逐字由旋转星星弹出并向右溅碎片 |
| 2 · Music Blocks + 工作台 `#board` / `#lyrics` | `BenchAct`（`ChapterActs.tsx`）重叠首页最后一屏，保留 `1f2c3d8` 的五圆几何与 180vh 轨道；边界处下滑一次后，1200ms 自动走完圆形入场并停在标题页，`.42` 后按原版 CSS 节拍弹字。再下滑一次用 1000ms 拉开紫色页并落到工作台，过早触发先等标题弹完。单次上滑可完整倒回标题页、再回首页；工作台包在 `.bench-pin` 里，揭幕期间钉住不动，揭开后内容正常滚动与操作 |
| Let's 过渡 | `MvAct`：同样的五圆入场、前一屏重叠，末色为黄；下滑触发后 1200ms 自动落到 Let's 页，`.42` 后自动播放首句入场和「go together」→「make a music video」逐字翻转，色块同步伸缩变紫。完整句子后再下滑一次，用 1800ms 自动收拢、撑满全屏、向下揭开 MV；铺满后才将实际 MV 移到幕布下，并自动消耗占位距离，结束落到可操作的 MV。每段支持单次上滑后自动倒回，退出 `.34` 后文字复位；所有时钟到位即停调度，减少动态效果时显示静止终态 |
| 3 · MV 放映页 `#pv` | 深色章节，含字幕走马灯、胶片框画面、播放条、字幕样式/换色/导出与说明；画面仍是 `Landscape` / `drawPV`，未改画面与导出代码 |

两段过渡见[工单 29](../CC-Tasks/29-five-chapter-scroll-transitions.md)。共用 `useScrollAct` 区分真实手势与动画产生的页面移动，避免自动前进误触发下一段；原版圆形 CSS 根据自动行进的位置绘制。纯计时函数在 `chapter-motion.ts`，有单元测试；样式没变化就不重复写入。过渡层 `aria-hidden`；幕布本身拦截点击，拉开后不留覆盖层。所有导航统一用 `chapterScrollTop()` 标记直达位置，平滑滚动不会触发途经的圆形/揭幕；新手势可打断导航，键盘焦点进入被盖住的章节则直接跳过去。sticky 不进入父元素内边距，所以钉住距离用 `.act-pin::after` 占位块实现。

工作台单独保护停留：边界由 `.bench-pin` 的揭幕落点与 `.act-mv` 起点按当前内容高度计算，观察工作台尺寸变化，兼容歌词侧页/卷帘展开。到达底部或顶部的手势先截停，页面和输入均安静 450ms 后的全新手势才放行；控件、内部滚动区、横滑、长按键不作为离开请求。布局、焦点和触摸惯性带来的页面位移也不单独授权进入下一章。减少动态效果时不施加这套滚动拦截，显式导航和焦点直达保留。

系统开启「减少动态效果」时，入场动画和滚动联动全部关闭，两段过渡变为普通流中的静止全屏标题页，不钉住、不重叠。`.page` 使用 `overflow: clip`（替代 hidden）以保证 sticky 生效且不产生横向滚动。

正式首页不再运行原型的随机格子、随机换词、独立振荡器或字幕定时器。原 HTML 文件保留原始演示，并提供正式入口说明，不能用 file:// 单文件代替 Node / Vite 应用。未改后端、公开契约、模型、混音或导出算法；UI 继续经既有 hooks、Client 和导出用例接入。原型重接后的构建、29 项相关单元测试、26 项 Mock 页面测试及 10 项真实模式页面/接口夹具已通过，详见[本轮记录](iteration-log.md#loop-prototype-wiring)。真实模型、绮萱、MP4 编码与人工听感仍按[工单 6](../CC-Tasks/6-joint-acceptance.md)验收。

<a id="launch"></a>

## 日常启动与制作准备

「打开吱声机.bat」和「打开吱声机管理面板.bat」调用 start.bat --restart，管理入口另加 --admin。scripts/restart-studio.mjs 通过 Windows 监听 PID、进程启动时间、Node 可执行文件/服务入口及仅本机管理状态确认旧服务；新版管理状态提供 projectRoot/pid，旧版需匹配资源根目录和服务命令。停止前再次核对进程代次与端口归属，拒绝其他应用、其他项目路径、watch 进程或无法确认身份的服务，不按进程名批量终止或杀进程树。等待端口释放后由 scripts/start-local.mjs 检查依赖、构建并启动绝对路径的 server/index.mjs，再打开首页或 /admin。--check 不开浏览器，检查后停止本次服务；--no-open 保持新服务。scripts/reuse-studio.mjs 保留既有独立复用能力，两个中文入口不再经过复用分支。重启清空服务端内存任务，磁盘工程、浏览器存档、缓存与加密配置不删除；真实制作中的任务不会跨进程恢复。启动与重启证据见[工单 31](../CC-Tasks/已完成/31-launcher-restart.md)。

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

首屏歌词输入先作为制作草稿；点击「同步歌词到当前作品」才更新现有作品。「用当前歌词填写」可载入当前各句，便于局部改词。`hooks/lyric-edit.ts` 先校验全部修改，再经 `useStudio.change` 一次更新；歌词卡片、Landscape / drawPV、自动保存及既有导出均读取同一份工程。同步维持当前句数，增减句数仍走自由制作（1–8 行），不套用旧模板的四句限制。本地搭建也先应用已填写的词，标为 manual，避免被模板替换；失败不发布中间工程。自由作品调用既有 `setLyricText(...,{keepMelody:true})`，同步 melodyDraft 的文本与音节；唱字数不匹配或会改动锁定内容时拒绝，保留原作品。修改仅使对应句的歌声依赖过期，需重新演唱；其他句与伴奏保留。没有新增契约或修改音乐/导出核心，验证见[歌词同步记录](iteration-log.md#lyrics-current-project-sync)。

- 先按 freeInputSchema 校验输入；空行忽略，非空手写行保留原字词与空格，支持 1–8 行、每行最多 100 字。未填写歌词时由对应真实服务或明确 Mock 夹具提供；不调用旧 composeFromIdea。
- 以约一秒间隔依次查询任务，展示返回的 state/stage 和已完成句数，不假定能观察到全部阶段，不显示百分比。Mock 显示“测试阶段”。
- 仅 succeeded / ready-for-mix 后校验完整自由工程、20–30 秒时间轴、手写词/来源与输入一致、旋律和实际音符一致、每句演唱引用有效，再经 useStudio.change 一次应用并复用原播放器。不重建谱面、不把部分 project 提前存入当前工程，也不把 ready-for-mix 称为已导出视频。
- 修改自由输入、调整当前工程、离开输入页、停止等待或卸载都会使操作代次失效；停止后不再轮询，迟到响应不能覆盖工程或新请求状态。Client 已发出的请求与后台已受理制作可能继续运行，界面明确说明这一点。
- 失败、超时、错误 JSON/工程或任务丢失时保留旧工程，无自动模板回退；任务丢失提示重新制作。singing 失败可按返回 phraseId 逐句重试缺失演唱，仍等整体成功后应用。
- 新作品成功后替换浏览器当前工程，入口提示先导出需要保留的作品；仍使用既有 Mock/真实存档隔离，刷新后可用底部播放器试听保存的工程。未改变旧 JSON 恢复方式。
- 自由作品继续禁用旧模板重作曲、节奏覆盖及旧格子/歌词改写，避免把新谱面送回旧作曲器；C 的钢琴卷帘与局部旋律现已在虚拟歌姬页接通。试听、静音、锁定、演唱/导出沿用；工单 5 后续已交付调教/混音控件，高级调教补接见工单 27。

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
- v0.4.0 逐音符颤音全参（vibratoLength/Period/In/Out/Drift/VolLink）与逐音素覆盖 `overrides[].phonemes`（index=音素化结果序号；offsetMs 按 BPM 换算 tick；phoneme 替换发音，服务端按声库音素词表预校验，非法明确拒绝）。显式 0 位音素覆盖优先于旧 consonantMs 映射。
- v0.4.0 句级表现曲线 `performance.curves`（brec 气声/voic 发声/genc 声线/velc 速度/pexp 音高表现力/shfc 音高偏移，点=句首相对毫秒×描述符整数，覆盖范围外回落引擎默认）与 `dynCurve`（提供时整体替换自动 DYN，句尾衰减/收音由尾部点控制）。velc/pexp 属渲染器建议表达，生成 USTX 时显式声明描述符；能力由 `GET /api/singing/qixuan` 的 capabilities 实测解析报告，不硬编码。
- 不支持并如实标注：ene/tenc（声库无对应 embed）、换气声、voiceColor（无子音色）、phonemeEnvelope（DiffSinger 无逐音素包络）。契约不收这些字段，UI 不得出现假开关；绮萱以外声库接入时须重新审计。
- 每次仅改变表达后只重唱该句，沿用现有 generateQixuan / applyVocalResult；不得重生成歌词/旋律。缓存含歌词、音符、表达解析版本与渲染修订。
- `performancePlan(project)` 可导出实际逐音符规划和 DYN 曲线。此为确定性分析结果；工程持久化的是每句 Performance 与人工 overrides/history。

使用真实支持的 USTX Pitch x=毫秒、y=十分之一半音、phoneme offset=按BPM换算的tick；大跳不强制连滑、长音延迟进入小颤音、休止后不提前辅音。v0.4.0 起暴露的表达参数逐一经真实 WAV 对照验证（tests/qixuan-p1-real.test.mjs），未支持的效果不进入契约。

### 分轨与混音

2026-11-07 页面接线：每句 `QixuanPanel` 内新增默认折叠的「演唱调教」，支持 preset、Auto/Manual、四个句级数值、按音符稳定 ID 选择的人工覆盖/锁、句级表达锁，以及最多三版调教恢复。`PerformanceControls` 调用现有 `setPhrasePerformance` / `autoTuneProject(project,lineId)` / `restorePerformance`；输入范围来自共享 Schema，未修改音乐核心或公共契约。保存表达后由现有重唱按钮仅生成当前句，不重新调用作曲/旋律接口；失败保留旧资产，依赖过期由现有规则显示。原有 Pitch 曲线在修改四个数值时保留；「清除音符覆盖」会明确清除所选音符整项覆盖。表达锁仍进入既有演唱依赖，切换后可能标记本句需要重唱，本轮没有改依赖算法。

[工单 27](../CC-Tasks/27-frontend-interface-sync.md)进一步接入：`QixuanPanel` 将查询到的 voice/capabilities 传入控件；在逐音符覆盖中使用 `AdvancedPerformanceControls` 编辑 Pitch 控制点、颤音六参、音素位置/时序/发音，以及句级 DYN/六类表现曲线。曲线采用数值点与 SVG 控制点预览，时间单位按契约区分句首/音符起点；全量校验后应用，局部清除保留其他字段。声库能力缺失或不支持时音素/对应表现曲线禁用，不开放 ene/tenc 等假效果；整句平面 phonemes 仅作原始参照，不猜测音符对应。历史演唱新增恢复按钮，沿用 `restoreVocalAsset` 检查当前依赖/runner，失败不改工程。Mock 与 HTTP 夹具证据见[接线记录](iteration-log.md#frontend-interface-sync)，不作为真实引擎验收。

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


<a id="task-routing"></a>

## LLM 任务路由（工单 15 P2-B，后端）

`server/services/llm-router.mjs` 统一发送三类任务。`lyrics_planning` 由旧 `/api/plan` 和 `/api/compose` 调用；`melody_composition` 由 `/api/melody` 及自由作曲调用；`performance_planning` 在自动制作中显式配置对应路由后调用。未配置表现路由的旧制作流程继续使用原本的规则调教；已配置后失败则制作失败，不回退规则，也不进入演唱。

每个任务使用已有共享输出 Schema；表现规划的服务端包装 Schema 为 `{phrases:[{id,performance}]}`，Performance 复用共享定义。表现规划只提交可修改乐句的歌词、音符与 BPM，排除锁定句、锁定音符、手工或锁定调教；所有目标 ID 与覆盖索引先校验，完整结果一次应用。无新增创作 HTTP 端点或公共字段，页面、Mock、Client 不在本次后端改动中。

本机配置与请求示例见 [引擎后台的路由配置](ENGINES.md#llm-routing)。系统规则和输出 Schema 放 system 消息，歌词与历史工程仅作为 JSON user 数据；任务附加 Prompt 不能替换运行时校验。每任务独立温度、模型、Base URL、密钥引用和附加 System Prompt。输出校验失败最多重试 2 次（旋律 3 次调用上限）；429/502/503/504 受同一上限约束并短暂退避，其他 HTTP 失败及连接超时立即失败。规划和表现规划总预算 90 秒，旋律总预算 180 秒（低于既有客户端 190 秒等待窗口）；重试不重置总预算。上游响应正文、异常详情和密钥不会进入错误或管理调用记录。

`server/services/llm-router.d.mts` 提供 TaskRoute / TaskTrace / AdminLlmResponse 类型。`GET /api/admin/llm` 受原本机 Host/Origin 访问限制，返回有效路由及最近 100 次任务调用的脱敏记录：task/provider/model/promptVersion/attempts/promptTokens/completionTokens/milliseconds/state。Prompt 版本由任务、模板版本与最终系统 Prompt 的 SHA-256 摘要组成。记录只在当前进程内保留；没有共享工程追溯字段，不承诺工程导出保存这些记录。调用失败的费用保持未知；成功时只有配置输入/输出单价才计算 USD 估算，不视为供应商账单。失败前未返回 usage 的计费同样无法估算。

取消及过期：本轮没有新增取消状态；HTTP 断开不保证停止已受理的上游任务。进程重启清空路由历史，制作任务仍遵循原有内存任务的 404 语义。Kimi 的长歌共享契约、分段恢复以及 P3 MixGraph/统一音频适配等待 Toge 确认，本轮后端路由提交不包含这些改动。实际测试和未完成交接见 [迭代日志](iteration-log.md)与[工单 15](../CC-Tasks/后端/15-p0.md)。


### 创作产物与响度报告（工单 19）

器乐新渲染为 48kHz / PCM s16，当前 revision=3（48kHz 为 revision=2，律动为 revision=3）使旧缓存自然失效；浏览器统一混音仍为现有 24kHz，因此本次不承诺最终 WAV 全链路 48kHz。位深保持 s16，未以缺少跨浏览器实测的 s24 替换稳定入口。

已知资产 key 可通过 `GET /api/artifacts/{key}.mid`、`.ustx`、`.wav` 下载缓存原字节。MIDI 是对应器乐渲染轨道的工程，并非整曲聚合 MIDI；USTX 对应演唱缓存源工程。不存在返回 404，只接受 64 位小写十六进制 key 和后缀白名单。逐轨下载零新增依赖；zip 暂不提供。

`GET /api/artifacts/{key}.wav/loudness` 只读调用 FFmpeg ebur128 返回 `{integratedLufs,truePeakDbtp}`，静音无穷值使用 null，测量不可用返回 503；不改变音频。调用方可按人声/器乐 key 分别查询，无需改变 production 任务契约。

MP4 导出使用 loudnorm（I=-14 LUFS、TP=-1.5 dBTP、LRA=11），48kHz AAC 192k。响应保持 MP4 下载，`X-Songyu-Loudness` JSON 头给出 input、output 和 target；output 是解码最终 AAC 的 ebur128 实测值，目标 TP 是上限，不要求安静素材贴近上限。工单 27 已接报告展示，不改变浏览器混音算法。真实资源 smoke 命令为 `node scripts/verify-render-quality.mjs`，需要可用 FluidSynth、SoundFont、FFmpeg 与 Playwright Chromium；输出仅在 `temp/task19/`。


前端接线：统一 Client 的 `artifact(file)` 校验白名单后返回原 Blob，`loudness(file)` 只接受 WAV 并校验测量响应；`exportVideo(input,onReport?)` 保持原 Blob 返回，报告异常不阻止成功文件下载。`features/export/files.ts` 统一组装当前有效人声文件，以及用户明确点击后按既有 `instrumentAudio` 请求准备的 FluidSynth 分轨；不持久化新的工程字段，不切换音源，不导出服务器路径。`ArtifactDownloads` 挂在已有导出框，`ExportLoudnessReport` 在 PV 区/导出框展示本次同工程快照报告；工程变化后不展示旧报告。Mock 文件/响度是明确标注的夹具；没有真正 FFmpeg 时不能宣称成片实测。

<a id="groove-render"></a>

### 鼓组与确定性渲染律动（工单 20）

自由模式 `freeArrangement` 使用 `drumPattern` 生成 2/4 backbeat、分层踩镲和段落末小节 fill。energy 改变节奏密度、fill 复杂度与力度；TAP 底鼓落点保留，rhythmCompletion=false 仅生成录入 kick。旧模式维持既有风格/TAP 实现，旧工程不会被加载过程自动重写。

`POST /api/instruments/render` 的可选 groove 示例：`{projectId:"project-1",trackId:"track-1",version:1,swingTicks:60,timingTicks:15,velocityAmount:0.08}`。MIDI 分辨率 480 tick/beat；swing 延后 .5 拍的事件，非鼓 timing/velocity 用 tuple+参数的纯伪随机数生成器，保持同输入 MIDI 字节一致。位置只在 MIDI 编码时偏移，工程 beat 不变；末端裁剪、非负 onset 和最小 1 tick 时值保障事件有效。

调用方透传 locked / manuallyEdited / notes[].locked；任一保护禁用整轨 groove，后端在 hash 前去掉该 groove，保护轨道不会因开关改变缓存键。非保护参数和身份/版本进入缓存键，revision=3。缺省不传 groove 不应用任何额外渲染律动。工单 31 已接 production 与 `src/external-audio.ts` 的 FluidSynth 请求；浏览器 Synth、Client 制作方法类型、Mock 和页面控件仍由 Toge 接入，尚不能宣称浏览器合成试听一致。

运行 `node --test tests/groove.test.mjs` 可验证事件流与真实 FluidSynth PCM/缓存（缺少引擎自动 skip）；`node scripts/verify-render-quality.mjs --free` 用本地规则自由编曲测试 Chromium 解码/统一混音与真实 MP4，非真实 LLM 创作和人工听评。


#### 制作任务 Groove 参数（工单 31）

`POST /api/production` 使用独立 `productionInputSchema`，例如 `{"intent":"雨后出发","targetSeconds":25,"grooveSettings":{"swingTicks":48,"timingTicks":8,"velocityAmount":0.06}}`。`grooveSettingsSchema` 为严格三参数对象，各字段缺省 0；不接受 projectId、trackId、version，非法输入 HTTP 400，启动不可用仍为 503。原自由创作输入保持严格不变，规划前剥离设置，不将其传入 LLM。

生成成功的 `GET /api/production/:id` 工程带 `project.grooveSettings`，保存/导入通过 `validateProject` 校验；未提供时旧 v1 工程不补字段、不迁移。设置不进入人声依赖。缺省或全零时省略渲染 groove，保持原非 Groove 缓存输入。

`shared/groove.mjs` 的 `projectInstrumentInput(project,track)` 由工程/轨道 ID、版本与设置构造稳定种子，并透传真实保护状态及音符。production 和 external-audio 共用该入口；MIDI 沿用 `performedNotes`（480 tick/beat 的 start/end、原 note 引用和演奏 velocity）。未来 Synth 应复用同一事件入口，按 tick/480 转回 beat，再按 BPM 转秒，不能另写随机算法；工程音符保持原 beat。

验证与剩余跨端接线见[工单 31](../CC-Tasks/已完成/31-production-groove-integration.md)、[20-groove-render](../CROSS-END-HANDOFF.md#20-groove-render)。本阶段未修改稳定混音/字幕/FFmpeg 路径。


#### 首音素显式零偏移（工单 32）

`overrides[].phonemes[{index:0,offsetMs:0}]` 明确覆盖本音符的句级 `consonantMs`。需要阻止非零默认偏移时生成 `phoneme_overrides:[{index:0,offset:0}]`；其他无替换零偏移维持旧省略规则，不给历史工程批量补字段。没有首位覆盖时继续使用原 consonantMs；发音替换仍优先，BPM→tick 换算不变。

只有首位显式 offsetMs:0 且无发音替换的请求使用 `resolvePerformance.renderRevision=4` / Qixuan 缓存 revision=6，避免复用修复前错误音频；原手动、自动以及无 Performance 请求保持各自旧版本。已有工程的该句资产经原依赖策略过期，其他句与器乐不变。真实 USTX/WAV 与缓存对照及验证边界见[工单 32](../CC-Tasks/已完成/32-phoneme-explicit-zero.md)和[日志](iteration-log.md#phoneme-explicit-zero-32)。


#### Synth 伴奏增益（工单 33）

`renderAudio` 让本地 Synth 器乐经过独立 GainNode 再进入原 master；`processed` 时增益为 `mixSettings.bandGain ?? 1`，否则为 1。元音演示与外部人声不进入器乐总线。FluidSynth WAV 继续原 addWav 的平衡/声像/增益路径，不再乘一次总线。原处理默认值（自由模式默认开）、stem、静音、单轨、干声、master 压缩及处理后峰值保护保持不变。

试听、`exportWavFile` 与 `exportPVFile` 仍共用 renderAudio；bandGain=0 的纯器乐 PCM/WAV/PV 输入为零，1 与旧 Synth 基线一致，2 改变实际 PCM。MP4 后续响度归一仍是原策略，不能假定编码后响度与浏览器增益成线性关系。页面控件解禁由 Toge 处理，元音演示的人声 gain/reverb 本期未开放；Groove 事件同步不在本补丁内。验证见[工单 33](../CC-Tasks/已完成/33-browser-synth-band-gain.md)及[日志](iteration-log.md#synth-band-gain-33)。


#### 制作任务表现规划状态与公开追溯（工单 34）

沿用 `POST /api/production`，例如请求 `{"intent":"雨后出发","targetSeconds":25}`，启动成功仍为 202 与 `id/state/stage`。`GET /api/production/:id` 与单句 retry 的公开响应使用同一显式投影，不再直接返回内部 job。保留 `id/state/stage/project/composition/phraseId/completedPhrases/error` 和可选 Mock 标记；根级 input、failureContext、performanceTrace、instrumentAssets、内部时间记录及任意后台上下文不在公开契约内。`composition.input` 仍是原 FreeResult 的创作输入，不包含后台配置，原结果应用不变。

新增可选 `performancePlanning`：前序阶段可缺省；disabled 表示未配置该任务路由，running 表示正在规划，succeeded 表示规划返回，skipped 表示没有可规划句（锁定/手工等保护，planner 返回 trace:null），failed 表示配置或规划失败。只有 succeeded 可有可选 trace；没有 trace 时不伪造模型/Token，不从全局 router 历史捞取其他任务的记录。

以下是**契约夹具**，不是实际模型调用；为简洁省略 project/composition：

```json
{"id":"00000000-0000-4000-8000-000000000001","state":"succeeded","stage":"ready-for-mix","performancePlanning":{"status":"succeeded","trace":{"provider":"fixture-provider","model":"fixture-model","promptVersion":"performance_planning/1/0123456789abcdef","attempts":1,"promptTokens":30,"completionTokens":20,"milliseconds":10,"cost":null,"costCurrency":null}}}
```

trace 与现有 router 成功字段一致：provider（1–80 字）、model（1–100 字）、promptVersion（任务/版本/16 位哈希）、attempts（1–3）、非负整数 promptTokens/completionTokens/milliseconds、非负 cost 或 null、costCurrency 为 USD 或 null。序列化仅取该白名单，非法追溯整项省略；不返回 task、at、reason、baseUrl、keyRef、systemPrompt、Authorization、原始请求/响应或 stack。未知费用为 null，不能当作零费用。

规划失败示例仍用原 HTTP 200 轮询状态，原中文 error 保留；不会进入器乐/演唱，已有谱面保留，单句 retry 返回原 409，不能跳过规划：

```json
{"id":"00000000-0000-4000-8000-000000000001","state":"failed","stage":"validated","error":"演唱表现规划失败；未进入演唱，请修正配置后重新制作","errorCode":"PERFORMANCE_PLANNING_FAILED","performancePlanning":{"status":"failed"}}
```

未启用例为 `"performancePlanning":{"status":"disabled"}`，全锁定跳过为 `{"status":"skipped"}`，均无 trace；旧响应和 Mock 夹具可不提供该新字段。无效创建输入仍 400，无法启动 503，任务不存在/重启 404，非可重试句 409。内存任务边界不变，追溯不写进 SongProject。本轮现有 Client 通过共享 Schema 已能保留字段，Mock/页面是否展示仍由 Toge review。证据见[工单 34](../CC-Tasks/已完成/34-production-trace-contract.md)与[日志](iteration-log.md#production-trace-34)。

工单 34 序列化补充：project.vocalAssets 仅返回既有 VocalAsset 工程字段，剔除引擎返回的 sourceProject 绝对缓存路径与额外诊断，保留 dependency/voice/renderParameters 与成功应用/单句重试所需数据。内部资产不修改。


<a id="ai-html-pv"></a>

### 可选 AI HTML 动态 PV（工单 35）

默认 Canvas/四张 PNG+ASS 导出不变。独立 `pv_design` 仅由 `POST /api/pv/design` 的明确请求触发，必须有显式任务路由及可用 keyRef；未配置不回退歌词模型，也不从 production 自动触发。`server/services/pv.mjs` 复用现有 TaskRouter；生产音乐、歌声、混音不改。后台增加同一任务项，安全/CSRF/DPAPI 边界不变；公开配置和追溯不返回 systemPrompt，表单省略该字段时服务端保留原设置，显式空串可清除。

`shared/contracts/pv.mjs` 与相邻 `.d.mts` 定义：

- `PvProject` 是最小工程投影：id/title/idea/mood/bpm、四段 sections（id/start/beats/energy）、歌词（id/text/start/end）及 ≤96 个 pulses（beat/strength）。时间始终为 beat，四段连续，15–35 秒，歌词不重叠/越界。不能直接上传整个 SongProject、WAV 或引擎配置。
- `PvDesign` v1：1280×720，四场景 ID 和顺序精确匹配；每场景 ≤12 层；背景为双十六进制颜色渐变；shape(circle/rect/triangle)、particles(seed/count/fall/orbit)、text(title/current_lyric)。各层位置/尺寸/颜色/透明度/旋转/缩放及 2–12 个归一化关键帧均有范围；全局图层 ID 唯一、粒子总数 ≤384，每段恰有一个歌词源。无任意文本代码、CSS、路径、图片或 URL；不是模板 ID 选择。
- `pvFingerprint(project)` 对 Schema 规范化快照做 SHA-256。设计响应和 HTML 导出携带该指纹。前端未来在应用设计、seek 和导出前重新投影当前工程并比较：歌词、BPM、时间轴等变化必须提示重新生成。指纹用于依赖一致性，不能证明客户端拥有工程或代替鉴权。

`POST /api/pv/design` 请求为 `{project: PvProject}`；`200` 返回 `{source:'llm', inputFingerprint, pvDesign, trace?}`。trace 仅有 task/provider/model/promptVersion/attempts/Token/耗时/费用等 router 成功白名单，费用未知为 null。Mock 需 `{source:'mock',mock:true,...}` 且无真实 trace，产品 Mock 尚未接。完整**接口夹具**可用 [pv-fixture](../tests/support/pv-fixture.mjs)，真实验收产物不在 Git。

错误：输入/绑定 400 `PV_INPUT_INVALID`，同一时刻已有规划 429 `PV_BUSY`，未配置独立路由/密钥 503 `PV_NOT_CONFIGURED`，上游或校验失败 502 `PV_PLANNING_FAILED`；不返回上游原始错误、不静默用固定本地方案替代。`GET /api/pv/status` 的 available 只表示可选 Chromium 文件探测，返回宽高/fps/maxSeconds；实际启动仍可能报 503。FFmpeg 沿用既有探测。

`shared/pv-render.mjs` 的 `pvDocument(project,design,singingCredit)` 先校验，输出仓库可信 DOM/SVG runtime；文字仅 textContent，JSON 对脚本结束符转义，CSP 禁止连接、图片、字体下载和外部代码。`renderAt(timeMs)` 只依赖显式时间/快照/种子，不使用墙钟、Math.random 或 CSS 自行动画。标题/歌词/署名由可信快照绑定，HTML 不再叠加 ASS。预览需用 `iframe sandbox="allow-scripts"`，不得加 allow-same-origin；父页面发 `{type:'cantaloom-pv-seek',timeMs}` 消息给该 iframe；runtime 只接受 parent 来源及有限数值，父页需限定消息目标为自己持有的 iframe。布局固定 1280×720，由父容器整体缩放；字体沿用本机 Arial/Microsoft YaHei/sans-serif，帧一致性要求相同 Chromium/系统字体环境，未嵌入外部字体。

旧 `POST /api/export` 请求仍是原四张 PNG + WAV/歌词/标题/style/duration/署名，逐字段兼容。新分支为：

```js
{ visualMode:'html', pvProject, pvDesign, inputFingerprint,
  wav: mixedWavBase64, title:pvProject.title, duration:seconds,
  lyrics:pvProject.lyrics.map(l=>({text:l.text,start:l.start*60/pvProject.bpm,end:l.end*60/pvProject.bpm})),
  style:'cinema', singingCredit:'demo' }
```

HTML 不带 scenes；快照、设计、标题、歌词秒时间及 duration 必须一致；指纹不符 400 `PV_STALE_DESIGN`。Chromium 缺失/无法启动 503 `PV_CHROMIUM_UNAVAILABLE`；编码/预算失败 500，仍不回退画面。复用同一 export 编码互斥锁（异步探测前占位），并发 429。Chromium 使用原生 sandbox、离线 context、无服务工作线程/权限/下载、网络请求全部拒绝；只跑可信 runtime。固定 24fps CDP 捕获 PNG 帧（≤840）、临时帧 ≤512 MiB、帧阶段 145s/浏览器 watchdog 150s，HTML 编码与响度使用剩余的总 170s 预算；原 Canvas 的 120s FFmpeg 参数不变。结果仍为 MP4 Blob 和 X-Songyu-Loudness；同一已混音 WAV 进入原 loudnorm/AAC，不另渲染音频。失败与下载完成清理自己创建的临时目录。

后端交付证据见[工单 35](../CC-Tasks/后端/35-ai-html-pv.md)、[日志](iteration-log.md#ai-html-pv-35)、[引擎要求](ENGINES.md#html-pv)。SongProject 持久化、Client/Mock、LOOP! 可选按钮/隔离预览和进度接线由 Toge 后续实施，不等于正式页面端到端完成。
