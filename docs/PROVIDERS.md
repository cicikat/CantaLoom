# 歌声、LLM 与素材边界

2026-11-06 文档整理：本文件说明项目已有路线与许可核对入口，不是当前电脑资源探测结果，也不重新核验上游许可。原2026-11-04的候选评估已被后续真实接入记录更新；安装/推理证据见 [QIXUAN](QIXUAN.md) 与 [v0.3.2 报告](iteration-log.md#v032)。

## 已采用的歌声路线

- **OpenUtau / 绮萱**：`scripts/openutau-bridge/` 直接调用固定版本官方程序集，使用中文发音器、DiffSinger 渲染器、绮萱 ONNX 与声码器产出单句 WAV。已有真实中文推理历史记录；不是 TTS 或预录音。版本、原机器路径、来源和许可记录在 QIXUAN。
- **原生 Python DiffSinger**：保留文件交换/授权声库注册接口。ONNX 绮萱包不交给 Python infer.py；此保留路线不代表任意 checkpoint 已经过本项目验收。
- **外部 WAV 导入**：可回导合法来源歌声，并进入同一时间轴混音。
- **元音演示**：`src/audio.ts` 的 demoVocal 是浏览器合成元音，能表现旋律，不能读出中文歌词。Mock 测试音也不是真实演唱。

缺失或过期的真实歌声资产应明确报错或提示重新生成，不自动用元音替换并冒充成功。元音模式只能由明确的模式选择启用。歌声缓存、单句变更保护与统一试听/导出路径继续沿用已有实现。

## 授权与分发

宿主代码许可证、声库、声码器与角色图像条款分别适用。不能由 OpenUtau/DiffSinger 代码开源推断所有权重或商用用途都获许可。项目只提交桥接/调用源码，不随 Git 分发第三方权重、安装包、密钥或真实音频缓存。

公开作品保留适用的 AI 合成、绮萱及 DiffSinger 标识；新资源或新用途使用前核对相应条款。已有来源记录：

- [绮萱 v2.7.0 发行](https://github.com/yqzhishen/qixuan-diffsinger/releases/tag/v2.7.0)与[使用条款](https://github.com/yqzhishen/qixuan-diffsinger/blob/main/terms_of_use/Terms_of_Use.zh-CN.md)
- [OpenUtau](https://github.com/openutau/OpenUtau)
- [OpenVPI DiffSinger](https://github.com/openvpi/DiffSinger)与[声码器入口](https://openvpi.github.io/vocoders/)

这些是资料入口，不表示本轮已联网重新确认授权或下载资源。

## LLM、作曲与画面

- 旧 plan 生成标题、氛围、四句歌词与 SongPlan，本地规则生成具体音符；允许明确标注的本地模式。
- 新 compose 以一次事务生成宏观规划与 MelodyDraft；production 再协调器乐和歌声。真实 LLM 历史调用已有记录，不再写作“尚无真实密钥验证”；是否配置、调用成功、作品主观质量仍须区分。
- 音符数据通过共享 Schema 与音乐约束校验；LLM 不直接输出最终音频。手写歌词、锁定与局部编辑保护不能被生成覆盖。
- 画面为原创程序化 Canvas；VisualPlanner 的关键词与配色是本地规则，无 AI 生图调用。原始 HTML 只作视觉参考。
- 正式新自由入口、Mock 与人工听感的缺口统一见[Toge 工单](../CC-Tasks/5-toge-free-creation.md)，不在本文件复制待办。
