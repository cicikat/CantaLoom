# v0.3 后端工单交接

> 这是 v0.3 当时的交付快照，保留停止点与测试边界，不作为当前接入顺序。后续 compose / production 已取代下文早期建工程建议，接入须读 [v0.3.1](V031_FRONTEND_HANDOFF.md) / [v0.3.2](V032_FRONTEND_HANDOFF.md) 与[当前计划](plans/free-creation-integration.md)。历史停止/授权不延伸到新任务。

分支：feature/backend-dynamic-melody。用户要求先推送并停止后续工作。

已更新 AGENT.md / AGENTS.md：红茶只改后端、音乐核心和经授权的共享边界；小由负责组件、hooks、CSS、Mock 与前端 E2E。原有用户工单和协作文件不代为提交。

已实现：shared/contracts/melody 的 MelodyDraft / PhrasePlan / Performance；POST /api/melody；共享客户端 melody；src/melody.ts 的 createFreeProject、melodyRequest、applyMelodyDraft、setPhrasePerformance。支持 1–8 句自由歌词、主题生成、指定句生成、整句及单音符锁定、歌词保护、失败原子性、调式/强拍和弦/时值/重叠/对齐校验。旧 JSON 不自动改写音符。新本地规则采用非均匀节奏与重复音，不伪称 LLM。

演唱参数：natural / soft / strong 映射 Pitch Bend、长音 Vibrato、DYN 与 phoneme offset；毫秒按 BPM 转换 USTX tick。未提供 performance 时保留旧缓存行为；表现变化只使当前句依赖失效。BREC、VELC、PEXP 未暴露控制；本地声库 ENE 未启用，不宣称已支持这些参数。没有修改官方程序集、声库或桥接器。

真实证据在 D:/ai/hacson/external/runtime/exports/v03-dynamic：三组真实 deepseek-v4.1-flash 请求与结果、12 句绮萱 CPU 音频、工程、三组混音 WAV 与三组 25 秒 H.264/AAC 720p MP4。ffprobe 及完整解码通过。

A 手写忧伤歌词：38.396 秒、1205 输入 / 5974 输出 tokens；B 主题生成：42.090 秒、1200 / 6808；C 锁定首音续写：33.420 秒、3151 / 5375。每组通过本地音乐校验，有非均匀时值与休止；C 保留首音与非目标句。脚本请求文件中的输入为验收输入，不是模型输出模板。

相同手工旋律三种真实表现音频 RMS：natural 0.054666、soft 0.039448、strong 0.071104。不同 PCM 不能等同于主观听感更佳；尚未有人耳评分。P0 对照及自动音高估计在 ../v03-p0；自动相关法存在八度/泛音歧义，不据此虚构机械感来源百分比。

对比文件：original-mechanical.wav / dynamic-expressive.wav，歌词相同。legacy-melody.ts 仅冻结旧算法供验收，应用不使用。真实权重、密钥和音频不进 Git。

已完成 npm run build、npm test（39/39）。此前整轮真实 E2E 11/11、Mock 2/2 已通过；最后本地节奏规则调整后重新发起浏览器回归，停止时结果以执行日志为准，不把此前结果冒充最后版本验收。

小由待接入：用 createFreeProject 建短歌；melodyRequest 构造请求；api.melody 返回后用 applyMelodyDraft 原子应用；只调教用 setPhrasePerformance，然后单句重唱。钢琴卷帘、调教面板及新 /api/melody Mock 未实现，按分工留给小由。本轮没有改其 UI/Mock/前端 E2E。

后续先确认最终两套 E2E 日志，再进行主观试听、更多歌词/延音/多音字覆盖。新的曲线映射仍需更广泛的发音质量验收；当前宏观 SongPlan 沿用现有契约。
