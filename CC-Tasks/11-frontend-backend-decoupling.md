# 工单 11：前后端解耦迁移方案

Owner：历史记录，当前不重新派工。状态：历史方案，已有后续交付；不是当前待办。
来源：原 docs/DECOUPLING_AUDIT.md，基线 5047917（2026-11-05）。迁移日期：2026-11-06。
保留当时方案与限制，不按旧环境描述重复施工；当前分工从 [README](../README.md#协作工单)进入。

## 原迁移清单

| 模块 | 问题 | 最小迁移 |
|---|---|---|
| App.tsx | 四页 JSX 与请求、持久化、播放循环、WAV/PV 编排混合 | 状态协调进入 hooks/useStudio；工程与导出进入 features；JSX 保留布局 |
| QixuanPanel.tsx | 组件发 HTTP、核对异步结果、改历史缓存、串行生成 | useQixuan 管交互；features/singing 管依赖校验与结果事务 |
| audio.ts | 浏览器引擎方向合理，但直接 fetch 状态和资产 | 保持混音与合成；所有网络经 api/client |
| composition.ts | 纯计划保护逻辑与 fetch 混合 | 保留旧导出入口兼容调用方；请求委托 api/client |
| external-audio.ts | HTTP、资产检查、WAV 导入混合 | HTTP 委托 API；原有稳定接口保留 |
| server/index.mjs | 启动与 FFmpeg 服务、输入校验、路由混合 | routes 挂载 HTTP；services 放编码；现有引擎模块继续作为服务 |
| shared | SongPlan / MIDI 已有，器乐、歌声和导出 Schema 散落服务端；MIDI 声明反向引用 src/model | shared/contracts 统一复用；SongPlan 不重建；MIDI 基础类型由 shared 定义，前端扩展 |

## 原预计修改范围

预计修改文件：App、QixuanPanel、EnginePanel、composition、external-audio、audio、model、shared/song-plan（仅可选 Mock 标记）、server/index、instruments、qixuan、Vite/package/Playwright 配置、环境示例、维护文档；新增 api、hooks、features、contracts、routes、services、Mock/契约测试与 CI。纯音乐算法、OpenUtau 桥接、提示词保持原实现。

## 结果与现行说明

实施结果见 [v0.2.1 迭代记录](../docs/iteration-log.md#v021)，实施前依赖图也保存在该条目。现行目录与接口见[架构](../docs/ARCHITECTURE.md)，所有权见[团队工作流](../docs/TEAM_WORKFLOW.md)。
