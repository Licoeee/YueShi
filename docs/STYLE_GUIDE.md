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