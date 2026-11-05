# 声屿 SONGYU

**v0.2 已接入绮萱真实中文演唱**：在「虚拟歌姬」中逐句生成、重唱和比较历史版本；CPU / DirectML 调用官方 OpenUtau 的 DiffSinger 组件。25 秒真实混音与 MP4 已验收，安装、缓存和授权边界见 [绮萱接入说明](docs/QIXUAN.md)。

新增本地[后台管理面板](docs/ADMIN.md)：启动后打开 `http://127.0.0.1:3001/admin`，可配置 URL / API Key / 模型与引擎路径、测试连接、查看生成任务、扫描资源及维护声库注册表。密钥由 Windows DPAPI 加密保存于仓库外，不回显。

器乐新增可选 FluidSynth，支持标准 MIDI、OpenUtau USTX、单句 DiffSinger DS 和外部歌声 WAV 回导；真实中文声库尚未完成演唱验收。当前完整能力和限制以 [后台说明](docs/ADMIN.md) 为准，下文 P2.1 描述保留原阶段边界。

面向零音乐基础用户的本地音乐创作工作台。由 V3「创意积木」原型演进为 React + TypeScript 应用，原始 `03_patchlab_playful.html` 保留作视觉参考。

**交付范围：P0 + P1 完整链路、P2.1 可执行 SongPlan 引导编曲，以及 P3 的元音演示、真实混音与静止歌词 PV 导出。LLM 计划接口已实现并通过夹具测试；本机未配置密钥，未验证真实模型调用。**

P2.1 的字段、实际音乐变化、锁定兼容策略与验收边界见 [AI-Guided Composition](docs/P21.md)。

## 启动

Windows 推荐双击根目录的 `start.bat`。脚本会检查 Node/端口、首次缺依赖时自动安装、构建最新源码，并在页面和 API 就绪后打开浏览器。保持窗口开启，按 Ctrl+C 停止；失败时窗口保留错误。`start.bat --check` 可验证完整启动后自动停止，`--no-open` 可关闭自动打开浏览器。

这是单仓库的前后端分层架构：`src/` 负责界面、浏览器作曲/合成与本地存档；`server/` 负责 LLM 请求、密钥和 FFmpeg；`shared/` 只共享数据校验契约。开发时前后端两个进程经 `/api` 通信，构建后一个 Express 服务同时提供页面和 API。开发约定见 [AGENT.md](AGENT.md)。

需要 Node.js 22.12+（本机使用 22.23.1）、npm。视频导出需要 PATH 内的 FFmpeg（带 libx264、libass）。不需要 Python，不需要付费账户，不需要下载音库。

```powershell
cd D:\ai\hacson\music_agent
npm install
npm run dev
```

打开 http://localhost:5173 。Vite 在 5173，Node API 在 127.0.0.1:3001，Vite 代理 `/api`。API 仅监听本机。无 API 服务时，前端仍可创作、试听、保存与导出 WAV；MP4 和 LLM 功能会不可用。

构建并以单一 Node 服务启动：

```powershell
npm run build
npm start
```

然后打开 http://127.0.0.1:3001 。部署到自己的服务器时，需要安装 FFmpeg，并由反向代理转发 Node 服务。静态托管只支持浏览器部分，不能执行 FFmpeg。

## 现场演示（约 3 分钟）

1. 灵感页选择风格，在 TAP 上连续敲 4–8 下。间隔需要在 0.25–1.5 秒之间；超过 1.8 秒会开始新一次录入。
2. 点击「变成鼓点」。使用真实敲击间隔的中位数计算 BPM，量化为 16 分音符；可选补全军鼓与踩镲。音乐长度自动保持约 24 秒。
3. 在「音乐积木」选择 Verse，试听全曲，锁住鼓点。只重生成吉他，再试听比较。也可以直接点击格子编辑音符。
4. 在「虚拟歌姬」编辑第二句歌词、单句试听、换旋律。人声是按音高合成的元音演示，不会读出中文歌词。
5. 打开「歌词 PV」，选择字幕样式，预览四段配色背景。字幕和进度跟随同一个 Web Audio 时钟。
6. 导出 MP4、WAV 或完整工程 JSON。重新加载浏览器自动恢复，也可导入 JSON 继续创作。

若想用自然语言开始，先在首页输入灵感并点击「让灵感发芽」，再录入节奏。未配置 LLM 时明确使用本地规则和歌词模板。

## 已实现 / 能力边界

