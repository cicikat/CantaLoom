# 工单 32：首音素显式零偏移覆盖优先级修复

Owner：Blacktea / Backend & Music Engine。
状态：后端修复与自动验收已完成（2026-11-08）；Toge 提示文案清理与人工听评另行交接。原始基线：2026-11-08 远端 `main` 静态核对；本地未推送分支实施前复核。
来源：[27-phoneme-zero](../../CROSS-END-HANDOFF.md#27-phoneme-zero)；关联[工单 15 P1](../后端/15-p0.md)和[工单 27](../27-frontend-interface-sync.md)。

## 问题定义

`shared/performance.mjs` 的 `notePerformance()` 以 truthy 的 `offsetMs` 构造 `offset`，之后过滤无 offset/phoneme 的条目。设置首音素 `offsetMs:0` 时该条目消失，若句级 `consonantMs != 0`，代码认为首音素没有人工覆盖并重新插入句级偏移。参数能提交，实际含义却被覆盖。

复现（现有交接已记录，实施需在当前分支实际运行）：

```js
notePerformance(
  [{beat:0,duration:1,midi:60,velocity:.5,syllable:'甲'}],
  0,120,
  {preset:'natural',mode:'manual',consonantMs:12,overrides:[
    {index:0,origin:'manual',phonemes:[{index:0,offsetMs:0}]}
  ]}
).phoneme_overrides
```

期望：首音素最终偏移为 **0**，不能回落到句级 `+12ms`。允许 USTX 表示为显式 `offset:0`，或在确认引擎语义一致时省略该条；关键是不能重新注入非零 consonantMs。

## 唯一应做清单

- [x] 在 `tests/p1-phoneme.test.ts` 先补失败回归：显式 offset=0 + 非零 consonantMs；同时覆盖 offset=-/+, 零位置发音替换、非零位置 offset=0、未传 offset、旧工程省略覆盖，以及同一音素索引冲突的 Schema 校验。
- [x] 通过“字段是否存在”而不是 truthy 值判断用户意图。**首位是否显式覆盖**和**最终 USTX 是否必须输出零值**分别处理，不粗暴把全部零偏移写进输出引发旧回归。
- [x] 保持此前 `consonantMs` 无显式首位覆盖时的 legacy 行为、BPM→tick 换算、发音替换、其他音符和表现曲线行为不变。不得放宽音素数量、offset 范围或锁定数据保护。
- [x] 以 `qixuanProject` 断言 USTX 产物实际语义：首音素为零、没有额外默认偏移；确认下游桥接器未再次使用 falsy 判断丢失显式零。
- [x] 回归 `tests/p1-phoneme.test.ts`、相关 qixuan / singingDependency 测试；有绮萱声库的机器做真实 USTX 与 WAV 对照，记录未运行项，不把非静音当成音素时序验收。

## 验收

同样输入下 explicit zero 不再继承句级 consonantMs；未显式覆盖仍继承；其他位置/发音替换/旧工程全部保持兼容。受影响的本句歌声依赖按既有策略失效、其他句及器乐不变。无需新增 HTTP 端点、工程 Schema 或前端控件。

## 交接入口

修复证据回写 [工单 15 P1](../后端/15-p0.md)、[工单 27](../27-frontend-interface-sync.md)及[迭代日志](../../docs/iteration-log.md)；通知 Toge 去掉现有“0 偏移可能被继承”的限制说明；先留回执，再关闭 [27-phoneme-zero](../../CROSS-END-HANDOFF.md#27-phoneme-zero)。


## 2026-11-08 结果与交接

- 当前分支先补失败回归，得到 9 通过、2 失败（首位实际继承默认偏移）；修复后定向 P1/P0/Qixuan 20/20 通过，全量 123 项中 115 通过、8 项外部验收跳过。构建通过，日志见 `temp/task32-before.log`、`task32-targeted.log`、`task32-unit.log`、`task32-build.log`。
- 仅修正显式首位零值的优先级与必要的零值序列化，不改 Schema、组件或 Hook。保留其他位置与舍入为零的旧省略、发音替换、句级 legacy 换算。resolvePerformance 原有 renderRevision 声明补齐；该零值情况为 4，服务端缓存 revision=6，防止继续命中旧错误 WAV，其他调用保持原版本。
- 无窗口 Bridge 源码 `scripts/openutau-bridge/Program.cs` 使用 `Ustx.Load` 直接加载产物、交给 OpenUtau 处理，没有再以 falsy 过滤音素 offset。真实 CPU 绮萱生成 legacy / zero / reference 三组 USTX/WAV；首组零覆盖实际 USTX 为 offset:0，其余音符仍 +12 tick，重复缓存逐字节一致。记录 `temp/task32-real.log`（首次均非缓存）、`task32-real-repeat.log`（缓存命中）、`temp/task32/`。此证据不是音素起点测量或人工听评。
- 交接 ID：[27-phoneme-zero](../../CROSS-END-HANDOFF.md#27-phoneme-zero)：核心已修复；保留此条仅等 Toge 移除前端旧限制说明后清除。当前未代改 UI，也未向外发送消息。
- 本地分支 feature/backend-phoneme-explicit-zero，未推送。结果统一见[迭代日志](../../docs/iteration-log.md#phoneme-explicit-zero-32)。

2026-11-08 前端汇总：本单剩余 Toge 接线/提示清理及页面验证统一在[工单 36](../36-toge-backend-followup.md)维护 checkbox；沿用原交接 ID，本文保留后端历史证据，不复制前端清单。
