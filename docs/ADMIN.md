# 本地后台管理

2026-11-06 文档核对：绮萱、真实 LLM 与成片的历史验证见 [QIXUAN.md](QIXUAN.md)，最新后端制作能力见 [v0.3.2 验收](V032_BACKEND_ACCEPTANCE.md)。新页面接入与人工听感仍待完成，见[接入计划](plans/free-creation-integration.md)。本次没有重新检查本机引擎或调用模型。

入口：启动后端后直接打开 `http://127.0.0.1:3001/admin`（端口随后端 PORT 变化）。Vite 的 5173 不代理管理页面或管理 API，对这些路径返回 403；不要通过前端代理访问后台。沿用 Express，不需要额外服务或数据库。

## 已实现

- **连接与密钥**：填写 OpenAI 兼容聊天接口 Base URL、模型与 API Key。后端追加 `/chat/completions`；HTTPS，或本机 HTTP；拒绝带用户名、密码、查询参数的地址。API Key 为密码框，留空保留，勾选清除才删除。没有“显示已有明文”接口。
- **保存与生效**：`external/runtime/config/settings.json` 原子保存；Key 使用 Windows DPAPI CurrentUser 加密。配置优先于 `.env`，保存后规划器与引擎读取新值，不用重启。生成或检查运行中拒绝修改，避免同一请求混用配置。切回工作台时刷新健康状态。
- **连通检查**：发送一次最多 8 tokens 的最小聊天请求；可能产生少量费用。接口可达不代表完整 SongPlan 通过；只有真实创作请求成功并校验完整 JSON 才将工作台标记 verified。检查不返回上游错误原文、请求头或 Key；拒绝重定向，避免凭证被转发。
- **引擎检查**：FluidSynth 版本与 SoundFont，FFmpeg、Python、DiffSinger 关键依赖、CUDA 可用性、OpenUtau 文件存在性、GPU 名称与显存。文件存在不等于真实演唱验收。
- **生成状态台**：本进程最近 100 个请求，包含 LLM、FluidSynth、DiffSinger、WAV 导入、PV；自动制作任务作为额外来源接入。显示运行、成功、失败、连接中断、HTTP 结果和耗时。不记录歌词请求体、密钥或上游原始错误。无伪造百分比；连接中断不代表外部进程已取消。
- **资源管理台**：扫描引擎、音源、声库、缓存、导出目录，显示文件数、大小、修改时间与缓存 WAV 试听。忽略 `.git`、`.venv`、符号链接；每组扫描上限 10000 文件、显示上限 100 文件。统计不包含虚拟环境占用。不会删除缓存、模型或工程。
- **声库注册**：表单维护 `external/voicebanks/voices.json`，包括 ID、版本、名称、variance/acoustic 实验目录名。注册只针对已授权且已安装的原生 DiffSinger checkpoints；ONNX 声库不能直接交给 Python infer.py。更新注册不下载文件、不代表权重已验收。
- **能力与待办**：在页面中展示当前功能、真实验证缺口和后续后台需求，避免将尚未实现的功能做成可点击的假按钮。

## 当前音乐链路

旧页面通过 LLM 或本地规则取得 SongPlan，再由浏览器规则作曲器生成 Note。新自由创作通过 compose 完成宏观规划与结构化 MelodyDraft；production 进一步串联伴奏和绮萱推理，提供真实阶段与单句失败重试。LLM 生成规划/旋律数据，实际音频由引擎合成，不直接产出 WAV。

器乐可用 Web Audio 或 FluidSynth；歌声可选明确标注的元音演示、导入 WAV、已接入的 OpenUtau/绮萱，原生 Python DiffSinger 文件交换路线仍保留。真实中文演唱已有历史实测；新正式网页的完整流程和人工听感尚待共同验收。

单轨 / 单句 / 全曲试听、WAV 与 PV 都调用 `renderAudio`，统一 24000 Hz。歌声依赖包括本句歌词、音符、BPM、起止点、引擎、声库 ID 与版本；修改第二句不失效第一句。缺失或过期真实人声会报错，不自动换成元音。

## 本机边界

服务监听 `127.0.0.1`。管理 API 验证本机 Host、Origin、JSON Content-Type 与 CSRF 请求头；无 CORS 放行；不缓存管理响应。页面 CSP 仅允许本源脚本和资源。当前信任同一 Windows 账户及其本机程序，没有账号登录，不适合通过代理暴露公网。

密钥绑定当前 Windows 账户，换账户或机器需重新填写；加密不防拥有该账户执行权限的本机程序。配置不进入 Git，资源清单不扫描 `runtime/config`。不要备份明文 Key 到工程 JSON。若环境不支持 Windows DPAPI，保存密钥明确失败，不回退明文。

任务、连通结果、操作记录保存在进程内，重启清空；配置与资产保存在磁盘。重启后连通检查需重新执行。若改 `.env`，已保存后台配置仍优先；可在面板清除或调整。

## 路径与命令

```powershell
# 在自己的仓库根目录执行
npm ci
npm run build
npm start
# Windows 启动入口
.\start.bat
```

`SONGYU_EXTERNAL_ROOT` 可在启动前指定外部根目录，默认 `D:\ai\hacson\external`；根目录属于启动配置，面板不在线移动第三方文件。其他路径字段允许在线配置。`OPENUTAU_PATH` 仅用于诊断，不启动 GUI。

FluidSynth 当前安装在 `external/FluidSynth/fluidsynth-v2.6.2-win10-x64-cpp11/bin/fluidsynth.exe`；OpenUtau 在 `external/OpenUtau/OpenUtau.exe`；DiffSinger 在 `external/DiffSinger`，独立 Python 为 `.venv/Scripts/python.exe`。测试音源为 MuseScore 官方仓库发布的 FluidR3Mono_GM.sf3（不是宣称 MuseScore General 最新版），许可证保留在外部 soundfonts 目录。第三方引擎、权重及安装包都不推送。

## 尚待完善的后台能力

1. 已有自动制作实际阶段与单句失败重试；尚缺持久化队列、通用取消及跨进程恢复。制作任务最多30条、内存保存，重启后查询返回404，不保证恢复规划中间态。
2. 模型 / 声码器依赖校验、文件 SHA256、许可记录、声库署名与 AI 标识模板。
3. 缓存配额、引用检查、安全清理与多工程资产恢复。
4. 模型用量 / 费用统计、调用限额、可持久化且脱敏的诊断记录。
5. 远程管理前增加登录、权限、HTTPS、持久化审计、密钥轮换和备份恢复。

这些是后台后续方向，不表示页面已同步或本轮已实现。当前执行范围与分工在接入计划中维护。

## 验证

`npm test` 包含真实 Windows DPAPI 加解密、密钥保留 / 清除 / 重载、不回显密钥、无效配置保留旧文件、Host / Origin / CSRF 拦截和真实 HTTP 任务状态。

`tests/browser/admin.spec.ts` 使用独立临时后端和明确标识的聊天接口夹具，实际填写密码框、加密写盘、调用连通检查和 `/api/plan`、刷新后脱敏、资源扫描及桌面 / 手机布局。测试不改用户配置，不宣称真实商业 LLM 已接通。
