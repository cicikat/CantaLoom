# 工单 38：本机音乐后台 DeepSeek 配置

Owner：Toge（本次明确授权后台模型配置）。状态：已完成，2026-11-08。

## 范围与依赖

仅使用现有本机管理 API 配置默认连接及歌词、旋律、演唱表现三个任务；不修改后端算法、公共契约或前端。依赖已运行的本机服务、已有 DPAPI 加密密钥与 DeepSeek 账户额度。

## 应做与验收

- [x] 定位原连接失败原因：账户管理网站被误填为 API Base URL，历史检查返回 405。
- [x] 默认连接改为 `https://api.deepseek.com`、`deepseek-flash`；三个音乐任务使用同一连接与已有密钥引用。通过管理 API 热生效，未重启服务。
- [x] 官方模型列表获取成功，最小聊天检查 reachable；密钥继续由 Windows DPAPI 加密，不提取、不打印、不进 Git。
- [x] 真实 `/api/compose` 返回 200，通过完整 `freeResultSchema`；四段结构、source=llm，手写两句歌词原样保留，约 49.3 秒。追溯显示歌词规划与旋律生成各一次成功。
- [x] 在迭代日志记录验证边界与交接入口。

## 边界与交接

演唱表现路由已配置，尚未执行其真实调用；可选 AI HTML PV 路由保持未启用。不把本次接口创作通过当作正式页面、歌声音频、导出或人工听感验收，后续仍按[工单 6](../6-joint-acceptance.md)实施。无新增跨端接口或代码接线事项。

依据：[后台配置说明](../../docs/ENGINES.md#admin)、[DeepSeek 官方型号与价格](https://api-docs.deepseek.com/quick_start/pricing/)。本机验证记录见[迭代日志](../../docs/iteration-log.md#local-deepseek-configuration)。配置文件与密钥位于仓库外，不随本工单提交。
