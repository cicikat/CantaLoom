# 工单 19：渲染音质升级与创作产物导出

Owner：Blacktea / Backend & Music Engine。状态：待实施。
来源：2026-11-07 专业音乐人视角后端评审（锐评 P0 项）：FluidSynth 固定 24kHz/16bit 干声直出；服务端已生成 MIDI/USTX/分轨 WAV 但不提供下载；导出无响度归一。
范围：纯后端（server/、shared/ 契约与 CHANGELOG）。**不引入 MixGraph/效果链/分轨混音**——那是[工单 15 P3](15-p0.md) 范围，本单只打包与导出既有渲染产物。不改浏览器混音与任何 Toge 文件。
依赖：无跨层阻塞；新增只读端点按 shared/contracts/CHANGELOG.md 记录后实施。

## 应做清单

- [ ] FluidSynth 渲染升级 48kHz：`server/services/instruments.mjs` 的 `rate:24000`/`-r 24000` 改为 48000，缓存 key 已含 rate，同时 bump revision 使旧 24k 缓存自然失效；真实引擎验证浏览器试听、WAV/PV 导出链路不回退。
- [ ] 位深评估：`-O s24` 与浏览器 decodeAudioData、`src/audio.ts` 混音入口、导出 mix.wav 编码的兼容性实测；有任何一环不确定则保持 s16，只在工单记录结论，不为规格表冒险。
- [ ] 创作产物下载端点（只读）：在 `server/routes/instruments.mjs` 增加经 hash 校验的产物下载——工程 MIDI（缓存 `*.mid`）、演唱 USTX（`sourceProject`）、按 key 的分轨 WAV；路径校验沿用 `audioFileSchema` 思路扩展后缀白名单，禁止目录穿越；契约与 `.d.mts`、CHANGELOG 同步。
- [ ] 分轨打包：逐轨下载为必做（零依赖）；zip 打包评估新增依赖的体积与维护成本后决定是否提供，不为一键下载引入未审计依赖。
- [ ] 导出响度归一：`server/services/export.mjs` 音频滤镜加入 loudnorm（目标 I/TP/LRA 实测后写入工单，初选 `-14 LUFS / -1.5 dBTP`），导出结果元数据返回实测 integrated LUFS 与 true peak；AAC 码率随实测调整。
- [ ] 响度测量报告：制作就绪（ready-for-mix）或导出时以 FFmpeg ebur128 测量人声与各器乐分轨 LUFS，随任务状态/导出元数据只读报告，不改变任何混音算法。
- [ ] 测试：渲染输出 sample rate/位深断言；产物字节与缓存一致性；loudnorm 前后实测响度记录进迭代日志；真实 FluidSynth 回归（无引擎自动跳过）。

## 验收

48kHz 真实渲染通过且试听/导出链路回归无回退；下载的 MIDI 在 DAW 中打开，音符/速度/拍号与工程抽验一致；USTX 与缓存源工程字节一致；导出 MP4 报告实测 LUFS/TP，达到选定目标或明确报告数值与差距。完成记录写入 [迭代日志](../../docs/iteration-log.md)，注明本工单。

## 交接入口

无新增跨端交接；若位深或响度结论需要前端混音配合，再按规则登记 [CROSS-END-HANDOFF](../../CROSS-END-HANDOFF.md) 并在本节留 ID。
