# 最小实现方案与检查结果

2026-11-04，工作目录 `D:\ai\hacson\music_agent`。

## 编码前检查

- 只有 `03_patchlab_playful.html`，即 V3 创意积木原型；没有 V1/V2、package.json 或其他现有应用源码。
- 不在 Git 仓库内，没有发现当前目录及已查父级的 AGENTS.md。
- 环境有 Node 22.23.1、npm 11.12.1、FFmpeg（带 libx264 / libass）；Python 命令仅 WindowsApps 入口，无需引入 Python。
- 原型通过 Math.random 生成节奏格、简易振荡器和独立字幕定时器表现交互；这些实现不作为完整音乐生成或同步导出的基础。

## 统一视觉

保留 V3 的新手积木方向，以奶油白、墨色线条、薰衣草/鼠尾草/淡黄/海蓝建立统一语言。首页是灵感板，编曲页是清晰的分轨表，歌姬页强调逐句编辑，PV 页把作品画面置于中心。所有页面共享工程与播放器。

## 最小技术方案

- React + TypeScript + Vite，原生 CSS，Lucide 图标。
- 所有音符先结构化，再用 OfflineAudioContext 混音。AudioBufferSourceNode 播放，AudioContext.currentTime 驱动进度和字幕。
- 固定四段，按 BPM 选择小节数，保持约 24 秒。鼓点由真实敲击量化，其他轨道用可替换的本地规则作曲。
- 一句歌词对应稳定 ID、开始/结束 beat、逐音节 Note、版本及来源；元音演示明确不读歌词。
- localStorage 自动保存，JSON 导出/导入恢复全部创作数据。
- 一个 Node 服务：可选 LLM 请求与 FFmpeg 导出，不引入 Agent 框架或 Python 服务。
- 背景来自原创 Canvas，FFmpeg 用同一组画面、音轨和歌词时间渲染 MP4。

## 有意取舍

- 无登录、云盘、支付、图片上传、DAW、多作品数据库、完整 MIDI 编辑器或三分钟歌曲。
- 音色为本地合成而非录音音源；吉他仅代表对应编曲层的合成音色。
- 真正中文歌唱取决于已授权模型/音库，目前明确使用元音演示。
- LLM 适配器已写好，但没有密钥则不发请求、不宣称模型已验证。
- 导出在本机 Node 中完成，浏览器静态部署不能提供 MP4 编码。
