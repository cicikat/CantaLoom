# SONGYU 两人协作工作流

本文件维护稳定流程与目录所有权；当前能力见 [README](../README.md)，任务 checkbox 见 [README 协作工单](../README.md#协作工单)索引的 CC-Tasks 清单。包版本与能力阶段不是同一概念；后端交付、Mock 可用、页面接线和完整验收分别记录。

## 开发入口与依赖

日常使用从 [README 的双击入口](../README.md#launch) 进入。中文启动器复用既有 start.bat；开发命令与 Mock 留在开发说明，不要求使用者靠命令分辨原型与工作台。制作前准备检查只读资源配置，不代替真实引擎验收。

需要 Node.js 22.12+，两人各自 clone 仓库并在根目录执行 `npm ci`。前端默认无需引擎：

```powershell
npm run dev:mock
# http://127.0.0.1:5173，仅 Vite，不启动后端
```

Mock 已覆盖旧工作台及 compose / melody / production 的 API 夹具、任务阶段和单句重试；工单 5 A2 已接通首页输入到试听，C 钢琴卷帘与指定句重作曲已接线，均通过 Mock 页面回归；真实页面闭环与人工听感仍待工单 6，不能把 Mock 通过理解为真实引擎验收。后端独立运行 `npm run dev:backend`；不需要改 JSX，交付时仍按影响范围验证构建和相关测试。

真实联调：分别启动 `npm run dev:frontend` / `npm run dev:backend`，或同机 `npm run dev`。复制 `.env.development.example` 为 `.env.development.local`，配置 `VITE_API_PROXY_TARGET=http://127.0.0.1:3001`（或 SSH 本地转发端口）。不要在 `.env.local` 设置 Mock 开关覆盖团队模式。所有 `VITE_` 值对浏览器公开，禁止写密钥；后端端口/密钥放本机 `.env` 或加密后台配置。

跨电脑优先 SSH 将队友公共 API 转发到自己的 loopback 端口。不修改后端 `127.0.0.1` 监听地址，不公开管理端口，不为联调解除 Host / Origin / CSRF / DPAPI 限制。后台只能直接访问后端本机地址，默认 `http://127.0.0.1:3001/admin`；Vite 不代理 `/api/admin`、`/admin`、`/admin-assets`。

真实演唱需要已授权声库、声码器与 OpenUtau 桥接，器乐可选 FluidSynth，真实 MP4 需要 FFmpeg。第三方资源与密钥不进 Git。部分实测脚本仍有原机器绝对路径，按[Blacktea 工单 B2](../CC-Tasks/4-blacktea-integration.md)核对，不承诺环境变量能覆盖所有历史脚本。

## 前端设计与实现边界

以 `03_patchlab_playful.html` 的 LOOP! 视觉与交互为前端接线基础，保留原型的版式、积木操作、歌词卡片和 PV 入口。现有 React 四页工作台有可复用的工程、播放和 API 接线，但其存在或测试通过不构成替换原型设计的授权。技术框架和演示脚本需要调整，不等于需要重做视觉；涉及布局、导航或主流程替换时先向 toge 说明具体变化并确认，不能由 Agent 自行把原型降为参考、废弃或历史页面。

当前入口与目标尚未一致，见[原型接线边界](ARCHITECTURE.md#prototype-frontend)和[工单 5](../CC-Tasks/5-toge-free-creation.md)。历史“新页面”指当时 React 接线记录，不作为另造原型的要求；原型接入后须重新验收，不沿用四页工作台的测试作为完成证明。

## 文件所有权

| Owner | 路径和职责 |
|---|---|
| toge / Frontend / UX | `src/App.tsx`、`components/`、`*Panel.tsx`、`hooks/`、CSS、Canvas 展示、钢琴卷帘与调教交互、`src/api/mock.ts`、前端浏览器测试 |
| Blacktea（红茶） / Backend / Music Engine | `server/`、引擎/实测 scripts、音乐核心计算、服务端音频缓存与 FFmpeg、后端测试；`src/composer.ts`、`guided-composer.ts`、`song-plan.ts`、`composition.ts`、`singing.ts`、`melody.ts` |
| 跨层适配，双方确认 | `src/audio.ts` / `audio-mix.ts` 浏览器混音、`external-audio.ts` 资产适配、`src/features/` 用例；先明确此次修改 Owner、调用点与影响，由另一方看接口，不为目录所有权搬进 Node |
| 公共契约与配置，双方确认 | `shared/`（契约、声明、共用纯音乐计算）、`src/model.ts`、`src/api/client.ts`、Vite/package/Playwright/CI 配置 |
| 文档 | 各自更新任务相关说明与证据；协作规则/共同计划变更在任务或 PR 说明，不能通过改文档暗中扩大代码授权 |

不得以修构建、完善功能为由代改另一方区域。跨区问题写清证据和影响后交接。没有明确 Owner 时只做当前明确范围。UI 触发用例，HTTP 经统一 Client；服务端不导入 React 或 `src/`；shared 不做 I/O、不读取环境或秘密。保留有真实调用方的旧模块路径。

## 架构与资源入口

目录和层间调用见 [ARCHITECTURE](ARCHITECTURE.md)，引擎/后台/资源见 [ENGINES](ENGINES.md)。这里维护所有权与协作规则，避免多份文档重复定义结构。

## 跨端交接登记

需要对方接手、确认或联调的事项，由发起方 Agent 在本轮提交前自动同步到根目录 [CROSS-END-HANDOFF.md](../CROSS-END-HANDOFF.md)，原工单只留交接 ID 和链接，checkbox 仍由原工单维护。对方填写确认范围与回执；共享契约仍按下节确认，登记不等于获得实施授权。

交接正文不作为启动必读或自动上下文，只在相关任务中按工单号、接收方或模块检索。完成后将实际结果与证据写回原工单及迭代日志，再默认删除交接条目和索引行；需短暂保留时标注已完成、日期与证据，下一次整理移除。已确认但未实施/未验证的交接继续保留。

## 接口先行与 Mock 交接

1. 需要新字段或改变含义时，先在[共享变更记录](../shared/contracts/CHANGELOG.md)写提案：Owner、字段/调用点、兼容方式、Mock/测试负责人、确认状态与关联任务/PR。
2. 双方确认，或 toge 明确授权限定范围后实施。历史“本轮授权”只属于其记录的任务，不能延伸到后续任务。
3. 红茶提供合规、无密钥的响应示例与失败/阶段语义；toge扩展既有 Mock 并接页面。字段、来源标记与工程应用方式先确认，禁止各造一套契约。
4. 默认一个 PR 同步运行时 `.mjs`、声明 `.d.mts`、Client、Mock 与契约测试。确需分两人 PR：先约定同一契约，后端 PR 明示“后端交付 / Mock与页面待接”，toge接入 PR 链接它；未联调前不宣称产品完成，不发布依赖未完成 Mock 的新入口。
5. 新增可选字段优先；删除/改义字段提供旧工程与调用方迁移方案。新流程的结果应用与失败保护按 [API 说明](ARCHITECTURE.md#public-api)和交接执行。

Mock 为浏览器内部 transport，不回落真实后端。测试音显式 isDemo/mock，任务状态不伪造真实推理；存档用 `songyu-mock-project-v1`，真实用 `songyu-project-v1`，Mock 工程/WAV 文件名带 .mock，PV 是 JSON 回执。真实模式拒绝 Mock 响应/歌声资产。新自由创作沿用 mock:true，工程记录为 local-rules / mock，具体限定授权与字段见契约变更记录；不能把 fixture 记为真实 LLM 成功。

## 分支、提交与 PR

- 本仓库采用功能分支 + PR，这是针对本仓库的协作安排。两人默认各自独立 clone；不要求每项任务另建 worktree。
- 新任务核对当前分支、工作区和最新 main，从最新 main 开 `feature/frontend-*` 或 `feature/backend-*`；延续任务保留原分支，不顺手切换或清理。
- 开始、暂存、提交及推送前检查 status/diff；只暂存本次已完成且验证过的文件，不做全仓 git add，不覆盖其他人的改动。
- 完成步骤先更新对应工单 checkbox，并在 docs/iteration-log.md 顶部写明日期、实际结果、验证边界、工单和相关文档地址，再本地提交。进入协作交付时推送本人分支并开 PR，另一方 review；明确要求仅本地/不推送的任务停在本地提交。
- 合并前更新分支并按范围回归；发生冲突先报告文件和原因，不擅自选一方覆盖，不强推或自动合并 main。
- PR 写清实际结果、契约/调用点、Mock与真实测试边界、未完成交接，以及工单/迭代日志链接。main 可保留向后兼容但尚无页面入口的 API；这不代表新产品阶段已完成。
- CI 配置在 main、匹配的 feature/codex 分支 push 和 PR 运行。维护者需实际核实远端运行及 main 的 `checks` 必需检查，配置文件存在不表示保护设置已经启用。

## 验证与完成标准

| 修改范围 | 需要的验证 |
|---|---|
| 纯文档 | 本地链接/引用、内容与源码一致性、git diff --check；不为此运行构建或模型 |
| 普通 UI / 业务代码 | build、相关单元/接口测试；交互改动补对应页面测试 |
| 新流程接入 | Mock 页面流程 + 有资源主机上的真实页面流程，分别报告 |
| 引擎、音频、缓存或导出 | 相关测试及受影响的真实引擎/PCM/WAV/PV 回归，不以构建成功替代 |
| 阶段交付 | 根据计划执行必要全量回归，列出通过/失败/跳过与环境，补人工体验验收 |

命令入口：

```powershell
npm run build
npm test
# 首次浏览器测试前按需安装
npx playwright install chromium
npm run test:e2e:mock
npm run test:e2e
.\start.bat --check
```

E2E 自动启动隔离服务，不必预先启动 dev；默认真实前端 5183、API 3101、Mock 前端 5184，可用 E2E_FRONTEND_PORT / E2E_API_PORT / E2E_MOCK_PORT 调整，不复用运行中实例。完整套件需真实资源；绮萱还依赖既有本机工程，缺资源可 skip，必须报告跳过。CI 排除部分 FluidSynth / Qixuan / FFmpeg 用例，不等于真实生成验收。

每个功能分开记录“后端/核心完成、Mock可用、页面接线、真实联调、共同验收”；checkbox 仅存在对应 CC-Tasks 工单。请求成功、Schema通过、非静音、PCM差异均不能替代从正式页面创作和人工听感。制作 ready-for-mix 也不等于已导出作品。

## 文档职责与更新

本项目计划使用 CC-Tasks，日志倒序；规则见 [AGENTS 专属工作流](../AGENTS.md#project-workflow)。

| 入口 | 维护内容 |
|---|---|
| README | 当前能力、启动与工单/文档索引 |
| AGENTS / TEAM_WORKFLOW | Agent 规则、职责、接口协作、分支和验证流程 |
| ARCHITECTURE | 系统目录、工程/音乐数据、HTTP 契约、页面接线、调教与混音 |
| ENGINES | 无窗口引擎、后台配置、安全、资源与许可 |
| CC-Tasks/数字-任务简述.md | 当前或历史计划；Owner、状态、范围、依赖、验收及唯一 checkbox |
| iteration-log | 唯一完成与历史记录；日期倒序，必须链接工单和相关文档 |
| shared/contracts/CHANGELOG.md | 共享字段提案、确认与兼容记录，保留在契约旁边 |

docs 按模块和主题维护，阅读入口统一放在 README。同类说明更新到已有文档的相关章节；新模块有独立说明价值时可新增文档，并同步 README 索引。遗留/新计划统一进 CC-Tasks；历史过程、测试数字、旧环境、失败和停止点进迭代日志。历史工单标明已被后续交付覆盖，不能直接当作新的执行授权。

整张工单完成后移入 CC-Tasks/已完成/，保留编号和文件名并修正引用；未完成及未明确关闭的历史工单留在根目录。

完成一项后立即更新工单并在日志顶部记录日期、实际结果、验证边界、工单与相关文档地址；按范围验证后一起本地提交。Mock、真实引擎、正式页面和人工听感分别报告。按任务授权推送/PR，不自动合并 main。
