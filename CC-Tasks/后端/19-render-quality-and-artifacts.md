# 工单 19：渲染音质升级与创作产物导出

Owner：Blacktea / Backend & Music Engine。状态：后端实施与真实链路验证完成；DAW 人工抽验与共同听感待验收。
来源：2026-11-07 专业音乐人视角后端评审（锐评 P0 项）：FluidSynth 固定 24kHz/16bit 干声直出；服务端已生成 MIDI/USTX/分轨 WAV 但不提供下载；导出无响度归一。
范围：纯后端（server/、shared/ 契约与 CHANGELOG）。**不引入 MixGraph/效果链/分轨混音**——那是[工单 15 P3](15-p0.md) 范围，本单只打包与导出既有渲染产物。不改浏览器混音与任何 Toge 文件。
依赖：无跨层阻塞；新增只读端点按 shared/contracts/CHANGELOG.md 记录后实施。

## 应做清单

- [x] FluidSynth 渲染升级 48kHz：`server/services/instruments.mjs` 的 `rate:24000`/`-r 24000` 改为 48000，缓存 key 已含 rate，同时 bump revision 使旧 24k 缓存自然失效；真实引擎验证浏览器试听、WAV/PV 导出链路不回退。
- [x] 位深评估：`-O s24` 与浏览器 decodeAudioData、`src/audio.ts` 混音入口、导出 mix.wav 编码的兼容性实测；有任何一环不确定则保持 s16，只在工单记录结论，不为规格表冒险。
- [x] 创作产物下载端点（只读）：在 `server/routes/instruments.mjs` 增加经 hash 校验的产物下载——工程 MIDI（缓存 `*.mid`）、演唱 USTX（`sourceProject`）、按 key 的分轨 WAV；路径校验沿用 `audioFileSchema` 思路扩展后缀白名单，禁止目录穿越；契约与 `.d.mts`、CHANGELOG 同步。
- [x] 分轨打包：逐轨下载为必做（零依赖）；zip 打包评估新增依赖的体积与维护成本后决定是否提供，不为一键下载引入未审计依赖。
- [x] 导出响度归一：`server/services/export.mjs` 音频滤镜加入 loudnorm（目标 I/TP/LRA 实测后写入工单，初选 `-14 LUFS / -1.5 dBTP`），导出结果元数据返回实测 integrated LUFS 与 true peak；AAC 码率随实测调整。
- [x] 响度测量报告：制作就绪（ready-for-mix）或导出时以 FFmpeg ebur128 测量人声与各器乐分轨 LUFS，随任务状态/导出元数据只读报告，不改变任何混音算法。
- [x] 测试：渲染输出 sample rate/位深断言；产物字节与缓存一致性；loudnorm 前后实测响度记录进迭代日志；真实 FluidSynth 回归（无引擎自动跳过）。

## 验收

48kHz 真实渲染通过且试听/导出链路回归无回退；下载的 MIDI 在 DAW 中打开，音符/速度/拍号与工程抽验一致；USTX 与缓存源工程字节一致；导出 MP4 报告实测 LUFS/TP，达到选定目标或明确报告数值与差距。完成记录写入 [迭代日志](../../docs/iteration-log.md)，注明本工单。

## 交接入口

无新增跨端交接；若位深或响度结论需要前端混音配合，再按规则登记 [CROSS-END-HANDOFF](../../CROSS-END-HANDOFF.md) 并在本节留 ID。


## 2026-11-07 实施结果与验收边界

- FluidSynth 48kHz / s16、revision=2；缓存命中与 WAV fmt chunk/非静音均已实测。s24 未完成跨浏览器兼容验证，因此按本单约定保留 s16。现有 `src/audio.ts` 的 OfflineAudioContext 仍是 24kHz，未跨区修改。
- 逐轨 MIDI/USTX/WAV 按缓存 key 原字节下载，缺失 404、非法文件名 400；MIDI 保持既有 tempo / 4/4 / 音符编码，单元测试抽验，不宣称已经在人工 DAW 中打开。zip 需要额外打包/依赖维护，当前逐轨下载足够，决定不新增依赖。
- MP4 loudnorm 选择 -14 LUFS / -1.5 dBTP（峰值上限）/ LRA 11，AAC 192k/48kHz；最终 AAC 解码后 ebur128 实测与输入/目标一起通过响应头返回。分轨用只读 WAV 响度端点查询，不改制作/浏览器混音算法。
- 合成测试：-41.7 → -14.0 LUFS，编码后 TP -10.2 dBTP。真实 FluidSynth 浏览器全曲混音：-26.4 → -13.6 LUFS，TP -13.0 → -1.3 dBTP；距响度目标 +0.4 LU、峰值上限 +0.2 dB，报告保留实测差距，不宣称严格达标。浏览器 PCM RMS 0.031404，WAV 及 MP4 均实际生成。
- 复现：配置 FFmpeg 后执行 `node --test tests/render-quality.test.mjs` 和 `node scripts/verify-render-quality.mjs`；后者输出在 `temp/task19/`，不提交媒体。具体全量验证见[迭代日志](../../docs/iteration-log.md#render-quality-19)。
- 交接 ID：[19-artifact-report](../../CROSS-END-HANDOFF.md#19-artifact-report)。实现清单完成不代表页面已有下载/响度展示，人工 DAW 与听感未验，故本单暂不归档。
