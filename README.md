# 织声机 CantaLoom

面向零音乐基础的本地音乐创作工作台：输入灵感或歌词，编曲、编辑、试听，由绮萱演唱并导出作品。仓库：[cicikat/CantaLoom](https://github.com/cicikat/CantaLoom)。

<a id="launch"></a>

## 打开织声机

Windows 日常使用：双击项目根目录 **「打开吱声机.bat」**。管理后台使用「打开吱声机管理面板.bat」（或 start-admin.bat）。首次打开会检查依赖、构建最新应用、启动服务并自动打开工作台；已运行时会核对端口进程和本机管理状态，只关闭确认属于 CantaLoom 的旧服务，再构建并重启；其他服务占用端口时中止，不会强行关闭。准备窗口保留日志，按 Ctrl+C 可停止自己启动的服务。

进入后点击 **「一键开工」**：制作环境就绪时开始制作，尚未准备好时打开现有设置面板并显示缺项。面板里可用「本地搭建积木」进行本地创作，或通过「打开本机设置」配置后「重新检查」。配置检查不调用模型，也不把已配置当成真实生成验收。

**当前首页已按 `03_patchlab_playful.html` 的 LOOP! 原型重新接线**：保留首屏、四个主题按钮、积木区、TAP、歌词便利贴和 PV 预览，替换原先四页工作台入口。整页按三个视觉章节连续滚动：首屏入场动画 → `Music Blocks` 过渡与音乐工作台 → MV 放映页（PV 预览就在第三章，见[工单 23](CC-Tasks/23-three-chapter-page.md)）。点击输入框左侧的铅笔可打开「创作设置」，输入 1–8 行歌词；自由作品点击歌词卡片下的「编辑旋律」展开钢琴卷帘，下方可逐句重唱。详见[原型接线](docs/ARCHITECTURE.md#prototype-frontend)。

默认页面已收回原稿版式：不再常驻显示制作说明、作品信息栏、引擎区或底部悬浮播放器。播放进度在积木底栏；右上角「保存 / 导出」（手机为「⋯」）打开作品设置。详见[本轮收简记录](docs/iteration-log.md#loop-layout-restoration)。

双击入口仍复用原启动器，构建后打开上述 LOOP! 首页。HTML 文件保留原始设计与演示脚本，并提示进入正式首页；实际工程、请求、试听和保存由 React 接线。浏览器存档格式及旧工程保持兼容，未清空已有作品。接线与本轮验证见[工单 5](CC-Tasks/5-toge-free-creation.md)、[迭代记录](docs/iteration-log.md#loop-prototype-wiring)。

## 当前进度（2026-11-07 LOOP! 接线）

LOOP! 首页已完成页面接线、Mock 流程及本地创作验证；历史真实引擎记录单独保留，不能作为本轮真实制作与听感验收。

`package.json` 版本仍为 **0.2.1**；v0.3 / v0.3.1 / v0.3.2 是后续能力与验收阶段名，不代表对应新版页面已经发布。后端能力文档核对基线为 main `da54e03`；11 月 7 日已验证 A1 Mock、A2 最小页面及 C 钢琴卷帘/局部旋律的构建、定向测试和浏览器回归；均在本地分支接通，真实模型与引擎没有重跑。

| 能力 | 当前状态 | 证据与边界 |
|---|---|---|
| LOOP! 单页创作 | 已接工程音轨、格子、排序、TAP、歌词卡片、局部编辑、播放与导出 | [本轮接线验证](docs/iteration-log.md#loop-prototype-wiring)；真实制作与 MP4 编码未重跑 |
| 真实中文演唱与 LLM | 历史记录已有真实调用、绮萱 CPU / DirectML、缓存与成片实测 | [绮萱历史记录](docs/iteration-log.md#qixuan)；不证明新电脑已装好引擎或当前 Key 可用 |
| 自由作曲与动态旋律 | compose / melody 接口、共享客户端及工程应用逻辑已提供 | [自由创作接入](docs/ARCHITECTURE.md#composition)；首页最小入口及单句旋律编辑已本地接入 |
| 自动制作、调教与混音 | 制作任务、调教/混音核心已有实现；LOOP! 已接每句预设、Auto/Manual、四项细调、音符覆盖/表达锁/三版恢复与四种分轨试听 | [当前页面接入](docs/ARCHITECTURE.md#performance)、[Mock/PCM 证据](docs/iteration-log.md#expression-mix-controls)；浏览器伴奏核心已修复、控件仍待 Toge 解禁，真实共同听感仍待验收 |
| 新流程 Mock 与页面 | **A1 / A2 已完成**：首页主题/可选歌词 → 制作状态 → 完整结果应用 → 试听已接通；支持取消、失败保留与缺失句重试。旧入口保留，未知 Mock 接口返回 404 | [A1 验证](docs/iteration-log.md#a1-free-creation-mock)、[A2 验证](docs/iteration-log.md#a2-free-creation-page)；双方待办见下方[协作工单](#协作工单) |
| 钢琴卷帘与局部旋律 | **已接线并通过 Mock**：在歌词卡片下按句编辑音高/位置/长度、锁定及指定句重作曲；改动句重唱，保留其他句与伴奏 | [编辑入口](docs/ARCHITECTURE.md#piano-roll)、[钢琴卷帘验证](docs/iteration-log.md#c-piano-roll) |
| 新网页完整流程及听感 | **待双方验收**：现场新输入 → 制作 → 试听/导出，以及人工听感 | Mock 页面测试、后端历史实测与非静音指标不能代替这项验收 |

最小页面已可在 Mock 中从新输入制作并试听；钢琴卷帘、局部旋律、调教与现有有效混音控件均已接线。每句调教在「逐句演唱与重唱」中展开，混音在歌词区底部展开；默认不占首屏。高级音高/颤音/音素/表现曲线在「逐音符人工覆盖」内；分轨文件与响度在「导出作品」中，MP4 报告只展示本次响应。见[工单 27](CC-Tasks/27-frontend-interface-sync.md)，Mock 文件和报告不是真实引擎/FFmpeg 验收。浏览器伴奏核心已由工单 33 修复，控件仍待 Toge 解禁，见[交接 5-C-synth-mix](CROSS-END-HANDOFF.md#5-c-synth-mix)，真实最小闭环仍需工单 4 / 6 验收。详细 checkbox 只维护在对应 CC-Tasks 工单中。

旧名称已废弃，当前产品名统一为 **织声机 CantaLoom**。旧浏览器存档键、`SONGYU_*` 环境变量、HTTP 头、已安装的 `SongyuBridge` 和已安装的旧启动文件保留兼容，避免已有工程、加密配置、引擎或快捷方式失效；新导出工程使用 `.cantaloom.json`，旧 `.songyu.json` 仍可导入。历史工单与迭代证据保留当时名称。

## 开始开发

需要 Node.js **22.12+** 和 npm。在自己的仓库根目录执行：

```powershell
npm ci
# 前端独立开发；无需后端、密钥、Python 或声库
npm run dev:mock
```

前端地址为 `http://127.0.0.1:5173`。Mock 是固定测试数据与测试音，现有交互可用；自由创作 API Mock 与首页输入/制作/试听入口已补齐，不会自动连接真实模型。Mock PV 下载 JSON 回执，不是 MP4。

真实联调使用 `npm run dev:frontend` 与 `npm run dev:backend`，或同机 `npm run dev`。将 `.env.development.example` 复制为 `.env.development.local`，按本机或 SSH 转发端口设置 `VITE_API_PROXY_TARGET`。配置和两人分工见[团队工作流](docs/TEAM_WORKFLOW.md)。

真实能力按需配置：

- LLM：在本机后台或 `.env` 配置服务地址、模型、Key；密钥只在后端，所有 `VITE_` 值对浏览器公开。新自由作曲依赖 LLM，失败不静默退回旧模板。
- 器乐：可用浏览器 Web Audio，或安装 FluidSynth 与授权 SoundFont。
- 中文演唱：使用已授权的绮萱、声码器和 OpenUtau 无窗口桥接；不会把元音测试音当作中文演唱。此路线不需要 Python checkpoint 推理。
- 真实 MP4：需要带 libx264 / libass 的 FFmpeg，可设 `FFMPEG_PATH`。
- 引擎、模型、缓存、后台配置均在仓库外；`SONGYU_EXTERNAL_ROOT` 指定资源根目录。部分实测脚本仍写死原机器路径，使用前按 Blacktea 工单核对，不能仅改环境变量就假定全部可移植。

本机管理后台直接打开 **`http://127.0.0.1:3001/admin`**（端口随后端配置变化）；Vite 的 5173 **不代理后台**。密钥由 Windows DPAPI 加密，换电脑需重新配置。详见[引擎与后台](docs/ENGINES.md#admin)。

## 本地演示

Windows 双击「打开吱声机.bat」（内部复用 `start.bat`）：检查环境、缺依赖时执行 `npm ci`、构建源码、启动同源页面/API，再打开浏览器。`--no-open` 不打开浏览器，`--check` 完成启动检查后自行停止。两个中文入口默认传入 `--restart`，管理入口另传入 `--admin`；`start.bat` 也可显式使用 `--restart`。不会替换 `.env` 或关闭未确认身份的其他服务。

手动方式：

```powershell
npm run build
npm start
```

打开 `http://127.0.0.1:3001`。现有页面可演示 TAP → 音乐积木 → 单句歌词/演唱 → 歌词 PV。元音模式只唱元音；安装并启用真实绮萱后才是中文歌声。首页新增自由创作入口：填写主题与可选的 1–8 行歌词，查看制作阶段，成功应用后试听。真实模式使用实际 production 服务，不会失败后自动退回旧模板；本轮验证包含 Mock 和真实模式的本地创作/接口夹具，不含真实模型或声库制作。

## 架构与数据

单仓库、React + TypeScript / Vite、Node + Express。开发时两进程通过 `/api` 通信，构建后 Express 同时提供 `dist/` 与 API。

- `src/`：页面、hooks、用例、浏览器音乐计算、播放/混音、保存与导出；并非全部属于 UI 分工。
- `server/`：HTTP 路由、LLM、真实引擎、缓存、FFmpeg、本机后台。
- `shared/`：两端共用的数据校验、声明与纯音乐逻辑，不读环境或文件。
- `scripts/`：启动、桥接、实测工具；`tests/`：单元、接口、浏览器测试。
- docs/：稳定说明、交接与倒序迭代日志；CC-Tasks/：以数字和任务简述命名的计划/工单。
- `temp/`、`backup/`：本项目的本机临时产物与备份，统一放在项目根目录，Git 忽略其内容；迁移清单见[归位记录](docs/iteration-log.md#project-local-artifacts)。引擎资源与密钥仍按原有边界存放。

详细目录与所有权见团队工作流。旧模式使用四段/六轨的积木流程；自由作曲保留四段结构，但支持 1–8 行歌词、20–30 秒目标时长，不固定为四句或恰好 24 秒。

`SongProject` 记录稳定 ID、音符、歌词来源、锁定、版本和资产依赖，时间统一以 beat 保存。JSON 不内嵌真实音频、密钥或模型；换电脑后外部缓存可能缺失，需要重新生成，不能承诺只凭 JSON 自动恢复原歌声。浏览器只自动保存当前工程，新建前先导出需要保留的作品。

## 协作工单

本项目用 CC-Tasks/数字-任务简述.md 管理计划，checkbox 只在工单中更新；已完成工单归入 [CC-Tasks/已完成/](CC-Tasks/已完成/)，保留编号和文件名；完成记录写入 [docs/iteration-log.md](docs/iteration-log.md)，新记录在上，每条注明工单及相关文档地址。规则见 [AGENTS 项目专属工作流](AGENTS.md#project-workflow)。

| 谁 / 任务 | 应做清单与依赖 |
|---|---|
| Blacktea（红茶） | [4 · 接口交接与真实联调准备](CC-Tasks/4-blacktea-integration.md)：字段/示例、可移植实测工具、授权资源与联调环境 |
| Blacktea（红茶） | [15 · 后端音乐制作升级](CC-Tasks/后端/15-p0.md)：P0 精细调声与单句重唱、P1 逐音素与高级人声表现已完成并通过真实引擎验收，接口交接见工单；P2-B 后端任务路由已实施并有不同模型 ID 的真实调用；P2-A / P3 跨层范围等待 Toge 确认，整单未完成 |
| Blacktea（红茶） | [19 · 渲染音质与创作产物导出](CC-Tasks/后端/19-render-quality-and-artifacts.md)：48kHz 渲染、MIDI/USTX/分轨下载、导出响度归一与 LUFS 报告已实现并通过真实浏览器混音/MP4 回归；人工 DAW 与听感待验收 |
| Blacktea（红茶） | [20 · 鼓组律动与演奏人性化](CC-Tasks/后端/20-groove-and-humanization.md)：自由鼓组 backbeat/fill 与动态已接核心，可选 swing/确定性人性化已在 MIDI/API 实施；页面选项与人工听评待验 |
| Blacktea（红茶） | [21 · 和声、声部连接与拍号速度](CC-Tasks/后端/21-harmony-voice-leading-form.md)：契约提案待评审授权，依赖 15 P2-A 确认，待排期 |
| Blacktea（红茶） | [22 · 制作后端治理](CC-Tasks/后端/22-backend-production-ops.md)：缓存配额、任务持久化、渲染并发池；领取工单 12 子任务，待排期 |
| Toge（toge） | [5 · 自由创作 Mock、页面与局部编辑](CC-Tasks/5-toge-free-creation.md)：LOOP!、调教及现有混音路径已接线并通过 Mock；视觉核对及真实共同验收待完成 |
| Toge（toge） | [27 · 已交付接口与前端接线](CC-Tasks/27-frontend-interface-sync.md)：高级调教/历史演唱恢复、分轨下载/响度报告已补；可选 groove 与真实验收仍未完成 |
| Toge（toge） | [23 · 首页三个视觉章节与竖屏版式](CC-Tasks/23-three-chapter-page.md)：入场动效、Music Blocks 过渡、MV 放映页与竖屏调整已实现并通过 Mock；待 toge 实际滚动核对 |
| Toge（toge） | [29 · 五章节滚动转场](CC-Tasks/29-five-chapter-scroll-transitions.md)：幕布揭开工作台、Let's 逐字翻转并揭开 MV，已实现并通过 Mock 与无头浏览器逐帧检查；待 toge 实际滚动核对手感 |
| Blacktea（测试审计） | [24 · 测试体系审计与精简](CC-Tasks/已完成/24-test-system-audit.md)：等价覆盖、测试分层与 CI 去重；不修改业务逻辑 |
| 双方共同验收 | [6 · 原型接线后的真实闭环与听感](CC-Tasks/6-joint-acceptance.md)：依赖 4/5 就绪，分别记录 Mock、真实引擎、页面和人工听感 |
| 跨端交接规则与入口 | [18 · 跨端交接文档](CC-Tasks/已完成/18-cross-end-handoff.md)：登记、按需读取与完成后清理 |
| 前一轮工单整理 | [7 · 项目工作流整理](CC-Tasks/已完成/7-documentation-workflow.md)：已完成的范围与验证入口 |
| 本轮文档合并 | [8 · 文档主题合并与历史归位](CC-Tasks/已完成/8-docs-consolidation.md) |
| 日常使用入口 | [16 · 单一双击入口与准备状态](CC-Tasks/已完成/16-easy-launch.md)，已完成；实际资源配置仍依赖红茶工单 4 |
| 后台主题 | [14 · 日夜切换与文案精简](CC-Tasks/已完成/14-admin-themes.md) |
| 后台双栏与链路测试 | [13 · 后台制作链路](CC-Tasks/已完成/13-admin-pipeline.md) |
| 后台后续方向 | [12 · 后台与资源管理](CC-Tasks/12-admin-backlog.md)，待排期 |
| 历史方案 | [1 · 动态旋律](CC-Tasks/1-dynamic-melody-and-performance.md)、[9 · 初始工作台](CC-Tasks/9-initial-workbench.md)、[10 · P2.1 后续建议](CC-Tasks/10-guided-composition.md)、[11 · 解耦迁移](CC-Tasks/11-frontend-backend-decoupling.md)；恢复的原文：[2 · 自由创作](CC-Tasks/2-free-composition-original.md)、[3 · 自动调教](CC-Tasks/3-auto-performance-original.md)，当前进度以工单 4/5/6 为准 |

本轮品牌与 PR 整合：[工单 30](CC-Tasks/已完成/30-cantaloom-brand-and-pr-integration.md)。

Synth 伴奏增益核心修复：[工单 33](CC-Tasks/已完成/33-browser-synth-band-gain.md)；WAV/PV 已验证，控件待 Toge 解禁。

首音素显式零偏移修复：[工单 32](CC-Tasks/已完成/32-phoneme-explicit-zero.md)；待 Toge 清理旧限制提示。

制作 Groove 工程参数与后端续接：[工单 31](CC-Tasks/已完成/31-production-groove-integration.md)；页面/Mock/Synth 仍待 Toge 接入。

本轮启动重启功能：[工单 31](CC-Tasks/已完成/31-launcher-restart.md)。

## 文档与验证入口

| 需要了解什么 | 阅读入口 |
|---|---|
| Agent 长期规则 | [AGENTS.md](AGENTS.md) |
| 待对方确认、接线或联调的跨端事项 | [CROSS-END-HANDOFF.md](CROSS-END-HANDOFF.md)，仅相关任务按需读取，完成后清理 |
| 分工、联调、Git 与验证规则 | [TEAM_WORKFLOW.md](docs/TEAM_WORKFLOW.md) |
| 系统目录、工程数据、API 与页面接入 | [ARCHITECTURE.md](docs/ARCHITECTURE.md)；字段提案在[契约变更记录](shared/contracts/CHANGELOG.md) |
| 原型前端接线方向 | [ARCHITECTURE 原型接线](docs/ARCHITECTURE.md#prototype-frontend)：保留 LOOP! 设计、复用现有能力及当前缺口 |
| 原型接线的可调数据与开关清单 | [INTERFACES.md](docs/INTERFACES.md)：真实存在且可调的数据、不存在的开关、Mock 缺口 |
| 引擎、后台配置、资源与许可 | [ENGINES.md](docs/ENGINES.md) |
| 当前任务与各自清单 | 上方[协作工单](#协作工单) |
| 完成记录、历史过程与验收证据 | [iteration-log.md](docs/iteration-log.md)，日期倒序 |

验证按改动范围执行，条件见团队工作流。E2E 会自行启动隔离服务，不用先运行开发服务。CI 不安装声库，不等于真实引擎或人工听感通过。真实手机及 Safari 音频不能由 Chromium 模拟检查代替。

背景为原创程序化 Canvas，没有 AI 生图调用；不训练模型，不分发第三方权重，公开作品须保留适用的歌声/技术署名。历史方案与测试数字在各日期记录中保留，不作为当前环境已通过的承诺。

管理调试：双击 `start-admin.bat`，路由设置见 [管理调试启动与路由](docs/ENGINES.md#管理调试启动与路由)。本轮工单：[25](CC-Tasks/已完成/25-admin-routing.md)。

资源台模型发现：[工单 26](CC-Tasks/已完成/26-admin-model-discovery.md)。
