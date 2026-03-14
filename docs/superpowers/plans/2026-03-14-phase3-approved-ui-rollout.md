# Phase 3 Approved UI Rollout Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将大帅已确认的浏览器草稿样式完整落地到小程序代码，不改动已有业务语义与跳转逻辑。

**Architecture:** 保持现有组件职责不变，仅升级渲染结构与样式层。TabBar 继续使用 `t-tab-bar`，但图标改为本地图标资源并统一纵向布局；半屏预览继续为展示态并补充图片放大查看；详情页底栏重排为双组布局防重叠。

**Tech Stack:** WeChat Mini Program (WXML/WXSS/TS), TDesign components, TypeScript strict mode, node:test + tsx.

---

## Task 1: 落地 TabBar 草稿样式与全角色图标（含商品库存）

**Files:**
- Create: `App/miniprogram/assets/icons/tab/*.svg`
- Modify: `App/miniprogram/utils/role-tabbar.ts`
- Modify: `App/miniprogram/components/custom-tab-bar/custom-tab-bar.wxml`
- Modify: `App/miniprogram/components/custom-tab-bar/custom-tab-bar.wxss`
- Test: `App/tests/role-tabbar.test.ts`
- Test: `App/tests/interaction-nowrap.test.ts`

- [ ] 将 role tab item 扩展为包含 active/inactive 图标路径（保留既有路径与 value 不变）。
- [ ] 为 customer / merchant / admin 所有 tab 配置图标，确保 merchant 的“商品库存”有独立 icon。
- [ ] 重写 custom tabbar 渲染结构为 icon 在上、文字在下。
- [ ] 按草稿调整 tabbar 容器高度、圆角、safe-area 与选中/未选中态颜色。
- [ ] 更新结构测试与样式测试断言。

## Task 2: 半屏预览层改为 2/3 高度并支持详情图放大

**Files:**
- Modify: `App/miniprogram/components/customer-product-sheet/customer-product-sheet.ts`
- Modify: `App/miniprogram/components/customer-product-sheet/customer-product-sheet.wxml`
- Modify: `App/miniprogram/components/customer-product-sheet/customer-product-sheet.wxss`
- Test: `App/tests/customer-home-scene.test.ts`

- [ ] 将半屏容器高度改为约 2/3 屏幕，并保持首页背景遮罩与上滑进入详情逻辑不变。
- [ ] 将预览区替换为可点击的详情图展示布局。
- [ ] 点击详情图时调用 `wx.previewImage` 打开大图预览。
- [ ] 保持展示态无购买按钮。

## Task 3: 详情页底部操作栏按草稿重排，彻底消除重叠

**Files:**
- Modify: `App/miniprogram/components/customer-product-detail/customer-product-detail.wxml`
- Modify: `App/miniprogram/components/customer-product-detail/customer-product-detail.wxss`
- Test: `App/tests/customer-product-detail-page.test.ts`

- [ ] 将底栏结构固定为“导航组 + 操作组”两列，避免按钮挤压重叠。
- [ ] 调整按钮尺寸、最小宽度、文字单行策略与安全区内边距。
- [ ] 保持四个动作语义不变：首页、购物车、加入购物车、立即购买。
- [ ] 更新结构断言保证后续不回退为单行重叠布局。

## Task 4: 回归验证

**Files:**
- Test run only

- [ ] 运行 `npx --prefix App tsc -p App/tsconfig.json --noEmit`
- [ ] 运行 `npm --prefix App run test`
- [ ] 输出微信开发者工具 `2.01.2510280` 的补测路径与预期。
