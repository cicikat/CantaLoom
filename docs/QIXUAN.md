# SONGYU v0.2 · 绮萱真实演唱

本文件保留 v0.2 的引擎接入与原机器验收记录，不表示当前电脑已安装相同资源。v0.3.2 的调教、缓存修订与分轨补充见[最新交接](V032_FRONTEND_HANDOFF.md)及[验收](iteration-log.md#v032)；当前待办见[Toge 工单](../CC-Tasks/5-toge-free-creation.md)。下方绝对路径/构建命令是原机器示例，执行前按自己的资源根目录调整。

## 当前链路

用户歌词与 SongPlan → 本地 Note → USTX → **官方 OpenUtau 0.1.576 程序集中的中文发音器与 DiffSinger 渲染器** → 绮萱 v2.7.0 ONNX / 2025.02 社区声码器 → WAV → 浏览器统一混音 → WAV / MP4。

以上是旧模式入口；新自由作曲由 LLM 生成并校验 MelodyDraft 音符，自动制作再串联同一演唱引擎。主观听感和正式新网页闭环仍需双方验收，不因已有真实引擎记录而自动完成。

不转换、修改、训练模型。原有 Python DiffSinger checkpoint 路线保留，绮萱使用单独的 `openutau-diffsinger` Provider。没有把 ONNX 包传给 Python infer.py。

已实际验证官方 USTX 加载、中文音素、CPU / DirectML 真实单句推理与网页逐句操作。不是预录声音、TTS 或元音演示。

## 为什么有桥接器

核对官方入口 `OpenUtau/Program.cs` 后，未发现适用于本任务的稳定批处理渲染 CLI；上游入口启动 Avalonia GUI，并限制重复进程。USTX 手动交换可用，但不能满足网页点击后自动演唱。

`scripts/openutau-bridge/` 是小型 .NET 控制台适配器，直接引用本机未修改的官方 `OpenUtau.Core.dll`，初始化调度、歌手发现、项目加载、发音与真实渲染，输出 44.1 kHz 单声道 PCM WAV。没有修改 OpenUtau 上游源码，没有重写声学模型。版本更换时需重新编译并重新验收。

文件交换维护成本较低但依赖用户手动导出；本桥接器能自动执行，代价是固定版本兼容和每次单句启动 / 加载模型的开销。这里没有引入新的核心架构或替代既有歌声管理系统。

## 安装与编译

- OpenUtau Portable：`external/OpenUtau`，0.1.576；源码核对 tag 0.1.576，MIT，commit `bc194b6fe4897427a73066390b286e11205fd10f`。
- 绮萱：`external/voicebanks/Qixuan-v2.7.0/Qixuan_v2.7.0_DiffSinger_OpenUtau`，官方发行 ZIP 420707627 字节，解压 540817652 字节。条款随包保存，并记录官方来源。
- 声码器：`external/vocoders/2025.02`，`pc_nsf_hifigan_44.1k_hop512_128bin_2025.02`，ONNX 56616643 字节。OpenUtau 的 Dependencies 下使用目录联接定位原文件，无权重副本。
- .NET SDK：`external/runtime/dotnet`，10.0.403。桥接输出 `external/OpenUtau/SongyuBridge.dll`；中间文件在 `external/runtime/bridge-obj`。
- OpenUtau Additional Singer Path 已设置为 `external/voicebanks/Qixuan-v2.7.0`，原 prefs.json 备份在同目录 `.songyu-v02-backup`。

```powershell
cd D:\ai\hacson\music_agent
D:\ai\hacson\external\runtime\dotnet\dotnet.exe build scripts/openutau-bridge/SongyuBridge.csproj `
  -p:OpenUtauDirectory=D:/ai/hacson/external/OpenUtau `
  -p:BaseIntermediateOutputPath=D:/ai/hacson/external/runtime/bridge-obj/ `
  -o D:/ai/hacson/external/OpenUtau
```

官方来源：[绮萱发行页](https://github.com/yqzhishen/qixuan-diffsinger/releases/tag/v2.7.0)、[使用条款](https://github.com/yqzhishen/qixuan-diffsinger/blob/main/terms_of_use/Terms_of_Use.zh-CN.md)、[OpenUtau](https://github.com/openutau/OpenUtau)、[声码器发行页](https://github.com/openvpi/vocoders/releases/tag/pc-nsf-hifigan-44.1k-hop512-128bin-2025.02)。引擎许可证与声库 / 声码器许可分别适用；声码器包附带 CC BY-NC-SA 4.0 声明，商业用途需另核对具体适用条款。

## 页面与缓存

打开「虚拟歌姬」，先在原有歌词编辑器编辑，再点对应句子的「绮萱演唱」。可选 CPU / DirectML；默认 CPU，避免与其他 GPU 作业争抢资源。模型加载期间显示状态。生成成功自动启用外部人声模式；全曲导出前需补齐所有未锁定歌词的演唱。

「重新演唱」增加 take，实际重新调用推理；历史保留最多三版，可单独试听。锁定句或锁定人声音轨不覆盖。生成期间编辑歌词、改变设备或锁定时，结果会留在磁盘，但不覆盖已变化的工程。

缓存包含歌词、音符与时值、绝对起止点、BPM、声库 ID / 版本、官方 Core 与桥接器指纹、CPU / DirectML、steps=20、depth=0.6、take。仅改第二句不影响第一句。引擎指纹不符会要求重唱；本机固定声库版本，不支持在同一版本目录偷偷替换权重。

原 USTX 导出空 pitch.data 配合 snap_first=true 会在真实编辑器中越界，现已补齐控制点；绮萱工程选择 DIFFS ZH 与 DIFFSINGER，通用手动交换仍保留。

渲染 WAV 保留前后各 0.2 秒余量，startSeconds 对应其真实时间轴起点，单句试听也包含辅音预发声。浏览器统一重采样到 24000 Hz；试听 / WAV / PV 共用 `renderAudio`。MP4 与预览展示「AI 合成内容 / 歌声合成：绮萱 / 合成技术：DiffSinger」，背景为 SONGYU 自有程序化画面。

## 真实验证与边界

首句“海风吹过我的窗”：CPU 21.686 秒、DirectML 16.861 秒；5.4 秒、44100 Hz、非静音。主机进程峰值工作集分别约 1.178 / 1.184 GB。DirectML 明确选中 RTX 4060 Laptop；GPU 同时运行其他程序，全卡显存采样不能当作本模型专属峰值。

两组真实 LLM 请求使用后台既有密钥，均通过方案校验，耗时 13.048 / 11.844 秒；2327 / 2266 tokens，锁定鼓轨未变。没有在日志、截图或报告中输出 Key。

真实网页用例 `tests/browser/qixuan.spec.ts` 验证点击生成、试听、第二句修改后新音频、第一句缓存不变、历史版本、全曲 25 秒混音与真实 MP4 下载。其前提是已安装模型且存在本机真实 LLM 验收工程；缺少原生引擎时明确跳过，不使用假音频。

验收文件在 `external/runtime/exports/qixuan-acceptance`，含 USTX、单句、分轨、最终 WAV / MP4、安装 SHA256 清单、LLM 与推理记录。听感、中文多音字、长句节奏、移动设备仍需用户试听与进一步覆盖；不会把非静音数值当作主观音质验收。

模型和缓存不提交 Git；源代码、测试和安装说明可以提交。
