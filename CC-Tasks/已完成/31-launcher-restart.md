# 工单 31：两个启动入口自动重启旧服务

Owner：Blacktea / Backend。状态：已完成；2026-11-08。
范围：用户本轮要求两个启动 BAT 自动关闭旧服务再重启；沿用工作区已有「打开吱声机」文件名，不改产品名或页面。
依赖：既有 start.bat / start-local.mjs 与本机管理状态；不改变公开音乐契约。

## 应做

- [x] 核对工作区、main 与现有入口，保留用户的旧文件删除和重命名。
- [x] 两个中文入口走 --restart；管理入口打开 /admin，start-admin 同步复用。
- [x] 核对服务 PID、进程代次、Node 命令和管理身份，拒绝其他服务；等待端口释放后构建重启。
- [x] --check 在任意参数位置均正常退出，不停留在 pause。
- [x] 定向 Windows 进程保护、两个 BAT 的真实重启与单元回归。
- [x] 更新说明/迭代日志、检查链接和 diff，按范围本地提交。

## 验收与交接

入口：[README](../../README.md#launch)、[架构](../../docs/ARCHITECTURE.md)、[引擎与后台](../../docs/ENGINES.md)、[迭代日志](../../docs/iteration-log.md#launcher-restart)。
旧服务被停止后内存任务不会恢复，磁盘缓存、配置和浏览器存档保留；本轮不测试真实模型或歌声生成。
无新增跨端接线项；仅本机管理状态增加项目路径/PID，现有 root 保留资源目录含义。
