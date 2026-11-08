# CantaLoom MG 视频工程

独立 Remotion / React / SVG 工程，不依赖产品服务，不修改原 HTML。102 秒，1920×1080，30fps，3060 帧。色卡、字体、镜头时长、录屏和音频入口在 [src/config.ts](src/config.ts)，动画在 [src/index.tsx](src/index.tsx)，导出在 [render.mjs](render.mjs)。

## 编辑与渲染

在本目录运行 `npm ci`，然后 `npm run studio`。可拖动逐帧时间轴，选择 Preview / Alpha 或独立镜头。所有动画由帧号计算，没有计时器或随机数。Windows 使用本机 Microsoft YaHei / Arial；换机请安装有授权的中文粗字体并调整 typography 配置，避免字体替换改变排版。字体文件未分发。

- `npm run render -- all`：完整预览、完整 Alpha、五个独立镜头。
- `npm run render -- Preview`：仅预览 MP4。
- `npm run render -- Alpha`：仅完整透明 MOV。
- `npm run render -- opening`：单镜头，另有 ingredients、singing、showcase、ending。
- `npm run render -- stills`：检查图。

产物统一写入项目根目录 `temp/mg-video/`，不入 Git。正式透明输出为 PNG 截帧 → ProRes 4444、yuva444p10le。不要用普通 MP4 替代透明文件。剪辑软件以保留 Alpha / Straight 方式解释素材；先放录屏轨，再叠加完整 Alpha MOV。正式 Alpha 没有占位提示，录屏窗口内部 Alpha=0，边框和外部 MG 正常显示。建议录屏满画幅居中，下层画面会通过 1780×810 的窗口显露。

## 素材清单与替换

| ID | 主录屏区间 | 时长 | 要提供的素材 |
|---|---|---|---|
| input | 00:08–00:24 | 16 秒 | 实际输入需求、启动创作；不要演示未经实现的功能 |
| edit | 00:30–00:50 | 20 秒 | 实际歌词、旋律、音符编辑 |
| voice | 00:57–01:15 | 18 秒 | 实际合成过程与试听 |
| pv | 01:22–01:36 | 14 秒 | 实际最终音乐 / PV，保留必要署名 |

每段额外预留首尾各 1.15 秒画面余量，供窗口打开和收拢。主透明窗口为 x=70,y=135,w=1780,h=810；正式 16:9 录屏可裁切或缩放，重要信息请放在窗口安全区。完整 Alpha 是首选后期合成轨；录屏层须覆盖前后余量，避免开窗期间露出空底。

也可把素材放进本目录 `public/`，在 slots 对应 file 填相对文件名，trim 填含开场余量的素材起始秒数，在 Preview 合成。自动 Video 插入覆盖首尾余量；素材须提供主区间加 2.3 秒。不把素材绝对路径写入配置。正式 Alpha 始终只导出 MG，不嵌入录屏。

修改录屏时长时同步修改 slots 的 start/end、shots 的 start/end，完整 composition 和每个独立镜头自动读取配置时长。镜头顺序可通过这两张表与对应 Scene 分派调整。字幕文案集中在 Scene / Window 的 Text 元素中，可直接编辑；不调用真实业务接口。

## 节奏、声音与限制

当前版本无配乐、无人声、无假录屏，预览为静音视觉剪辑。波形是程序模拟，不能当作真实音频分析。audio.file 可指定 public 内有授权的音频，volume 控制响度；未来真实节拍联动应把音频逐帧 RMS / 频谱数据提供给 Wave，而不是将模拟波形描述为真实数据。audio.bpm 为后续节拍配置预留，当前运动以帧号为准。

五段独立 MG 与完整时间轴共用一个 Film，可单独重导；独立片段保留进入下一段录屏的开窗尾巴，完整合成时优先使用全长 Alpha 避免接缝。录屏回 MG 的收拢发生在录屏结束后 1.15 秒，属于下一段 MG 开头。

本工程仅是黑客松影片包装。产品真实能力、实际录屏内容、声音及人工创意接受度须另行确认，不能由动画导出成功推断。


## 本轮实际检查

完整 MP4：102 秒 / 3060 帧 / 1920×1080 / 30fps，全片解码正常，未发现整帧黑屏。透明 MOV：ProRes 4444，解码 yuva444p12le；在四段主区间直接解码，内窗 Alpha 全为 0、外部为 255。完整检查图与 JSON 证据在根目录 temp/mg-video。运行 `node qa-stills.mjs` 可用复用浏览器快速抽帧；`verify.py --ffmpeg <带 alphaextract/blackdetect 的 FFmpeg>` 可复核透明 MOV（需要 Pillow）。Remotion 捆绑 FFmpeg 负责渲染，本次完整解码检测使用本机 imageio-ffmpeg，未将该 Python 环境作为工程渲染依赖。视觉抽帧未发现中文缺字或主标题溢出；未替代用户对动画节奏的最终审阅。
