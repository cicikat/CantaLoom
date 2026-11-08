# 工单 33：浏览器 Synth 伴奏增益核心一致性

Owner：Blacktea / Music & Audio Core；`src/audio.ts` / `src/audio-mix.ts` 为共同边界，须 Toge 限定范围 review。
状态：音频核心与自动回归已完成（2026-11-08），控件解禁与人工听评交 Toge。原始基线：2026-11-08 远端 `main` 静态核对；本地未推送分支实施前复核。
来源：[5-C-synth-mix](../../CROSS-END-HANDOFF.md#5-c-synth-mix) 和 [工单 27](../27-frontend-interface-sync.md)。

## 问题定义

`src/audio.ts` 的 FluidSynth WAV 分支在处理混音时应用 `p.mixSettings.bandGain`，但浏览器 synth 在 `schedule()` 里把器乐音符直接连到 `master`，绕开这个增益。前端已经有伴奏音量控件，目前只在 FluidSynth 模式启用。问题属于共享 Web Audio 核心，不是漏 HTTP 端点，也不是要新增 React 滑杆。

## 范围

只修公共 Web Audio 的器乐总线 / gain 路由、必要音频适配和测试；不改 UI、Mock 定义、API URL、SongProject 增益字段或服务端 FluidSynth。先按[团队边界](../../docs/TEAM_WORKFLOW.md)确认本次对 `src/audio.ts` 的修改范围，再动手。

## 唯一应做清单

- [x] 在 `renderAudio()` 为 synth 器乐建立可控的 instrument/band bus，处理模式下应用既有 `mixSettings.bandGain ?? 1`；不要为了此事引入 MixGraph、压缩器插件或新效果链。
- [x] 保持 `mixSettings.enabled` / 自由模式默认值、旧工程兼容、stem 过滤、muted、逐轨播放、vocal-dry 与 vocal-processed 语义；**人声不能被 bandGain 一并压低**，也不能把主音量滑杆混作伴奏滑杆。
- [x] 确认 `bandGain=0` 时 synth 的纯器乐输出可实测静音，`bandGain=1` 回到基线，增大值产生明确、受峰值保护的 PCM 变化；不以网页控件视觉状态代替音频断言。
- [x] `renderAudio` 是试听、WAV/PV 输入的共用混音入口：比较混音 WAV 与导出前 PCM；不得只修播放而让导出忽略增益。FluidSynth 分支须回归，避免双重应用 bandGain。
- [x] 若研究 Groove 浏览器试听同步，记录对 [工单 31](31-production-groove-integration.md) 的后续依赖，不在本小补丁重写 swing 算法。
- [x] 添加针对 synth / fluidsynth（有资源时）、vocal、bandGain=0/1/2、mixSettings.enabled、mute/solo、stem 和 WAV/PV 的定向测试。资源依赖测试与纯 Web Audio 夹具测试分开报告。

## 验收

Synth 模式音量改变实际 PCM，0 能静音器乐但保留混合中的人声；WAV/PV 反映同一增益，旧工程和 FluidSynth 不回退。浏览器音频测试可以使用合成夹具，但必须说明这不是 FluidSynth/绮萱真人听评。

## 交接入口

实现后在[迭代日志](../../docs/iteration-log.md)写 PCM/WAV 证据；更新原[工单 5 C](../5-toge-free-creation.md)与 [5-C-synth-mix](../../CROSS-END-HANDOFF.md#5-c-synth-mix)，由 Toge 再解除当前控件禁用。本单不代改 `MixControls.tsx`，最终真实页面仍归[工单 6](../6-joint-acceptance.md)。


## 2026-11-08 结果与交接

- 本会话针对共享音频核心具体范围取得用户「确认上述限定范围」后实施；仅 src/audio.ts 增加 Synth band bus 并改变本地器乐目的节点，audio-mix、服务端、组件/Hook/Mock 定义不改。FluidSynth WAV 路径不经过该 bus。
- 先补两项失败测试，分别复现零增益仍有器乐 PCM 和导出非静音；修复后 Chromium 音频测试覆盖 0/1/2、默认值、enabled、独立人声/混合、dry/processed、mute/单轨、强信号峰值、工程不变，以及实际 WAV/PV 导出入口输入。gain=1 与旧 Synth 基线字节级 PCM 一致，关闭处理仍忽略 bandGain。
- 定向测试在 `tests/browser/synth-band-gain.spec.js`，置于 Chromium 已安装的 Playwright 层，未更改 CI 安装顺序。真实资源用 acceptance 标签隔离；Groove Synth 同步继续依赖工单 31，本单未改演奏算法。
- 真实 FluidSynth 0/1/2 PCM、实际 Synth PV 输入 WAV 与真实 FFmpeg MP4 已回归；资源与夹具分别记录。结果见[迭代日志](../../docs/iteration-log.md#synth-band-gain-33)，产物 `temp/task33/`。未测试真实歌声/LLM、手机/Safari或人工听评。
- 交接 ID：[5-C-synth-mix](../../CROSS-END-HANDOFF.md#5-c-synth-mix)：核心已回执，Toge 接下来解除 MixControls 的 Synth 伴奏音量禁用并做页面回归，完成后删除交接。元音演示的人声增益/混响不在本次范围。
- 本地分支 feature/backend-synth-band-gain，未推送；保留原有两个启动脚本删除与其他工单。
