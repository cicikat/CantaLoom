# SONGYU 引擎、后台与资源

这里维护引擎调用、外部资源、配置、缓存与许可边界。页面/API 接入见 [ARCHITECTURE](ARCHITECTURE.md)，协作见 [TEAM_WORKFLOW](TEAM_WORKFLOW.md)；实际推理、安装清单和验收数字统一在[迭代日志](iteration-log.md)。本机是否安装须用实际诊断确认。

<a id="routes"></a>

## 演唱与器乐路线

- **OpenUtau / 绮萱**：`scripts/openutau-bridge/` 直接调用固定版本官方程序集，使用中文发音器、DiffSinger 渲染器、绮萱 ONNX 与声码器产出单句 WAV。已有真实中文推理历史记录；不是 TTS 或预录音。版本与原机器路径见[绮萱记录](iteration-log.md#qixuan)，资源来源与许可见[本页说明](#licensing)。
- **原生 Python DiffSinger**：保留文件交换/授权声库注册接口。ONNX 绮萱包不交给 Python infer.py；此保留路线不代表任意 checkpoint 已经过本项目验收。
- **外部 WAV 导入**：可回导合法来源歌声，并进入同一时间轴混音。
- **元音演示**：`src/audio.ts` 的 demoVocal 是浏览器合成元音，能表现旋律，不能读出中文歌词。Mock 测试音也不是真实演唱。

缺失或过期的真实歌声资产应明确报错或提示重新生成，不自动用元音替换并冒充成功。元音模式只能由明确的模式选择启用。歌声缓存、单句变更保护与统一试听/导出路径继续沿用已有实现。

旧页面通过 LLM 或本地规则取得 SongPlan，再由浏览器规则作曲器生成 Note。新自由创作通过 compose 完成宏观规划与结构化 MelodyDraft；production 进一步串联伴奏和绮萱推理，提供真实阶段与单句失败重试。LLM 生成规划/旋律数据，实际音频由引擎合成，不直接产出 WAV。

器乐可用 Web Audio 或 FluidSynth；歌声可选明确标注的元音演示、导入 WAV、已接入的 OpenUtau/绮萱，原生 Python DiffSinger 文件交换路线仍保留。真实中文演唱已有历史实测；新正式网页的完整流程和人工听感尚待共同验收。

单轨 / 单句 / 全曲试听、WAV 与 PV 都调用 `renderAudio`，统一 24000 Hz。歌声依赖包括本句歌词、音符、BPM、起止点、引擎、声库 ID 与版本；修改第二句不失效第一句。缺失或过期真实人声会报错，不自动换成元音。

### 绮萱调用链

用户歌词与 SongPlan → 本地 Note → USTX → **官方 OpenUtau 0.1.576 程序集中的中文发音器与 DiffSinger 渲染器** → 绮萱 v2.7.0 ONNX / 2025.02 社区声码器 → WAV → 浏览器统一混音 → WAV / MP4。

以上是旧模式入口；新自由作曲由 LLM 生成并校验 MelodyDraft 音符，自动制作再串联同一演唱引擎。主观听感和正式新网页闭环仍需双方验收，不因已有真实引擎记录而自动完成。

不转换、修改、训练模型。原有 Python DiffSinger checkpoint 路线保留，绮萱使用单独的 `openutau-diffsinger` Provider。没有把 ONNX 包传给 Python infer.py。

<a id="admin"></a>

## 本机后台与配置

右上角「主题」提供糖果 Bento（默认）、虹彩极光、多巴胺贴纸。配色取自用户原型，布局保持一致；偏好单独存于本机浏览器 `cantaloom-admin-theme`，不会写入服务配置或工程。异常存储、未知主题回退第一版。`node scripts/verify-admin-themes.mjs` 验证默认、切换、刷新保留、异常存储、布局尺寸、未保存输入以及 320/390px 抽屉。


入口：启动后端后直接打开 `http://127.0.0.1:3001/admin`（端口随后端 PORT 变化）。Vite 的 5173 不代理管理页面或管理 API，对这些路径返回 403；不要通过前端代理访问后台。沿用 Express，不需要额外服务或数据库。

- **连接与密钥**：填写 OpenAI 兼容聊天接口 Base URL、模型与 API Key。后端追加 `/chat/completions`；HTTPS，或本机 HTTP；拒绝带用户名、密码、查询参数的地址。API Key 为密码框，留空保留，勾选清除才删除。没有“显示已有明文”接口。
- **保存与生效**：`external/runtime/config/settings.json` 原子保存；Key 使用 Windows DPAPI CurrentUser 加密。配置优先于 `.env`，保存后规划器与引擎读取新值，不用重启。生成或检查运行中拒绝修改，避免同一请求混用配置。切回工作台时刷新健康状态。
- **连通检查**：发送一次最多 8 tokens 的最小聊天请求；可能产生少量费用。接口可达不代表完整 SongPlan 通过；只有真实创作请求成功并校验完整 JSON 才将工作台标记 verified。检查不返回上游错误原文、请求头或 Key；拒绝重定向，避免凭证被转发。
- **引擎检查**：FluidSynth 版本与 SoundFont，FFmpeg、Python、DiffSinger 关键依赖、CUDA 可用性、OpenUtau 文件存在性、GPU 名称与显存。文件存在不等于真实演唱验收。
- **生成状态台**：本进程最近 100 个请求，包含 LLM、FluidSynth、DiffSinger、WAV 导入、PV；自动制作任务作为额外来源接入。显示运行、成功、失败、连接中断、HTTP 结果和耗时。不记录歌词请求体、密钥或上游原始错误。无伪造百分比；连接中断不代表外部进程已取消。
- **资源管理台**：扫描引擎、音源、声库、缓存、导出目录，显示文件数、大小、修改时间与缓存 WAV 试听。忽略 `.git`、`.venv`、符号链接；每组扫描上限 10000 文件、显示上限 100 文件。统计不包含虚拟环境占用。不会删除缓存、模型或工程。
- **声库注册**：表单维护 `external/voicebanks/voices.json`，包括 ID、版本、名称、variance/acoustic 实验目录名。注册只针对已授权且已安装的原生 DiffSinger checkpoints；ONNX 声库不能直接交给 Python infer.py。更新注册不下载文件、不代表权重已验收。
- **导航**：左侧总览与制作链路栏目，右侧显示当前内容；窄屏通过左上角菜单呼出抽屉，支持遮罩、关闭按钮、Esc 与选中栏目后收起；资源与任务单独查看，声库注册位于 WAV 栏目。
- **链路测试**：`/admin#test` 固定歌词「这是歌词」，固定 96 BPM 或随机 80–120 BPM、目标 20 秒。依次实际调用 `/api/compose`，用既有 `buildFreeScore` 生成本地音符，渲染 FluidSynth 伴奏与绮萱 CPU 人声，复用工作台 `renderAudio` / `wavBlob` 混音，再用既有 `drawPV` 和 `/api/export` 生成歌词 MP4。逐阶段显示状态、耗时和失败原因；生成后在测试页直接试听、播放和下载；混音/PV 栏目也可查看。MP4（H.264/AAC）保留用于下载；后台经同源、CSRF 保护的 `/api/admin/preview` 将其转为 VP9/Opus WebM 用于内置浏览器预览，避免只有声音的解码兼容问题。不会写入工作台 localStorage 或修改后台配置；切栏目继续，关闭/刷新页面会丢失浏览器测试状态。
- **维护测试入口**：`scripts/admin-pipeline.ts` 是浏览器诊断源，`node scripts/build-admin.mjs` 使用现有 Vite 工具链的 esbuild 生成已提交的 `server/public/admin-pipeline.js`；更改其导入的音乐/混音模块后应重新生成。真实诊断执行 `node scripts/verify-admin-pipeline.mjs`，需先启动本地 3001 后端；`ADMIN_VERIFY_OUTPUT` 指定输出目录，默认外部根目录的 `runtime/exports/admin-pipeline-日期`。可用 `--layout-only` 仅检查页面与失败夹具。脚本先验证导航、390px 抽屉布局（隐藏滚动条、保留滚动）与明确的失败夹具，再执行真实链路并保存 WAV/MP4/截图。

### 本机安全与生命周期

服务监听 `127.0.0.1`。管理 API 验证本机 Host、Origin、JSON Content-Type 与 CSRF 请求头；无 CORS 放行；不缓存管理响应。页面 CSP 仅允许本源脚本和资源。当前信任同一 Windows 账户及其本机程序，没有账号登录，不适合通过代理暴露公网。

密钥绑定当前 Windows 账户，换账户或机器需重新填写；加密不防拥有该账户执行权限的本机程序。配置不进入 Git，资源清单不扫描 `runtime/config`。不要备份明文 Key 到工程 JSON。若环境不支持 Windows DPAPI，保存密钥明确失败，不回退明文。

任务、连通结果、操作记录保存在进程内，重启清空；配置与资产保存在磁盘。重启后连通检查需重新执行。若改 `.env`，已保存后台配置仍优先；可在面板清除或调整。

<a id="resources"></a>

## 外部路径与引擎准备

```powershell
# 在自己的仓库根目录执行
npm ci
npm run build
npm start
# Windows 启动入口
.\start.bat
```

`SONGYU_EXTERNAL_ROOT` 可在启动前指定外部根目录，默认 `D:\ai\hacson\external`；根目录属于启动配置，面板不在线移动第三方文件。其他路径字段允许在线配置。`OPENUTAU_PATH` 仅用于诊断，不启动 GUI。

原机器安装版本与文件大小记录见[绮萱安装历史](iteration-log.md#qixuan)，不把那些目录当作当前电脑已存在。SONGYU_EXTERNAL_ROOT 的默认值来自 server/services/instruments.mjs；部分实测脚本仍有原机器绝对路径，迁移工作见 [Blacktea B2](../CC-Tasks/4-blacktea-integration.md)。

绮萱桥接的既有兼容基线：OpenUtau 0.1.576、绮萱 v2.7.0、2025.02 声码器、net10.0 桥接项目。资源目录分别位于外部根目录下的 OpenUtau、voicebanks/Qixuan-v2.7.0、vocoders/2025.02 和 runtime；模型、配置、音频缓存不进 Git。OpenUtau Additional Singer Path 需能发现声库；声码器依赖位置按授权资源设置，不自动移动或覆盖配置。

桥接编译使用本机 .NET SDK，在仓库根目录执行；以下外部根目录由你显式设置，命令不下载资源、不启动 GUI：

```powershell
$engineRoot = $env:SONGYU_EXTERNAL_ROOT
if (-not $engineRoot) { throw 'Set SONGYU_EXTERNAL_ROOT to your installed resource directory first' }
dotnet build scripts/openutau-bridge/SongyuBridge.csproj -p:OpenUtauDirectory="$engineRoot/OpenUtau" -p:BaseIntermediateOutputPath="$engineRoot/runtime/bridge-obj/" -o "$engineRoot/OpenUtau"
```

此命令是按现有项目属性整理的示例，本次文档整理没有执行。更换 OpenUtau 版本后须重新编译并验证兼容性。

<a id="bridge"></a>

## OpenUtau 无窗口桥接

核对官方入口 `OpenUtau/Program.cs` 后，未发现适用于本任务的稳定批处理渲染 CLI；上游入口启动 Avalonia GUI，并限制重复进程。USTX 手动交换可用，但不能满足网页点击后自动演唱。

`scripts/openutau-bridge/` 是小型 .NET 控制台适配器，直接引用本机未修改的官方 `OpenUtau.Core.dll`，初始化调度、歌手发现、项目加载、发音与真实渲染，输出 44.1 kHz 单声道 PCM WAV。没有修改 OpenUtau 上游源码，没有重写声学模型。版本更换时需重新编译并重新验收。

文件交换维护成本较低但依赖用户手动导出；本桥接器能自动执行，代价是固定版本兼容和每次单句启动 / 加载模型的开销。这里没有引入新的核心架构或替代既有歌声管理系统。

<a id="cache"></a>

## 单句生成、缓存与播放

打开「虚拟歌姬」，先在原有歌词编辑器编辑，再点对应句子的「绮萱演唱」。可选 CPU / DirectML；默认 CPU，避免与其他 GPU 作业争抢资源。模型加载期间显示状态。生成成功自动启用外部人声模式；全曲导出前需补齐所有未锁定歌词的演唱。

「重新演唱」增加 take，实际重新调用推理；历史保留最多三版，可单独试听。锁定句或锁定人声音轨不覆盖。生成期间编辑歌词、改变设备或锁定时，结果会留在磁盘，但不覆盖已变化的工程。

缓存包含歌词、音符与时值、绝对起止点、BPM、声库 ID / 版本、官方 Core 与桥接器指纹、CPU / DirectML、steps=20、depth=0.6、take。仅改第二句不影响第一句。引擎指纹不符会要求重唱；本机固定声库版本，不支持在同一版本目录偷偷替换权重。

渲染 WAV 保留前后各 0.2 秒余量，startSeconds 对应其真实时间轴起点，单句试听也包含辅音预发声。浏览器统一重采样到 24000 Hz；试听 / WAV / PV 共用 `renderAudio`。MP4 与预览展示「AI 合成内容 / 歌声合成：绮萱 / 合成技术：DiffSinger」，背景为 SONGYU 自有程序化画面。

<a id="licensing"></a>

## 资源来源与许可

宿主代码许可证、声库、声码器与角色图像条款分别适用。不能由 OpenUtau/DiffSinger 代码开源推断所有权重或商用用途都获许可。项目只提交桥接/调用源码，不随 Git 分发第三方权重、安装包、密钥或真实音频缓存。

公开作品保留适用的 AI 合成、绮萱及 DiffSinger 标识；新资源或新用途使用前核对相应条款。已有来源记录：

- [绮萱 v2.7.0 发行](https://github.com/yqzhishen/qixuan-diffsinger/releases/tag/v2.7.0)与[使用条款](https://github.com/yqzhishen/qixuan-diffsinger/blob/main/terms_of_use/Terms_of_Use.zh-CN.md)
- [OpenUtau](https://github.com/openutau/OpenUtau)
- [OpenVPI DiffSinger](https://github.com/openvpi/DiffSinger)与[声码器入口](https://openvpi.github.io/vocoders/)

这些是资料入口，不表示本轮已联网重新确认授权或下载资源。

绮萱配套资源原记录补充：[绮萱发行页](https://github.com/yqzhishen/qixuan-diffsinger/releases/tag/v2.7.0)、[使用条款](https://github.com/yqzhishen/qixuan-diffsinger/blob/main/terms_of_use/Terms_of_Use.zh-CN.md)、[OpenUtau](https://github.com/openutau/OpenUtau)、[声码器发行页](https://github.com/openvpi/vocoders/releases/tag/pc-nsf-hifigan-44.1k-hop512-128bin-2025.02)。引擎许可证与声库 / 声码器许可分别适用；声码器包附带 CC BY-NC-SA 4.0 声明，商业用途需另核对具体适用条款。

这些链接保留既有来源，本次未重新联网核验许可。宿主、声库、声码器、角色图像的条款分别适用；公开作品保留适用的 AI/绮萱/DiffSinger 标识。

<a id="diagnostics"></a>

## 诊断、验收与后续需求

通过本机管理诊断 API 核对 qixuan、FluidSynth、FFmpeg、GPU 等状态；不通过电脑操控 OpenUtau GUI。文件存在、接口可达、PCM 非静音都不能代替正式页面创作与人工听评。

配置及浏览器测试的历史覆盖见[后台记录](iteration-log.md#admin-engine)，绮萱 CPU/DirectML 与资源安装证据见[绮萱记录](iteration-log.md#qixuan)。当前联调准备见 [工单 4](../CC-Tasks/4-blacktea-integration.md)，共同验收见 [工单 6](../CC-Tasks/6-joint-acceptance.md)，未排期后台方向见 [工单 12](../CC-Tasks/12-admin-backlog.md)。

后台媒体回归：`node scripts/verify-admin-media.mjs` 重放既有真实 WAV/MP4，只验证页面呈现与真实 FFmpeg 预览转码，不代表新模型生成；`ADMIN_MEDIA_INPUT` 指定含 pipeline.wav / pipeline.mp4 的目录。检查测试页播放器与下载、已解码视频帧及画面像素、窄屏滚动条隐藏。
