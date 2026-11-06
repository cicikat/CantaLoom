# SONGYU v0.2.1 交付与验收

> 历史执行快照：下文“未推送 / CI 尚未远端运行”等只说明本阶段当时状态，本次未核实当前远端 checks/保护设置，也未重跑测试。当前能力与待办见 [README](../README.md)和[接入计划](plans/free-creation-integration.md)。

日期：2026-11-05。基线 `5047917`，开始时工作区干净。代码在当前工作区，未创建远端 PR、未推送、未修改 GitHub 分支保护。

## 交付

- [修改前审计与真实依赖](DECOUPLING_AUDIT.md)。
- [目录、最终依赖图、文件所有权、独立开发命令和 Git 规范](TEAM_WORKFLOW.md)。
- [API 契约与 Client 说明](API_CONTRACT.md)，以及 `shared/contracts/CHANGELOG.md` 的共同确认模板。
- App 保留页面组合，工程/导出用例、播放器、计划请求和歌声生成移出 UI；QixuanPanel 通过 hook 触发业务模块，依赖核对、锁定保护与三版历史事务独立。
- 服务端 index 保留启动与装配；主要 HTTP 路由与 LLM / 器乐 / 绮萱 / FFmpeg 服务分开，旧入口保留兼容导出。
- API Client 集中地址、超时、错误、Schema 校验、音频下载与任务生命周期。Vite 代理可配置；管理后台仅本机直接访问，不经过 Vite 代理。
- 独立 Mock 提供固定计划、声库、任务、测试音与导出状态；独立存档、显式标记、禁止在真实模式导入 Mock 工程。Mock PV 只下载 JSON 回执。
- shared MIDI 类型不再反向依赖 src；SongPlan 仍为原共享 Schema。没有更改作曲算法、LLM 提示词、OpenUtau 桥接或 MIDI 运行时实现。

## 执行结果

| 检查 | 结果 |
|---|---|
| `npm run build` | 通过（独立执行及最终启动检查均包含构建） |
| `npm test` | 31/31 通过，无跳过 |
| `npm run test:e2e` | 11/11 通过，无跳过，真实本机引擎 |
| `npm run test:e2e:mock` | 2/2 通过，仅启动 Vite，不启动后端 |
| `.\start.bat --check` | 通过；使用 `PORT=3102` 避开原有 3001 服务，页面 / JS / API 就绪后自动停止 |
| `git diff --check` | 通过；Git 有 Windows 行尾转换提示 |

独立 Mock 浏览器用例拦截全部 HTTP `/api/` 请求，并断言请求数为零；完成计划应用、锁定与重生成、单句生成/重唱、兄弟缓存保护、试听、刷新、Mock FluidSynth 混音、WAV / 工程 / 导出回执下载。另验证 Vite 的管理路径均返回 403。

真实模式验证旧 JSON 恢复、SongPlan 成功/失败原子性、锁定/手写保护、局部重生成、FluidSynth WAV 与全曲混音、绮萱生成和试听、真实“重新演唱这一句”按钮、第二句改动后第一句资产不变、WAV 与带绮萱署名的 MP4。第一句重唱 `take=1` 本轮新推理成功（`cached:false, isDemo:false, runner:CPU`），其余有效句复用真实缓存。

本轮最终作品 25 秒；人声 RMS 约 0.04615、伴奏 RMS 约 0.01989。ffprobe 确认 MP4 为 H.264 / AAC、1280×720、25.000 秒；FFmpeg 完整解码无错误。产物沿用既有真实验收目录：`D:\ai\hacson\external\runtime\exports\qixuan-acceptance`（final-project.json、browser-acceptance.json、songyu-final.mp4 及三份 WAV）。截图在 `test-results/qixuan-page.png`、`mock-test-results/frontend.png`，均为忽略的本地测试产物。

契约迁移回归曾发现 Zod 重排 renderParameters 属性后，旧 JSON 缓存依赖字符串比较失败；已在资产适配层恢复既有字段顺序，未更换旧缓存算法，增加真实响应解析后的应用测试。开发中修改测试配置曾触发 Vite 重载，随后冻结代码完整重跑 11/11 通过；没有靠跳过或降低断言解决。

## 验收边界与已知问题

- 本轮 LLM 请求成功/失败、模型输出校验为本地接口夹具；没有新增真实上游 LLM 调用。真实引擎 E2E 使用本机既有真实 LLM 工程，不能据此声称本轮又验证了真实 LLM 提供商。
- 本轮新推理为 CPU；DirectML、OpenUtau GUI、真实手机/Safari 未重新验收。主观歌声听感、机械旋律问题明确留待下一阶段。
- 构建有 Zod 包注释及大于 500 kB 的 bundle 提示，构建仍通过；本轮未扩展到打包优化。
- GitHub Actions 工作流已落地，但尚未远端运行。CI 执行可移植检查，不安装/分发声库；完整真实引擎测试仍需有授权资源的本机。main 的必需状态检查需维护者启用。
- 既有原生 DiffSinger 文件交换接口、少量平铺纯音乐模块保留原路径；这是有意减少迁移，不要求为了目录整齐重写引擎。
