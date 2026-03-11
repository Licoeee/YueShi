🎨 《悦时 (Yue Shi)》视觉与代码规范

1. 核心视觉参数 (The Soul)

1.1 背景渐变 (Splash & Background)

代码：radial-gradient(circle at 50% 40%, #FFF5F7 0%, #FFD1DC 60%, #FEB47B 120%)

说明：模拟柔和的逆光感，中心偏白粉。

1.2 物理反馈按钮 (Vibrant Button)

常规状态：

background: linear-gradient(135deg, #FF7E5F 0%, #FEB47B 100%)

box-shadow: 0 8px 20px -5px rgba(255, 126, 95, 0.6), inset 0 2px 3px rgba(255, 255, 255, 0.4)

border: 1px solid rgba(255, 255, 255, 0.2)

按下状态 (:active)：

transform: translateY(4rpx) (向下位移，严禁使用 scale)

box-shadow: inset 0 4px 12px rgba(0,0,0,0.15)

1.3 文字美学

品牌标题：白色，letter-spacing: 0.25em，带投影 drop-shadow(0 4px 8px rgba(200, 100, 100, 0.4))。

Slogan：白色，letter-spacing: 0.15em。

2. 动画规范

Float (漂浮)：@keyframes float，上下位移 12px，周期 4s。

Pulse (呼吸)：用于蛋糕蜡烛火苗，周期 1.5s。

3. 开发约束

适配：必须使用 rpx 或 vw。

组件：UI 优先使用 TDesign，但核心视觉页面需手工编写以保证 100% 还原。

4. 微信小程序实现约束

4.1 长页面渐变

复杂渐变不能直接挂在全局 `page` 背景上，长内容页面必须拆成“固定背景层 + 内容层”结构，否则滚动时会出现背景衔接断层。

4.2 TDesign 图标策略

当前工程稳定基线不依赖 TDesign 字体图标。首屏或关键路径页面应避免把视觉成立建立在 `t-icon` 上；使用带默认 icon 的组件时，如果该图标不是必须项，应显式关闭对应 icon 属性。

4.3 微信开发者工具兼容基线

本项目以微信开发者工具 `2.01.2510280` 为校验基线。引入或升级 `miniprogram_npm` 依赖后，必须确认 `App/project.config.json` 中 `setting.es6 = true`，否则真机调试可能无法解析依赖产物。

4.4 第三方包补丁

若为 TDesign 做兼容性补丁，必须同时修改源包和生成包对应文件；只改一侧会在“构建 npm”后丢失修复结果。
