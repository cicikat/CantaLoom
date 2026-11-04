# 真实歌声与 AI 接入评估

核对日期：2026-11-04。只评估官方项目，不下载音库。

## 优先候选

**OpenVPI DiffSinger** 是真实歌声合成系统，适合将歌词、音高、时值交给独立推理服务生成 WAV。官方仓库当前代码为 Apache-2.0；代码许可证不能证明任意音库/模型权重都能使用。落地前需要逐项确认声库、声码器、权重及声音来源的授权和用途。当前项目没有对应已授权声库和推理环境，因此未接入，不能称为真实歌唱已完成。

- 官方仓库：https://github.com/openvpi/DiffSinger
- 推理/部署入口：https://github.com/openvpi/DiffSinger/tree/main/deployment
- 社区声码器与各自条款：https://openvpi.github.io/vocoders/

**OpenUtau** 是开放的歌声合成平台，代码 MIT，可用于验证有授权音库的离线歌唱流程。它不是本项目中已接通的 HTTP 服务，仍需选择合法声库、配置发音器/引擎并实现导出桥接。不能把开源宿主的代码许可证等同于商业歌姬声库授权。

- 官方仓库：https://github.com/openutau/OpenUtau

## 当前 VocalProvider

`src/audio.ts` 的 `demoVocal` 使用 PeriodicWave 谐波、简单共振峰权重、包络和颤音，按 Note 事件合成元音。没有使用 TTS，没有音库下载。可以听见旋律，但不能听见歌词辅音/中文咬字。UI、预览和 MP4 都注明演示状态。

未来真实 Provider 应扩展为异步 `synthesize({preset,lyrics,notes,bpm}) -> {audioUrl|PCM,alignment,license}`，服务端缓存每句资产并按依赖版本失效。外部 WAV 需要插入统一混音路径，不能只替换界面预设名称。保留当前演示 provider 作为故障降级，并明确展示当前实际启用的 provider。

## LLM 与图像

- LLM：当前只规划歌名、氛围、四句歌词，服务端请求 OpenAI-compatible chat/completions，严格校验 JSON，密钥不进入浏览器。尚无真实密钥验证记录。
- Composer：本地确定性种子规则作曲，不包装成音乐大模型。随机数只用于实际音符变化，变化会进入 PCM 音频。
- ImageProvider：原创程序化海岛画面，不使用任何 AI 图像服务或他人歌曲素材。
- VisualPlanner：从歌词提取有限关键词、选择分段配色，属于本地规则，并非 LLM 意象理解。
