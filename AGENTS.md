# AGENTS.md - 生日蛋糕小程序 AI 开发规范

## 1. 执行宪法 (核心规则)
- **沟通协议**：使用中文，称呼用户为**大帅**。
- **工作流**：修改代码必用 `writing-plans`；修 Bug 必遵循 `systematic-debugging`；头脑风暴需对比优劣并给出推荐项。
- **UI 限制**：**全量使用 TDesign 组件库**。禁止原生堆砌，优先通过 TDesign 变量定制主题。
- **文档同步**：操作前必读 `AGENTS.md`、`docs/STYLE_GUIDE.md`、`docs/PRD.md`、`docs/TODO.md`。
- **TODO 更新**：仅在功能完成且**大帅确认**后更新。
- **Git/测试**：Git 合并必请示并说明影响；测试指引需适配微信工具 2.01.2510280；凡需大帅在微信开发者工具补测，必须同时给出“操作步骤 + 预期效果”。

## 2. 技术标准 (TS & TDesign)
- **TS 严格模式**：禁止 `any`，必须有明确类型标注与返回类型。
- **TDesign 引入**：`.json` 中统一命名为 `t-[name]`。
- **命名规范**：文件名小写连字符，函数变量小驼峰，常量全大写下划线。
- **目录结构**：严格遵循 `pages/name/name.{ts,wxml,wxss,json}` 结构。

## 3. 微信小程序已知坑位 (必须规避)
- **ES6 编译开关**：使用 TDesign 或其他 `miniprogram_npm` 产物时，`App/project.config.json` 的 `setting.es6` 必须保持为 `true`，否则真机调试可能直接报 `Unexpected token import`。
- **字体图标约束**：当前稳定基线不依赖 TDesign 字体图标。后续页面若使用 `t-icon` 或带默认 icon 的 TDesign 组件，必须先验证真机调试兼容性；不需要 icon 时要显式关闭对应属性。
- **长页面背景实现**：长滚动页面禁止把复杂渐变直接挂在全局 `page` 上，必须采用“固定背景层 + 内容层”结构，避免滚动断层。
- **第三方包补丁同步**：凡修补 `node_modules` 内的 TDesign 样式或资源，必须同步修改 `miniprogram_npm` 对应产物，否则执行“构建 npm”后运行时行为会回退。
