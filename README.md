# 声屿 SONGYU / CantaLoom

面向零音乐基础的本地音乐创作工作台：输入灵感或歌词，编曲、编辑、试听，由绮萱演唱并导出作品。仓库：[cicikat/CantaLoom](https://github.com/cicikat/CantaLoom)。

## 当前进度（2026-11-06 文档核对）

`package.json` 版本仍为 **0.2.1**；v0.3 / v0.3.1 / v0.3.2 是后续能力与验收阶段名，不代表对应新版页面已经发布。核对基线为 main `da54e03`；本次仅检查文档与源码，没有重新运行模型、构建或测试。

| 能力 | 当前状态 | 证据与边界 |
|---|---|---|
| 现有四页工作台 | 已有节奏录入、分轨、歌词编辑、试听、锁定、保存、WAV/PV 导出 | [v0.2.1 验收](docs/iteration-log.md#v021)；真实 MP4 需要 FFmpeg |
| 真实中文演唱与 LLM | 历史记录已有真实调用、绮萱 CPU / DirectML、缓存与成片实测 | [绮萱说明](docs/QIXUAN.md)；不证明新电脑已装好引擎或当前 Key 可用 |
| 自由作曲与动态旋律 | compose / melody 接口、共享客户端及工程应用逻辑已提供 | [v0.3.1 交接](docs/V031_FRONTEND_HANDOFF.md)；正式新入口仍待前端接入 |
| 自动制作、调教与混音 | 制作任务、Auto/Manual、历史、分轨渲染已有实现；有真实后端制作与浏览器加载工程导出记录 | [v0.3.2 交接](docs/V032_FRONTEND_HANDOFF.md)、[验收](docs/iteration-log.md#v032) |
| 新流程 Mock 与页面 | **待完成**：当前页面仍走旧创作入口；Mock 未覆盖 compose / melody / production，未知接口返回 404 | 缺口与双方待办见下方[协作工单](#协作工单) |
| 新网页完整流程及听感 | **待双方验收**：现场新输入 → 制作 → 试听/导出，以及人工听感 | 旧页面测试、后端实测与非静音指标不能代替这项验收 |

下一步先完成“新输入 → 制作状态 → 应用结果 → 试听”的最小页面流程，再接局部编辑、调教和混音。详细 checkbox 只维护在对应 CC-Tasks 工单中。

## 开始开发

需要 Node.js **22.12+** 和 npm。在自己的仓库根目录执行：

```powershell
npm ci
# 前端独立开发；无需后端、密钥、Python 或声库
npm run dev:mock
```

前端地址为 `http://127.0.0.1:5173`。Mock 是固定测试数据与测试音，现有交互可用；新增自由创作流程尚需补 Mock，不会自动连接真实模型。Mock PV 下载 JSON 回执，不是 MP4。

真实联调使用 `npm run dev:frontend` 与 `npm run dev:backend`，或同机 `npm run dev`。将 `.env.development.example` 复制为 `.env.development.local`，按本机或 SSH 转发端口设置 `VITE_API_PROXY_TARGET`。配置和两人分工见[团队工作流](docs/TEAM_WORKFLOW.md)。

真实能力按需配置：

- LLM：在本机后台或 `.env` 配置服务地址、模型、Key；密钥只在后端，所有 `VITE_` 值对浏览器公开。新自由作曲依赖 LLM，失败不静默退回旧模板。
- 器乐：可用浏览器 Web Audio，或安装 FluidSynth 与授权 SoundFont。
- 中文演唱：使用已授权的绮萱、声码器和 OpenUtau 无窗口桥接；不会把元音测试音当作中文演唱。此路线不需要 Python checkpoint 推理。
- 真实 MP4：需要带 libx264 / libass 的 FFmpeg，可设 `FFMPEG_PATH`。
- 引擎、模型、缓存、后台配置均在仓库外；`SONGYU_EXTERNAL_ROOT` 指定资源根目录。部分实测脚本仍写死原机器路径，使用前按 Blacktea 工单核对，不能仅改环境变量就假定全部可移植。

本机管理后台直接打开 **`http://127.0.0.1:3001/admin`**（端口随后端配置变化）；Vite 的 5173 **不代理后台**。密钥由 Windows DPAPI 加密，换电脑需重新配置。详见[后台说明](docs/ADMIN.md)。

## 本地演示

Windows 可运行 `start.bat`：检查环境、缺依赖时执行 `npm ci`、构建源码、启动同源页面/API，再打开浏览器。`--no-open` 不打开浏览器，`--check` 完成启动检查后自行停止。不会替换 `.env` 或关闭占用端口的其他服务。

手动方式：

```powershell
npm run build
npm start
```

打开 `http://127.0.0.1:3001`。现有页面可演示 TAP → 音乐积木 → 单句歌词/演唱 → 歌词 PV。元音模式只唱元音；安装并启用真实绮萱后才是中文歌声。新自由创作的一键流程尚未接线。

## 架构与数据

单仓库、React + TypeScript / Vite、Node + Express。开发时两进程通过 `/api` 通信，构建后 Express 同时提供 `dist/` 与 API。

- `src/`：页面、hooks、用例、浏览器音乐计算、播放/混音、保存与导出；并非全部属于 UI 分工。
- `server/`：HTTP 路由、LLM、真实引擎、缓存、FFmpeg、本机后台。
- `shared/`：两端共用的数据校验、声明与纯音乐逻辑，不读环境或文件。
- `scripts/`：启动、桥接、实测工具；`tests/`：单元、接口、浏览器测试。
- docs/：稳定说明、交接与倒序迭代日志；CC-Tasks/：以数字和任务简述命名的计划/工单。

详细目录与所有权见团队工作流。旧模式使用四段/六轨的积木流程；自由作曲保留四段结构，但支持 1–8 行歌词、20–30 秒目标时长，不固定为四句或恰好 24 秒。

`SongProject` 记录稳定 ID、音符、歌词来源、锁定、版本和资产依赖，时间统一以 beat 保存。JSON 不内嵌真实音频、密钥或模型；换电脑后外部缓存可能缺失，需要重新生成，不能承诺只凭 JSON 自动恢复原歌声。浏览器只自动保存当前工程，新建前先导出需要保留的作品。

## 协作工单

本项目用 CC-Tasks/数字-任务简述.md 管理计划，checkbox 只在工单中更新；完成记录写入 [docs/iteration-log.md](docs/iteration-log.md)，新记录在上，每条注明工单及相关文档地址。规则见 [AGENTS 项目专属工作流](AGENTS.md#project-workflow)。

| 谁 / 任务 | 应做清单与依赖 |
|---|---|
| Blacktea（红茶） | [4 · 接口交接与真实联调准备](CC-Tasks/4-blacktea-integration.md)：字段/示例、可移植实测工具、授权资源与联调环境 |
| Toge（toge） | [5 · 自由创作 Mock、页面与局部编辑](CC-Tasks/5-toge-free-creation.md)：先补 Mock/最小页面，再接旋律、调教和混音 |
| 双方共同验收 | [6 · 正式新页面真实闭环与听感](CC-Tasks/6-joint-acceptance.md)：依赖 4/5 就绪，分别记录 Mock、真实引擎、页面和人工听感 |
| 本轮文档整理 | [7 · 项目工作流整理](CC-Tasks/7-documentation-workflow.md)：已完成的范围与验证入口 |
| 历史需求 | [1 · 动态旋律与歌声表现力](CC-Tasks/1-dynamic-melody-and-performance.md)：保留原需求，不重复实现已交付部分；旧 2/3 未随仓库保存，不复用编号 |

## 文档与验证入口

| 需要了解什么 | 阅读入口 |
|---|---|
| Agent 长期规则 | [AGENTS.md](AGENTS.md) |
| 两人分工、目录、分支、联调、文档维护 | [TEAM_WORKFLOW.md](docs/TEAM_WORKFLOW.md)与上方[协作工单](#协作工单) |
| 当前接入缺口、双方下一步、验收条件 | 上方[Blacktea / Toge / 共同工单](#协作工单) |
| API 用法与共享字段变更 | [API_CONTRACT.md](docs/API_CONTRACT.md)、[契约变更记录](shared/contracts/CHANGELOG.md) |
| 阶段完成记录、已执行与未验收项 | [迭代日志](docs/iteration-log.md)，按日期倒序 |
| 后台、资源、歌声与许可记录 | [ADMIN.md](docs/ADMIN.md)、[QIXUAN.md](docs/QIXUAN.md)、[PROVIDERS.md](docs/PROVIDERS.md) |

验证按改动范围执行，条件见团队工作流。E2E 会自行启动隔离服务，不用先运行开发服务。CI 不安装声库，不等于真实引擎或人工听感通过。真实手机及 Safari 音频不能由 Chromium 模拟检查代替。

背景为原创程序化 Canvas，没有 AI 生图调用；不训练模型，不分发第三方权重，公开作品须保留适用的歌声/技术署名。历史方案与测试数字在各日期记录中保留，不作为当前环境已通过的承诺。
