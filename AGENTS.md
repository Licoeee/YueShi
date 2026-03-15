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
- **TDesign Button 变体变量隔离**：`<t-button>` 的每种 `variant` 拥有**独立的 CSS 变量前缀**。修改按钮颜色/边框/背景时，必须先到 `miniprogram_npm/tdesign-miniprogram/button/button.wxss` 中确认目标 variant 读取的实际变量名。常见映射：`theme="default"` → `--td-button-default-*`；`variant="outline"` → `--td-button-default-outline-*`；`theme="primary"` → `--td-button-primary-*`；`variant="outline" + theme="primary"` → `--td-button-primary-outline-*`。**严禁凭记忆猜测变量名**，用错前缀样式不会报错但完全不生效。
- **非按钮语义元素禁用 t-button**：底栏导航入口（如"首页""购物车"图标格子）只起跳转作用、不需要按钮语义时，必须用纯 `<view>` 实现，禁止套用 `<t-button>`。`t-button` 的 `shape`/`size`/`variant` 组合会产生不可预期的圆角和高度计算（如 `shape="round"` 强制 `border-radius = height/2`），导致布局对齐失控。
- **界面修复禁止只做表层微调**：连续两轮仍未解决的 UI 问题，必须先把布局拆成“固定区 / 弹性区 / 内容区”，明确 `flex: none`、`flex: 1`、`min-width: 0`、换行策略，再决定是否改尺寸、字号或组件选型。禁止继续只调颜色、padding、gap 碰运气。
- **极限内容必须先验算**：购物车金额、手机号、账号昵称、订单号、状态文案这类动态内容，修复前必须至少用“空值 / 常规值 / 极限长值”三组样本验算。没有覆盖 `¥1290+`、11 位手机号、长昵称、长订单号这类场景的界面修复，一律视为不完整。
- **状态文案和交互禁用必须同源**：若页面出现“警告 / 错误 / 无效态”文案，必须同步检查点击能力是否跟随禁用或降级；禁止只展示提示，不锁定关键动作。
- **设计改版后必须同步校验测试断言**：页面结构从 `t-button` 变为自定义容器、或从同排改为分层布局后，必须重新运行并核对对应测试，确认断言仍然描述真实实现。旧测试通过不代表新设计正确，旧测试失败更不能忽略。

## 4. 第二阶段高频问题防复发红线 (2.1~2.4)
- **欢迎页比例基线**：以 `390x844` 为必测比例；改排版时必须同时检查“标题-蛋糕”“蛋糕-按钮”两段间距，禁止出现贴顶、贴底、过量留白和元素重叠。
- **欢迎页动效绑定**：仅调排版时不得改动按钮实体化、蛋糕漂浮、蜡烛呼吸、reveal 转场的对象绑定与时序。
- **身份识别口径**：正式角色识别只认 `OpenID + role_directory`；微信开发者工具登录账号不直接决定角色，`wx.setStorageSync` 仅允许作为调试手段。
- **角色判定时机**：点击“进入主页”后立即完成角色判定并直达目标端；禁止先进入顾客端再异步纠偏。
- **Tab 规则一致性**：三端 TabBar 的配置、顺序、文案、高亮必须与实际页面 route 一致；方向判定按“左→右=前进，右→左=后退”，禁止环形推断。
- **快速切换稳定性**：`custom-tab-bar` 的 scene 切换必须保留限流与 pending 覆盖策略，避免高频切换导致主线程阻塞、白屏闪烁和不可恢复卡死。

## 5. Worktree 生命周期流程 (必须执行)
- **创建前**：先在主工作区执行 `git switch dev && git pull`，确保新 worktree 基线最新。
- **隔离原则**：一个 worktree 只承载一个任务，禁止多个任务共用同一 worktree。
- **收尾顺序**：功能完成后按“测试通过 -> 提交 -> 合并到主分支”执行，不允许长期悬挂未收尾 worktree。
- **清理动作**：合并完成后必须执行 `git cherry -v dev <branch>` 确认无独有提交，再 `git worktree remove <path>` 与 `git branch -d <branch>`。
- **日终巡检**：收工前执行 `git worktree list` + 各 worktree `git status -sb`，确保无遗留脏区。
