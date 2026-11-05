# v0.3.1 后端分支验收（2026-11-06）

基线 origin/main 480c924。仅红茶后端及工单授权的共享边界；小由 UI、hooks、Mock 和前端 E2E 源码未修改。

已通过：npm run build；npm test 42/42；npm run test:e2e:mock 2/2；npm run test:e2e 11/11；PORT=3102 下 start.bat --check；git diff --check。

新增覆盖：统一规划/乐句事务、手写歌词保护、缺 Key / 规划失败不发布半成品、变长自由工程无旧模板、20–30 秒时间轴边界、伴奏避开演唱。新规划成功路径为明确的接口夹具，不是真实上游 LLM 验收。真实引擎 E2E 是原有流程回归，包含 CPU 绮萱、单句缓存、FluidSynth 和 WAV/MP4，不是新自由网页入口验收。

未执行：新自由入口从正式网页现场创作 A/B/C、真实新宏观规划与乐句联合调用、对应新作品 MIDI/全轨 WAV/MP4、中文字幕同步人工检查、调教主观试听。原因：按工单分工需小由完成 F1–F4 后统一联调；红茶不越权代改 UI。不复制旧 A/B/C 完成工程充当本轮作品。

B4 沿用已接入的 Pitch Bend / Vibrato / DYN / 辅音偏移和 preset，单句调教与缓存保护自动回归通过；不宣称已改善主观音质。本轮没有电脑操控 OpenUtau；只由现有无窗口桥接进行真实引擎回归，状态检查沿用本机管理诊断 API。

交接：docs/V031_FRONTEND_HANDOFF.md。新增 /api/compose 已具备后台真实阶段记录 planning/melody/validated，但普通前端尚无逐阶段订阅协议；不可模拟百分比。正式新作品需使用 projectFromComposition，不能再调用旧 applySongPlan。

已知：构建仍有 Zod 注释及 bundle 大于500kB提示；不影响检查通过。该分支只完成后端交付，不代表整个 v0.3.1 产品闭环已验收。
