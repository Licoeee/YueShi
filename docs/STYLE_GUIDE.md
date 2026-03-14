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

欢迎页入场状态：

按钮初始需从中心向两侧展开，并伴随透明度提升与轻微虚化收敛；动画完成后才进入常规可点击状态。

1.3 文字美学

品牌标题：欢迎页主标题使用圆润厚重字体栈 `YouYuan, FZYaoti, "PingFang SC", "Microsoft YaHei", sans-serif`；颜色建议为半通透暖玫瑰色 `rgba(180, 86, 94, 0.72)`；层次只能通过柔和阴影建立，禁止硬描边或实心厚描边。

Slogan：欢迎页副标题文案为"遇见你的专属甜蜜时刻"；颜色为暖棕色，字重需要明显高于常规正文，`letter-spacing` 建议在 `0.16em` 到 `0.18em` 之间，避免字形黏连。

1.4 欢迎页蛋糕主视觉

欢迎页主视觉为居中的卡通鲜奶蛋糕，需贴近真实生日蛋糕结构：

- 顶部为三根蜡烛和火苗；
- 奶油层保持白色或微粉白色；
- 蛋糕胚统一改为淡粉色；
- 奶油上的装饰使用零散分布的圆形彩色糖果，不再使用草莓；
- 整体比例需要在手机首屏中央形成明确视觉焦点，但不能压迫标题和按钮区。

1.5 顾客端蛋糕详情体验

- 顾客首页当前阶段只展示蛋糕商品卡，卡片点击进入详情，不在卡片角落额外放置快捷加购图标。
- 商品详情默认使用"底部上拉半屏层"呈现，顶部需保留一段被压暗的原页面露出区，遮罩颜色应偏暖灰或暖棕，避免纯黑遮挡过硬。
- 半屏详情层只承担展示职责，用户在详情区域内上滑后进入独立详情页；半屏态不显示底部购买操作区。
- 独立详情页继续承接完整详情内容与固定底部操作区：首页、购物车为图标型入口；加入购物车、立即购买为主次分明的实体按钮。

2. 动画规范

Float (漂浮)：@keyframes float，上下位移 12px，周期 4s。

Pulse (呼吸)：用于蛋糕蜡烛火苗，周期 1.5s。

Materialize (实体化展开)：用于欢迎页 CTA 按钮，从中心向两侧展开并逐渐清晰，建议时长 360ms 到 480ms。

Reveal (圆形转场)：点击"进入主页"后，以屏幕中心为原点向外扩散显示主页内容，需带柔和 easing，并叠加少量粒子拖尾，避免生硬切页。

Lift Sheet (详情上拉)：用于商品详情半屏层，从底部上移进入，建议时长 280ms 到 360ms，禁止出现生硬的线性位移动画。

Detail Expand (详情展开)：用于半屏详情页进入独立详情页，触发条件为在详情区域内继续上滑；需保留拖拽连续感，避免切成完全无关的第二套动效。

3. 开发约束

适配：必须使用 rpx 或 vw。

组件：UI 优先使用 TDesign，但核心视觉页面需手工编写以保证 100% 还原。

4. 微信小程序实现约束

4.1 长页面渐变

复杂渐变不能直接挂在全局 `page` 背景上，长内容页面必须拆成"固定背景层 + 内容层"结构，否则滚动时会出现背景衔接断层。

4.2 TDesign 图标策略

当前工程稳定基线不依赖 TDesign 字体图标。首屏或关键路径页面应避免把视觉成立建立在 `t-icon` 上；使用带默认 icon 的组件时，如果该图标不是必须项，应显式关闭对应 icon 属性。

4.3 微信开发者工具兼容基线

本项目以微信开发者工具 `2.01.2510280` 为校验基线。引入或升级 `miniprogram_npm` 依赖后，必须确认 `App/project.config.json` 中 `setting.es6 = true`，否则真机调试可能无法解析依赖产物。

4.4 第三方包补丁

若为 TDesign 做兼容性补丁，必须同时修改源包和生成包对应文件；只改一侧会在"构建 npm"后丢失修复结果。

4.5 欢迎页动画策略

欢迎页核心动效优先使用 WXML/WXSS/TS 状态驱动实现，不再把 Lottie 作为首屏品牌动画的主路径依赖。

4.6 商品详情状态一致性

半屏详情态与独立详情页必须共享同一份商品内容上下文；独立详情页独占规格状态与底部操作语义，禁止出现两套详情信息割裂或按钮行为不一致的情况。

4.7 TDesign Button CSS 变量定制规范

通过 `t-class` 在外部传入自定义类名，再在该类名上设置 TDesign CSS 变量，是定制按钮样式的**唯一正确方式**。禁止使用 `.t-button--outline` 等内部选择器在组件外部强行覆盖。

各 variant 对应的变量前缀映射如下（以 `theme="default"` 为例）：

| variant | 颜色 | 背景 | 边框 |
|---|---|---|---|
| （无/default） | `--td-button-default-color` | `--td-button-default-bg-color` | `--td-button-default-border-color` |
| `outline` | `--td-button-default-outline-color` | `--td-bg-color-container`（容器级） | `--td-button-default-outline-border-color` |
| `text` | `--td-button-default-color` | 透明 | 无 |

`theme="primary"` 时前缀替换为 `--td-button-primary-*`，`variant="outline"` 时为 `--td-button-primary-outline-*`，余类推。

定制前必须在 `miniprogram_npm/tdesign-miniprogram/button/button.wxss` 中搜索确认变量名，不得凭记忆推断。

4.8 详情页底栏布局规范

底部固定操作栏采用"导航入口 + 操作按钮"两组结构时，布局方案如下：

- **整体容器**：使用 `display: flex; align-items: stretch` 而非固定列宽的 `grid`，避免不同屏宽下溢出。
- **导航入口**：使用纯 `<view>` 实现（非 `<t-button>`），设置固定宽高，`flex: none`。
- **操作按钮组**：使用 `<t-button>` + `flex: 1`，让操作区自适应剩余空间。
- **高度统一**：导航格子与操作按钮必须显式设置相同高度值。