| 能力 | 实际实现 |
|---|---|
| 节奏输入 | 真实时间戳、间隔中位数 BPM、16 分量化、军鼓/踩镲补全 |
| 音乐生成 | 本地规则作曲器输出结构化音符；鼓、贝斯、吉他音色、和弦、旋律真实合成。不是音乐大模型，吉他为减法合成音色 |
| 分轨控制 | Intro / Verse / Chorus / Outro 各自 6 音轨；独立试听、版本、锁定、静音、重生成；格子为实际音符数据汇总，不是假波形 |
| 歌词 | 四句可独立手写、保留、重写旋律；手写与保留歌词不会被灵感生成覆盖 |
| 演唱 | 三种原创元音合成音色；音高/音节/时间真实可播放。**不发歌词音，不是中文歌唱，不是 TTS，不是商业音库** |
| PV | 原创 Canvas 海岛背景、分段配色、慢缩放/平移、三种字幕排版；自动字幕按歌词 beat 转为秒 |
| 导出 | 真正混音 WAV；Node + FFmpeg 编码 H.264/AAC 720p MP4，字幕烧录；完整工程 JSON |
| 保存 | 浏览器 localStorage 自动保存；JSON 导入时校验格式、ID、音符与段落时间范围 |
| AI 引导编曲 | 自然语言 → 有限且经过校验的 SongPlan → 实际音符；调性、和弦、鼓点密度、旋律走势和段落能量共同控制音乐。无 Key 使用本地规则；有 Key 可请求真实 LLM 计划，配置状态与成功调用分别标注 |
| 移动端 | 响应式布局、触控 TAP、底部播放器；已做 390px 浏览器模拟检查，真实手机及 Safari 音频仍需设备验收 |

## 数据与结构

```text
src/model.ts       SongProject、稳定 ID、版本、锁定、依赖、导入校验
src/composer.ts    原有 Composer / LyricsWriter、单轨重生成、量化
src/guided-composer.ts  SongPlan 驱动和弦、节奏、旋律、演示元音
src/composition.ts  原子应用方案、锁定/手写保护、LLM 与本地入口
src/song-plan.ts    本地意图规则、旧工程调式、可读创作说明
shared/song-plan.mjs    前后端共用严格 Zod 契约
server/planner.mjs  服务端 LLM 请求、严格输出校验与运行时状态
src/providers.ts   IdeaAnalyzer / VisualPlanner、轻量创作协调器契约
src/audio.ts       VocalProvider、真实音频合成、音频时钟、WAV 编码
src/visual.ts      ImageProvider、PV Canvas、同步字幕选择
src/App.tsx        四个工作台、创作协调、浏览器存储、导出交互
server/index.mjs   服务端 LLM、参数校验、临时文件、FFmpeg PVRenderer
tests/             核心数据测试与真实 Chromium 验证
docs/              实现方案、验收记录与后续接入取舍
```

`SongProject` 保存 BPM、4/4 拍号、分段、音轨、音符、逐句歌词、音色、画面、资源来源、版本日志。所有音乐事件以 beat 为单位，播放/字幕/导出统一按 `beat * 60 / bpm` 换算。

单轨重生成只替换目标音轨的 notes 并增加版本，锁定轨道直接返回原工程。全曲速度改变影响全部时间范围，因此有锁定轨道时禁止变速；未锁定时重排段落长度并缩放原有音符时间，保留轨道/片段 ID 和手写歌词。格子编辑应用于当前段落所有小节。编辑时停止播放，防止旧音频与新画面混用。

JSON 工程不包含 API 密钥、音频文件或商业素材，音频可从音符重新渲染。浏览器存储不是多作品库；新建作品前先导出需要保留的工程。

## 可选 LLM 配置

复制 `.env.example` 为 `.env`，填写 `LLM_API_KEY`、`LLM_BASE_URL` 和 `LLM_MODEL`，重启服务。Key 只在 Node 进程中读取，禁止使用 `VITE_` 前缀。外部请求超时 30 秒，返回值经 Zod 校验，失败保留原工程并提示错误。明确区分本地规则、LLM 已配置但未验证、真实调用返回有效方案三种状态。成功调用及共享 Schema 校验后，才显示最近方案已校验；失败不覆盖工程，并提供明确的本地规则生成入口。

FFmpeg 不在 PATH 时设置 `FFMPEG_PATH` 为可执行文件绝对路径。服务一次仅编码一个视频，临时数据在导出结束/失败后清理。Windows 使用 Microsoft YaHei；Linux 建议安装 Noto Sans CJK 字体并调整 ASS 字体名。Google Fonts 只用于可选界面字体，网络不可用时回退到本机中文字体，核心链路不依赖它。

## 验证

先启动 `npm run dev`，另开终端：

```powershell
npm run build
npm test
npx playwright install chromium
npm run test:e2e
```

浏览器测试验证实际 PCM 非静音、独立重生成产生音频差异、锁定数据不变、单句编辑、存档恢复、字幕边界、手机溢出和真实下载。查看 [验收记录](docs/ACCEPTANCE.md) 获取当前执行结果及限制。

## 当前阻塞与下一步

1. **最值得优先接通：有明确授权的中文歌声引擎与音库**，用 VocalProvider 消费已有歌词、音节、音高和时值，产出真正发歌词音的单句 WAV。当前缺少已授权的音库和已验证推理服务。
2. 配置并实测 P2.1 LLM SongPlan，做真实提示的对照试听、延迟与成本记录。计划已经能驱动音符；当前尚无真实 LLM 调用验收，不把计划接口包装成音乐音频模型。
3. 之后再评估图像 API。当前程序化画面足以稳定演示字幕 PV，避免把图像接口变为核心链路单点依赖。

歌声方案的官方资料和许可边界见 [PROVIDERS.md](docs/PROVIDERS.md)。本项目未下载或分发第三方商业音库，没有预录歌曲，也没有训练模型。
