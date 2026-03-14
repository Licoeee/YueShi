# Phase 3 UI Stability Hotfix Plan

## 目标

修复顾客端详情页底栏重叠、首页与购物车顶部安全区侵入、三端 TabBar 视觉统一、图片加载失败噪音日志与占位体验问题，且不改变既有业务跳转与状态语义。

## 根因定位

1. 顶部遮挡根因：
- `customer-home-scene` 和 `customer-cart-scene` 在 `role-page-scene` 中以业务组件直出，绕过了 `role-page__content` 的顶部安全区 padding。

2. 图片加载报错根因：
- 顾客蛋糕 mock 图全部指向 `https://example.invalid/*`，域名不可达，开发者工具持续报 `ERR_CONNECTION_CLOSED`。

3. 详情页底栏重叠根因：
- 详情页底栏固定为单行四列栅格，窄屏与安全区组合下按钮横向挤压，造成视觉重叠与点击区域不稳定。

4. TabBar 样式不符合新规范根因：
- 当前 `custom-tab-bar` 仅渲染文本标签，没有图标层和纵向结构，也缺少选中/未选中图标状态区分。

## 实施步骤

### Step 1: TabBar 结构升级（统一三端）
- 修改 `role-tabbar.ts`：为每个 Tab 增加 icon key。
- 修改 `custom-tab-bar.wxml`：改为“图标容器在上 + 文本在下”的单 item 结构。
- 修改 `custom-tab-bar.wxss`：统一尺寸、纵向排布、选中/未选中颜色、点击区域和底部安全区。

### Step 2: 顶部安全区修复
- 修改 `role-page-scene.wxml/.wxss`：为 customer 业务场景新增统一顶端安全区壳层，避免侵入状态栏/灵动岛/胶囊区域。
- 保持 admin/merchant 既有 `role-page__content` 逻辑不变，避免回归。

### Step 3: 详情页底栏重叠修复
- 修改 `customer-product-detail.wxml/.wxss`：
- 将底栏改为“左侧导航组 + 右侧动作组”双组布局。
- 限制按钮最小宽度与容器伸缩策略，增强窄屏稳定性。
- 统一底部 `safe-area-inset-bottom` 与高度策略。

### Step 4: 图像源与失败占位修复
- 新增本地占位图资源（可打包随小程序发布）。
- 修改 `customer-cakes.ts`：将不可达域名替换为本地图源，彻底消除网络层报错。
- 在首页与详情图关键位补充 `bind:error` 失败兜底，将异常图片回退到本地占位图。

### Step 5: 视觉可读性增强（保持品牌风格）
- 修改 `customer-home-scene.wxss` 与 `customer-cart-scene.wxss`：
- 强化文本与背景对比度。
- 提升卡片边界和阴影层次，避免“颜色看不清”。
- 保持暖粉/日落橙视觉体系，不切换风格。

### Step 6: 回归验证
- 更新受影响的结构测试（tabbar 与布局结构断言）。
- 执行：
  - `npx --prefix App tsc -p App/tsconfig.json --noEmit`
  - `npm --prefix App run test`
- 输出微信开发者工具 `2.01.2510280` 手工补测路径与预期。

## 风险与控制

1. 风险：TabBar 结构变化影响 scene 模式切换反馈。
- 控制：不改动 `custom-tab-bar.ts` 的切换状态机与限流逻辑，只改渲染层。

2. 风险：图片兜底处理引入额外 setData 开销。
- 控制：只在 error 事件触发时更新单项字段，避免初始化全量 patch。

3. 风险：顶部安全区统一壳层导致垂直空间变大。
- 控制：仅作用于 customer 业务场景，不影响 admin/merchant 占位场景。
