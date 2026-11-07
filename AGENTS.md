# SONGYU 开发约定

远端仓库：[cicikat/CantaLoom](https://github.com/cicikat/CantaLoom)；Git 拉取地址：`https://github.com/cicikat/CantaLoom.git`。

<a id="project-workflow"></a>

## 本项目专属工作流：优先于通用文档习惯

这是 Blacktea 与 Toge 的协作项目。以下规则覆盖全局中不适用于本项目的计划目录、日志和分支约定；数据安全与明确授权要求继续遵守。

- **临时文件与备份放在本项目内**：本项目需要推送到 main，temp 和 backup 统一使用项目根目录下的 `temp/`、`backup/`，作为全局仓库外存放规则的项目例外。
- **计划采用工单模式**，唯一目录为 [CC-Tasks/](CC-Tasks)，文件名为 数字-任务简略描述.md（例如 5-toge-free-creation.md），数字在前、描述清楚。新工单使用未占用且未在历史引用中使用过的编号，不复用已关闭或缺失的旧编号；不再在 docs/plans/ 新建本项目计划。
- **已完成工单移入 CC-Tasks/已完成/**，保留原编号和文件名，迁移时同步修正内外引用；待实施、待排期与未明确关闭的历史工单保留在根目录。
- 每张工单写明 Owner、状态、范围、依赖、应做 checkbox、验收与交接入口；完成一项及时更新该工单，不在导航或日志复制另一套 checkbox。
- **唯一迭代日志是 [docs/iteration-log.md](docs/iteration-log.md)**，按日期倒序，新条目写在最上方。每条必须注明对应工单与相关文档的可点击地址，并写实际结果、验证边界、未完成交接；不再分散新增 ACCEPTANCE 或版本验收报告。
- **docs 按主题组织**，文档入口统一挂在 [README](README.md#文档与验证入口)。同类说明合入已有文档；新的模块有独立说明价值时可新增文档，并同步 README 索引。计划放 CC-Tasks，历史过程、版本交接过程、审计与验收数字归入迭代日志。
- Blacktea 与 Toge 的各自清单，以及共同验收，从 [README 协作工单](README.md#协作工单)进入；稳定边界/联调/Git 规则见 [TEAM_WORKFLOW](docs/TEAM_WORKFLOW.md)。工单内容不是自动跨区授权。
- 默认使用功能分支开发，已有任务沿用原分支。任务完成修改并通过必要验证后必须及时提交。不默认推送远端，只有用户提出推送时才推送，直接更新并合并 main，无需逐次确认或另开分支。

## 双人分工：所有 Agent 必须遵守

先读 [团队工作流](docs/TEAM_WORKFLOW.md)和 README 索引的本人/共同工单；当前进度只在 CC-Tasks 对应工单维护 checkbox，旧工单须看状态与日期。没有明确 Owner 时先按当前任务范围工作，不接管另一人的区域。

- **Blacktea（红茶） / Backend / Music Engine**：server、引擎桥接 scripts、音乐核心计算（含 `src/melody.ts`）、音频缓存、FFmpeg、后端测试。浏览器混音与跨层适配按团队工作流共同确认。
- **toge / Frontend / UX**：App.tsx、components、hooks、\*Panel.tsx、CSS、钢琴卷帘与调教交互、前端 Mock、前端 E2E。
- 前端 Agent 同样不得自行改真实 LLM、作曲算法、声库、推理、服务端缓存和桥接器。
- **共享边界**：shared、src/model.ts、src/api/client.ts 及跨层业务适配。先在 shared/contracts/CHANGELOG.md 写字段、兼容性、调用点和测试说明，经双方或 toge 明确授权后再改。具体授权必须关联任务/范围；历史工单授权不自动延伸到新任务，也不授权代改另一方 UI。
- 开始、提交、推送前检查 git status / diff；只暂存本轮拥有的文件。保留其他人的未提交改动与工单，不执行全仓 git add、reset、clean、覆盖还原或强推。
- 各自使用 `feature/frontend-*` / `feature/backend-*` 分支；main 保持可演示。跨区发现问题写交接说明，不擅自代改。测试失败若属于另一方工作，报告具体影响和证据。
- 完成时写清实际实现、契约接入方式、真实与 Mock 测试边界、交接项和提交；不得把后端接口完成说成 toge UI 已接通。

## 产品与范围

声屿 SONGYU 是面向零音乐基础的本地音乐创作 Web Demo，保留 V3 创意积木视觉。旧模式维持四段/六轨和约 24 秒流程；自由作曲模式保留四段，但支持 1–8 行歌词、20–30 秒目标时长，不能把四句固定模板限制套到新模式。

当前能力、版本含义与证据入口见 `README.md`；任务进度见 README 索引的当前工单。已有真实 LLM、绮萱演唱与导出历史记录，不得继续写成“尚未接入”；也不得把历史记录当成本机刚刚通过的验收。最新后端能力不等于正式新页面已接通，Mock、真实引擎、人工听感必须分别报告。

## 架构与职责边界

`server/admin-config.mjs` 负责仓库外原子配置与 Windows DPAPI；`server/admin.mjs` 负责仅限本机的管理 API、任务与资源台；`server/public/` 为无构建管理页面。管理 API 不得返回密钥、记录请求体或上游原始错误，不能回退明文存储。外部引擎在 server/services 与保留的 singing 文件交换入口，`src/singing.ts` 负责工程交换与依赖，`src/audio.ts` 为试听与导出的统一混音入口。依赖与后台边界见 [引擎与后台](docs/ENGINES.md#admin)；Mock/Web Audio 不要求声库，真实演唱需要已授权资源。

这是**单仓库、前后端分层、浏览器端承担创作计算的轻量 Web 架构**。不是大型 Agent 系统，没有数据库、登录或微服务。

- `src/` 是 React + TypeScript 前端。UI、SongProject、节奏录入、本地作曲、Web Audio 合成、Canvas 预览、localStorage、WAV 和工程 JSON 导出都在浏览器执行。
- `server/` 是 Node.js + Express 后端。负责带密钥的 LLM 请求与严格校验，以及本机 FluidSynth、OpenUtau / DiffSinger、音频缓存和 FFmpeg 编码。不得把服务端环境变量或密钥导入前端。
- `shared/song-plan.mjs` 是前后端共用的纯 Zod 数据契约，相邻 `.d.mts` 提供 TS 类型。不得添加服务器 I/O、环境变量读取或秘密。
- `src/composition.ts` 负责原子应用计划、异步规划入口、锁定和手工内容保护；`src/guided-composer.ts` 将计划变成实际音符；`src/composer.ts` 保留旧工程作曲器、量化、版本与单轨操作。
- `src/App.tsx` 只组合页面；`src/hooks/` 协调状态、播放器和歌声操作，`src/features/` 管工程、导出和生成结果事务。不要在 UI 中新增 fetch / 缓存依赖校验。`src/api/client.ts` 是统一 API 边界，Mock 只用于开发测试。
- `shared/contracts/` 统一公开请求/响应；运行时 `.mjs` 与相邻 `.d.mts`、Mock、测试必须同步。SongPlan 只在原共享文件定义。团队分工与 Git 规范见 `docs/TEAM_WORKFLOW.md`，接口见 [架构与接口](docs/ARCHITECTURE.md#public-api)。
- `shared/` 还包含 melody、performance、free-timeline、free-score 等共用纯计算；不把共享目录理解为只有 Schema，也不在其中加入 Node I/O。
- `server/routes/` 管 HTTP，`server/services/` 管引擎服务。旧 instruments/qixuan/planner 入口只是兼容导出。禁止服务端导入 React 或 src。
- 所有事件以 beat 保存，播放、字幕、导出统一按 `beat * 60 / bpm` 换算。

开发：Vite `5173` 提供前端，通过 `/api` 代理到 Express `127.0.0.1:3001`。代理目标通过 `.env.development.local` 的 `VITE_API_PROXY_TARGET` 配置。Vite 不代理管理后台；后台仍只在后端 loopback 地址访问。

演示/构建后：`dist/` 是 Vite 产物，由 Express 同时提供页面和 API，一个 Node 进程、同源访问，默认 `127.0.0.1:3001`。`PORT` 可经 `.env` 修改。单进程部署不代表把前后端职责混在一起。

## 启动与构建

需要 Node.js 22.12+ 和 npm；MP4 另需 FFmpeg（libx264、libass），可用 `FFMPEG_PATH` 配置。前端 Mock 无需 Python 或任何音库。

- Windows 双击 `start.bat`：定位脚本目录、检查环境/端口、缺依赖时 `npm ci`、构建最新源码、启动单服务，页面/API 就绪后打开浏览器。窗口保留日志，Ctrl+C 停止。
- `start.bat --check`：执行同一启动流程，检查页面、构建资产和 API，随后自行停止；不打开浏览器。
- `start.bat --no-open`：启动并保持服务，但不打开浏览器。
- 开发：`npm ci` 后 `npm run dev`；独立前端 `npm run dev:mock`（无需引擎）或 `npm run dev:frontend`（真实联调），独立后端 `npm run dev:backend`。前端热更新，服务端 watch 自动重启。
- 手动演示：`npm run build` 后 `npm start`。
- 启动脚本逻辑在 `scripts/start-local.mjs`；不自动覆盖 `.env`、不打印密钥、不关闭占用端口的其他进程。不覆盖任何用户工程存档。

## 不可破坏的数据与生成约定

1. SongProject 的稳定 ID、版本、音符、歌词来源、锁定与静音状态必须可保存、导入和恢复。读取旧 v1 工程不自动改写已有音符；新计划与来源须经共享 Zod 校验。
2. 锁定轨道重生成前后完整数据不变。手工格子音轨在重新规划时保留；手写歌词文本不能被模型或模板覆盖。
3. 锁鼓不阻止更新和声。存在带音高且有音符的锁定/手写轨道，或锁定歌词音符时，重新规划维持原全曲调性与和弦，并冻结相关段落全部带音高轨道与歌词音符；只更新允许改动的鼓点及其他段落。须在页面解释有效计划与保护策略，不能宣称所有建议已应用。
4. 已录入节奏的底鼓落点保留，密度建议只影响允许补全的部分；补全关闭状态须保存。全曲变速在有锁定音轨时禁止。
5. 先完成请求、校验和完整新工程，再一次替换 UI state。错误 JSON、越界字段、超时和非成功 HTTP 响应都不能覆盖旧工程；保持异步请求代次保护。
6. SongPlan 必须实际控制和弦、密度、旋律与力度，不能只改变随机种子、文字说明或装饰动画。范围和枚举只在共享契约定义，避免前后端各有一套校验。
7. `local` 是本地规则；`unverified` 是 Key 已配置但真实调用未验证或最近调用失败；`verified` 仅在实际上游成功且完整输出校验后设置。持久化的来源记录不是本机刚刚调用成功的证明。

## 音频与 PV 边界

检查或运行 OpenUtau 仅使用无窗口 Bridge、程序探测及本机管理诊断 API，不通过电脑操控 OpenUtau GUI；缺少状态时补诊断接口，保留后台安全限制。

- 元音人声是按音符合成的演示，不会读出中文歌词；不得将 TTS、预录歌曲、示例声音或测试夹具包装成真实歌唱/AI 音频生成。
- 背景是原创程序化 Canvas，不宣称 AI 生图；不得下载或分发未授权声库、歌曲或素材。
- `src/audio.ts`、`src/visual.ts`、`server/services/export.mjs` 与 `server/routes/export.mjs` 的字幕和 FFmpeg 导出路径是现有稳定链路，修改需有明确需求并做真实导出回归。
- 不训练模型、不做 Live2D/3D、不引入大型 Agent 框架或无实际用途的微服务。

## 验证与交付

每次任务开始，先检查当前分支、工作区状态和 origin/main。不得覆盖未提交修改。本仓库实行功能分支 + PR：新任务从最新 main 建分支，已有任务保留原分支，按任务范围暂存并本地提交。进入协作交付时推送自己的分支并创建 PR，不自动合并 main；当前任务明确要求“仅本地”或“不推送”时不做远端操作。遇到冲突先报告文件和原因，不擅自覆盖。

修改前检查工作区，保护并行改动。根据改动范围运行必要检查，不以构建成功代替设备/真实模型/生产验收。

```text
npm run build
npm test
# E2E 自动启动隔离前后端；首次安装测试浏览器：npx playwright install chromium
npm run test:e2e:mock
npm run test:e2e
# Windows 启动链路：
start.bat --check
```

测试应验证真实 PCM 非静音、同 ID/版本的不同意图产生实际音符/声音差异、锁定数据不变、失败保留工程、无 API 可本地创作，并保留原有节奏/保存/字幕/WAV/MP4 回归。夹具响应须明确标注；真实手机、Safari 和真实 LLM 只在实际测试后宣称通过。

按 [团队工作流](docs/TEAM_WORKFLOW.md)维护：当前能力看 README，待办 checkbox 只在 CC-Tasks 对应工单；完成记录和具体测试证据统一写入 [迭代日志](docs/iteration-log.md)，日期倒序并注明工单和相关文档地址，接入方法更新到架构文档对应章节。纯文档任务检查链接、内容一致性与 diff，不运行构建/引擎测试。历史证据保留当时结果与限制，不能当作当前机器的新验收。

推送排除 `node_modules/`、`dist/`、`.env`、`exports/`、测试输出和构建缓存，保留 `.env.example`。不要为了上传而修改仓库可见性或强推覆盖远端历史。
