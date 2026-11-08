# 工单 37：新用户一键安装与启动

Owner：Blacktea（Backend / 启动与资源）。状态：已完成（演唱全新安装与人工听感待独立实机验收）。

## 范围与依赖

用户授权新增 Windows 安装启动 bat、资源下载到项目相邻目录、硬件要求说明。仅 scripts、启动入口与相关文档，不改前端、共享契约或已有用户配置。依赖 Windows x64、PowerShell 5.1、互联网；演唱资源适用各自许可，LLM API 由用户配置。

## 应做

- [x] 新增 install-and-start.bat；无 Node 新用户可下载安装便携 Node 与 npm 依赖，复用原构建/启动链路。
- [x] 本地/演唱两档、资源相邻目录、校验下载、已完成资源复用与冲突保护。
- [x] 演唱档下载兼容 OpenUtau/绮萱/声码器/.NET，编译无窗口桥接，安装 FFmpeg；下载前显示许可入口并确认。
- [x] 说明内存、显存、空间预算，区分建议与未经测定的最低要求，明确 LLM 配置及可选引擎。
- [x] PowerShell 语法、计划模式、下载/启动检查与 diff 检查；记录真实验证边界。

## 验收与交接

使用方式和资源目录见 [ENGINES 首次安装](../../docs/ENGINES.md#first-install)；实际检查及限制见[迭代日志](../../docs/iteration-log.md#first-run-installer)。不涉及前端交接或新契约。CPU/DirectML 全新演唱、不同显卡/低内存设备、人工听感均未由本工单验证，不勾选共同验收工单 6。
