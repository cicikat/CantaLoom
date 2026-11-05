# 公共契约变更

## v0.2.1

- 汇总已有 health、器乐、绮萱、音频文件、导出、引擎/词典/导入契约；SongPlan 复用原 Schema。
- 新增可选 `mock:true` 开发标记（PlanResponse / Planning / VocalAsset），旧工程与真实响应无需增加字段。Mock VocalAsset 的 isDemo 为 true，真实资产仍为 false。
- HTTP 路径、成功数据含义、锁定和缓存规则保持不变。请求生命周期是客户端状态，不新增后台管理权限。
- MIDI 基础类型由 shared 拥有，前端 Note 只扩展 ID / syllable，消除 shared 到 src 的反向类型依赖；字段和运行时 MIDI 不变。

## 后续共享字段变更模板

在实现 PR 前提交一条提案，两人共同确认；下面的空白不是已经审批。

```text
状态：提案 / 双方已确认 / 已合并
Frontend reviewer：
Backend reviewer：
路径/Schema/字段：
新增、删除或语义变更：
旧工程与旧调用方兼容方式：
受影响的 UI / 服务 / Mock：
契约与回归测试：
关联 PR：
```
