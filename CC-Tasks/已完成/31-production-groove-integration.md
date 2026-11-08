# 工单 31：制作任务 Groove 跨层契约与稳定渲染输入

Owner：Blacktea / Backend & Music Engine；共享契约、工程模型与跨层适配由 Toge review。
状态：后端/限定跨层阶段已完成（2026-11-08），页面、Mock、Synth 与人工听感继续交接。原始基线：2026-11-08 远端 `main` 静态核对；本地 `feature/backend-launcher-restart` 的未推送变更未被核验，实施前重新对照。
来源：[工单 20](../后端/20-groove-and-humanization.md)已完成确定性 Groove 引擎，但生产链与工程参数尚未接；[工单 27](../27-frontend-interface-sync.md)明确“不能只做开关”。

## 目标与范围

将可选 swing / timing humanization / velocity humanization 从孤立的 `InstrumentInput.groove` 变成**可持久化、可随制作结果返回、可重复渲染的工程参数**。本阶段先完成后端、共享契约和非 UI 的适配，不修改 React 控件、前端 Mock、页面布局或新音效算法。保持工单 20 已交付的自由鼓型；不重开鼓 pattern 设计，不扩展 SongPlan / 长歌 / MixGraph。

现状证据：
- `shared/contracts/groove.mjs` 已有 `grooveSchema`（projectId、trackId、version、swingTicks、timingTicks、velocityAmount）。
- `shared/contracts/index.mjs` 的 `instrumentInput` 已接受可选 groove、locked、manuallyEdited、notes[].locked。
- `server/services/instruments.mjs` 已对受保护轨道剔除 groove 以保持缓存键不变。
- `server/services/production.mjs` 调用 renderer.render 时尚未传入 groove 或保护标记；`shared/contracts/free-composition.mjs` 的 `freeInputSchema` 是 `.strict()`，直接向旧输入附加字段将被拒绝。
- `src/model.ts` 尚未定义工程持久化 Groove 字段；`src/external-audio.ts` 尚未传 groove / 保护标记。

## 唯一应做清单（本单维护状态）

- [x] 先在 `shared/contracts/CHANGELOG.md` 提案并取得此次**限定的跨层确认**：工程存储字段、HTTP 输入、旧工程读取、保护状态、调用点和 Mock Owner。不要沿用工单 20 的历史授权自动改 UI。
- [x] 定义纯参数 `grooveSettingsSchema`，仅包含 swingTicks（0–120 整数）、timingTicks（0–20 整数）、velocityAmount（0–0.2）；`projectId/trackId/version` **不由页面手写或重复持久化**，渲染时从工程与轨道衍生。推荐 `SongProject.grooveSettings?` 作为本期最小的全局开关，不提前设计逐轨效果链。共享 `.mjs` / `.d.mts` 与工程校验同步；无字段的 v1 工程仍直接可读。
- [x] 在 `POST /api/production` 的请求层定义**独立的、向后兼容的** `productionInputSchema`（在原 `freeInputSchema` 外扩可选 grooveSettings），并同步 TS 声明、示例和错误语义。调用现有自由作曲/LLM 前剥离非创作字段，避免严格的 `freeInputSchema` 拒绝、或将 Groove 当成歌词规划指令。**不新增重复的 production URL**。
- [x] `createProduction()` 在拿到新工程后附加经校验的 grooveSettings；器乐渲染按 `project.id + track.id + track.version + 参数` 生成现有 groove 对象，真实透传 `locked / manuallyEdited / notes[].locked`。人工和锁定内容不得因参数改变而写回、重排或重生成。
- [x] 准备统一的纯音乐事件转换入口供 MIDI 和将来的浏览器 Synth 共用；不要让浏览器独立重写另一套 swing 随机算法。本轮明确哪些调用仍待 Toge 接入，不假装试听已一致。若直接调整 `src/external-audio.ts`，须按团队共享边界先 review；不触碰组件和 Hook。
- [x] 验证新工程的 `grooveSettings` 随 GET production project 返回，可经保存/导入校验往返；旧工程、旧请求（不带 grooveSettings）音符/MIDI/缓存行为不变。无权限或范围未确认时，先交付契约提案和后端小阶段，不越界实施工程模型。
- [x] 补后端契约、制作任务、保护、重复调用与缓存回归；有真实 FluidSynth/SoundFont 的机器执行 WAV 差异/缓存验收，并与夹具测试分开记录。

## 预期接口（提案示例；确认前不是已生效 API）

`POST /api/production`：

```json
{
  "intent": "雨后重新出发的轻快流行曲",
  "targetSeconds": 25,
  "grooveSettings": {"swingTicks": 48, "timingTicks": 8, "velocityAmount": 0.06}
}
```

`GET /api/production/:id` 成功结果的 `project.grooveSettings` 包含同样三项；旧输入/旧工程可没有此字段。`InstrumentInput.groove` 仍使用现有完整种子结构；受保护轨道不带有效 Groove，关闭参数后应与既有非 Groove 渲染一致。缺省全部为零，但**缺省不能反向改写旧工程、改变已完成缓存键**。

## 验收

1. 合法/非法三参数明确通过/400；未带字段的旧请求能继续生成。
2. 同一工程同一参数 MIDI 事件字节与渲染缓存键稳定；改变参数只影响非受保护的目标器乐轨道；被保护轨道缓存键与音符完全不变。
3. 制作端真实传递输入，拿到带设置的工程；不把制作的 projectId、trackId、version 取自请求中的伪造字段。
4. Groove 开/关在有资源机器的 FluidSynth WAV 有可测差异；失败不覆盖旧工程、无随机时间种子。
5. 后端完成 ≠ 浏览器试听/Mock/UI 已完成；未验的真实听评仍归[工单 6](../6-joint-acceptance.md)。

## 交接入口

沿用 [20-groove-render](../../CROSS-END-HANDOFF.md#20-groove-render)，更新其状态、提交和接收方下一步；需要 Toge 后续接 `src/api/client.ts`、Mock、页面与浏览器试听。同步 [工单 20](../后端/20-groove-and-humanization.md)、[工单 27](../27-frontend-interface-sync.md)的引用，**不要复制另一份实施 checkbox**。结果统一记入 [迭代日志](../../docs/iteration-log.md)。


## 2026-11-08 交付

- 用户在本会话针对具体范围回复「确认上述限定范围」后实施，记录见契约 CHANGELOG。本地已含启动器提交，核对 origin/main 后使用 feature/backend-production-groove，保留原有脚本删除与其他工单，不纳入本轮提交。
- production 独立输入校验、规划剥离、新工程设置返回、v1 JSON 校验往返、统一器乐输入与保护透传已实现；`performedNotes` 原算法不变并补类型声明。关闭/缺省不补旧工程，不改变原输入。
- 测试与真实资源结果见[迭代日志](../../docs/iteration-log.md#production-groove-31)；产物 `temp/task31/plain.wav`、`groove.wav`。真实制作全流程使用显式规划/歌声夹具；FluidSynth WAV 与缓存另为真实引擎实测，未调用真实 LLM/绮萱，不代表人工听感验收。
- 交接 ID：20-groove-render；Toge 仍须接 ProductionInput Client 类型/Mock/页面与浏览器 Synth，不改组件和 Hook。工程 JSON 可存参数不代表已有页面编辑入口。
