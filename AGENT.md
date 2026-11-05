# SONGYU 开发约定

## 双人分工：所有 Agent 必须遵守

先读 `docs/TEAM_WORKFLOW.md` 和本轮工单；本地若有 `协作.md` 也先阅读，明确自己代表谁。没有明确 Owner 时先按当前工单范围工作，不接管另一人的区域。

- **红茶 / Backend / Agent**：server、引擎桥接 scripts、音乐核心计算、音频缓存/混音/FFmpeg、后端测试。本轮 `cc-tasks/1.md` 属于红茶。
- **小由 / Frontend / UX**：App.tsx、components、hooks、*Panel.tsx、CSS、钢琴卷帘与调教交互、前端 Mock、前端 E2E。红茶不得顺手改这些文件，不以修构建、优化架构或完善功能为由扩大范围。
- 前端 Agent 同样不得自行改真实 LLM、作曲算法、声库、推理、服务端缓存和桥接器。
- **共享边界**：shared、src/model.ts、src/api/client.ts 及跨层业务适配。先在 shared/contracts/CHANGELOG.md 写字段、兼容性、调用点和测试说明，经双方或用户明确授权后再改。本轮用户已授权红茶按工单统一确认新契约；这不授权改小由 UI。
- 开始、提交、推送前检查 git status / diff；只暂存本轮拥有的文件。保留其他人的未提交改动与工单，不执行全仓 git add、reset、clean、覆盖还原或强推。
- 各自使用 feature/frontend-* / feature/backend-* 分支；main 保持稳定。跨区发现问题写交接说明，不擅自代改。测试失败若属于另一方工作，报告具体影响和证据。
- 完成时写清实际实现、契约接入方式、真实与 Mock 测试边界、交接项和提交；不得把后端接口完成说成小由 UI 已接通。

## 产品与范围

v0.2 更新：已实际调用用户后台配置的 LLM 并校验两组 SongPlan；已接入绮萱 v2.7.0 真实中文演唱，CPU / DirectML、网页单句重唱、缓存保护及 25 秒 WAV / MP4 实测通过。`server/qixuan.mjs` 调用 `scripts/openutau-bridge/`，桥接器复用未修改的官方 OpenUtau 0.1.576 程序集与声码器，不使用 Python checkpoint 路线、不转换模型。下文旧阶段“真实歌声未接入 / 无真实 Key 验收”已由此更新。细节与后续听感边界见 `docs/QIXUAN.md`。

声屿 SONGYU 是面向零音乐基础用户的本地音乐创作 Web Demo。保留 V3 创意积木的统一视觉，维持 Intro / Verse / Chorus / Outro、每段六轨和约 24 秒作品流程。

当前实现：P0/P1 工作台与真实音符合成；P2.1 可执行音乐计划；绮萱真实中文歌声、FluidSynth 及歌词 PV。真实验收以本轮实际运行记录为准，历史记录与 Mock 不代表当前引擎验收。

## 架构与职责边界

补充（本地引擎与后台）：`server/admin-config.mjs` 负责仓库外原子配置与 Windows DPAPI；`server/admin.mjs` 负责仅限本机的管理 API、任务与资源台；`server/public/` 为无构建管理页面。管理 API 不得返回密钥、记录请求体或上游原始错误，不能回退明文存储。`server/instruments.mjs` / `server/singing.mjs` 负责外部引擎，`src/singing.ts` 负责工程交换与依赖，`src/audio.ts` 仍为试听与全部导出的统一混音入口。详见 `docs/ADMIN.md`。下文“不需要 Python / 不需要音库”仅适用于原有 Web Audio 模式。

这是**单仓库、前后端分层、浏览器端承担创作计算的轻量 Web 架构**。不是大型 Agent 系统，没有数据库、登录或微服务。

- `src/` 是 React + TypeScript 前端。UI、SongProject、节奏录入、本地作曲、Web Audio 合成、Canvas 预览、localStorage、WAV 和工程 JSON 导出都在浏览器执行。
- `server/` 是 Node.js + Express 后端。负责带密钥的 LLM 请求与严格校验，以及本机 FluidSynth、OpenUtau / DiffSinger、音频缓存和 FFmpeg 编码。不得把服务端环境变量或密钥导入前端。
- `shared/song-plan.mjs` 是前后端共用的纯 Zod 数据契约，相邻 `.d.mts` 提供 TS 类型。不得添加服务器 I/O、环境变量读取或秘密。
- `src/composition.ts` 负责原子应用计划、异步规划入口、锁定和手工内容保护；`src/guided-composer.ts` 将计划变成实际音符；`src/composer.ts` 保留旧工程作曲器、量化、版本与单轨操作。
- `src/App.tsx` 只组合页面；`src/hooks/` 协调状态、播放器和歌声操作，`src/features/` 管工程、导出和生成结果事务。不要在 UI 中新增 fetch / 缓存依赖校验。`src/api/client.ts` 是统一 API 边界，Mock 只用于开发测试。
- `shared/contracts/` 统一公开请求/响应；运行时 `.mjs` 与相邻 `.d.mts`、Mock、测试必须同步。SongPlan 只在原共享文件定义。团队分工与 Git 规范见 `docs/TEAM_WORKFLOW.md`，接口见 `docs/API_CONTRACT.md`。
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

维护 `README.md`、`docs/ACCEPTANCE.md` 和相关阶段文档，交付时说明文件、实际变化、执行结果、未验证项与下一步。P2.1 详细设计与测试边界见 `docs/P21.md`；原型与基础取舍见 `docs/IMPLEMENTATION.md`；能力和许可评估见 `docs/PROVIDERS.md`。

推送排除 `node_modules/`、`dist/`、`.env`、`exports/`、测试输出和构建缓存，保留 `.env.example`。不要为了上传而修改仓库可见性或强推覆盖远端历史。
