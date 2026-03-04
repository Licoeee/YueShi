# AGENTS.md - 生日蛋糕小程序 AI 开发规范

## 1. 执行宪法 (核心规则)
- **沟通协议**：使用中文，称呼用户为**大帅**。
- **工作流**：修改代码必用 `writing-plans`；修 Bug 必遵循 `systematic-debugging`；头脑风暴需对比优劣并给出推荐项。
- **UI 限制**：**全量使用 TDesign 组件库**。禁止原生堆砌，优先通过 TDesign 变量定制主题。
- **文档同步**：操作前必读 `AGENTS.md`、`docs/STYLE_GUIDE.md`、`docs/PRD.md`、`docs/TODO.md`。
- **TODO 更新**：仅在功能完成且**大帅确认**后更新。
- **Git/测试**：Git 合并必请示并说明影响；测试指引需适配微信工具 2.01.2510280。

## 2. 技术标准 (TS & TDesign)
- **TS 严格模式**：禁止 `any`，必须有明确类型标注与返回类型。
- **TDesign 引入**：`.json` 中统一命名为 `t-[name]`。
- **命名规范**：文件名小写连字符，函数变量小驼峰，常量全大写下划线。
- **目录结构**：严格遵循 `pages/name/name.{ts,wxml,wxss,json}` 结构。