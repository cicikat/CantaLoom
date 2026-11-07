# 工单 28：章节过渡动效（积木抽开与 Let's 文字过渡页）

Owner：Toge（toge / Frontend / UX）。状态：实现与 Mock 回归完成，待 toge 实际滚动核对（2026-11-08）。
范围：`src/components/ChapterBridge.tsx`、新增 `src/components/MvBridge.tsx` 与 `src/hooks/useStickyProgress.ts`、`src/chapters.css`、`src/App.tsx` 中插入过渡页的一行、受影响的 Mock 页面用例（TAP 先进入工作台），以及工单 23 的页面结构说明。
依赖：在[工单 23](23-three-chapter-page.md)三个视觉章节之上迭代。此工单不授权修改后端、音乐算法、共享契约、Client、`src/visual.ts` 画面或导出链路。

## 设计要求（toge 原话要点）

- 「音乐积木工作台」文字页下滑进入工作台时，营造积木被抽开、露出下面工作台的感觉；工作台换一个更合适的底色。
- 工作台下滑到 MV 之间插入文字过渡页，工作台 → 文字页、文字页 → MV 两段都要有过渡。
- 文字页先 `Let's go together`，再 `Let's make a music video`；Let's 后面的字母逐个交换，翻转时像鼓一样滚动、模糊溶解、放大后放下、以小弹跳落入。
- 滚动的文字放在有颜色的块上，块平滑调整大小以适应新文字，并配对比度足够的文字颜色。

## 应做与验收

- [x] Music Blocks 页的纯色底改为七条带抽屉把手的积木板；工作台在积木板下方滚到位后，积木板先反向轻拽，再按打乱顺序左右交替被抽走，`Music` 向左、积木字母向右被拉出屏外。往回滚到工作台顶部低于屏幕 3/4 时积木板才弹回、标题回来；焦点进入工作台时自动打开，抽走中的积木板不拦截点击。
- [x] 工作台底色由淡紫点阵改为暖米色切割垫方格（每 4 格一条粗线，呼应 16 步格子），颜色集中在 `src/chapters.css` 顶部 `--bench*` 变量。
- [x] 工作台 → 文字页：积木板随滚动从两侧推回盖住工作台；工作台底部多铺一屏同色桌面，推回过程中不露出页面白底。
- [x] 文字页：黄色块 + 墨色字 `go together` 逐字滚入；停 2 秒或继续下滑后逐字翻成 `make a music video`，旧字母模糊溶解、新字母像滚筒一样带模糊滚入、放大、落下、小弹跳；块宽按新文字平滑伸长，块色切到深色、字色切到亮黄。
- [x] 文字页 → MV：深色块从自身中心放大铺满屏幕，颜色与 MV 放映厅相同，随后 MV 章节无缝接上。
- [x] 系统「减少动态效果」时两段过渡都改为静态纯色标题块；过渡层 `aria-hidden`，不改读屏内容；390px 无横向滚动。
- [x] Mock 页面回归：TAP 用例按新路径先经导航进入工作台再敲，BPM 下限不变；积木板去掉常驻 `will-change`，避免轮询监听负载下拖慢整页。
- [ ] toge 在电脑、手机实际滚动核对节奏：抽开触发点、文字停留时长（`MvBridge` 的 `HOLD_MS` 与 `SAY` / `SWAP` / `FILL` 阈值）、工作台底色是否合适。

实现与验证记录见[迭代日志](../docs/iteration-log.md#chapter-transition-motion)，结构说明见[原型接线边界](../docs/ARCHITECTURE.md#prototype-frontend)。
