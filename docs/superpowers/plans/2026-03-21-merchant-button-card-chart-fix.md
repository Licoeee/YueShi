# Merchant Button Card Chart Fix Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 修复商家端按钮系统可见性、商品卡底部动作区偏移、订单管理卡片缺少照片、账本折线图显示与交互不完整的问题，并保持既有商家链路不回退。

**Architecture:** 先用系统化调试结果锁定四个根因：按钮系统 token 分散且 outline 背景过白、商品卡底部动作区仍直接依赖 `t-button` 宿主盒模型、订单卡片仍沿用旧的纯文本结构、账本图表把坐标轴和绘图区塞进同一裁剪容器。实现上采用“共享 merchant button 视觉规则 + 商品卡 action shell + 订单卡三段式骨架 + 图表 shell/plot/detail 分层”四块收敛，测试先覆盖结构和行为，再写最小实现通过。

**Tech Stack:** 微信小程序、TypeScript 严格模式、TDesign Miniprogram、Node `node:test`、微信开发者工具 `2.01.2510280`

---

## Chunk 1: 按钮系统与根因回归测试

### Task 1: 为商家端按钮系统补失败测试

**Files:**
- Modify: `App/tests/merchant-products-scene.test.ts`
- Modify: `App/tests/merchant-orders-scene.test.ts`
- Modify: `App/tests/merchant-account-book-scene.test.ts`
- Inspect: `App/miniprogram/components/merchant-products-scene/merchant-products-scene.wxss`
- Inspect: `App/miniprogram/components/merchant-orders-scene/merchant-orders-scene.wxss`
- Inspect: `App/miniprogram/components/merchant-account-book-scene/merchant-account-book-scene.wxss`

- [ ] **Step 1: 写失败测试，约束主要按钮必须具备明确填充/边界 token**

```ts
test('merchant pages use consistent visible button tokens instead of white outline defaults', () => {
  const productsWxss = readWorkspaceFile('App/miniprogram/components/merchant-products-scene/merchant-products-scene.wxss')
  const ordersWxss = readWorkspaceFile('App/miniprogram/components/merchant-orders-scene/merchant-orders-scene.wxss')
  const accountWxss = readWorkspaceFile('App/miniprogram/components/merchant-account-book-scene/merchant-account-book-scene.wxss')

  assert.match(productsWxss, /merchant-button-token/)
  assert.match(ordersWxss, /merchant-button-token/)
  assert.match(accountWxss, /merchant-button-token/)
})
```

- [ ] **Step 2: 运行定向测试，确认当前失败**

Run: `npm test -- merchant-products-scene merchant-orders-scene merchant-account-book-scene`
Expected: FAIL，现有页面还没有统一 merchant button token 结构

- [ ] **Step 3: 校正测试失败原因**

Run: `npm test -- merchant-products-scene merchant-orders-scene merchant-account-book-scene`
Expected: FAIL 原因直接对应“按钮系统未统一”，而不是无关拼写或路径错误

## Chunk 2: 商品卡动作区稳定化

### Task 2: 为商品卡底部动作区建立稳定结构测试

**Files:**
- Modify: `App/tests/merchant-products-scene.test.ts`
- Inspect: `App/miniprogram/components/merchant-products-scene/merchant-products-scene.wxml`
- Inspect: `App/miniprogram/components/merchant-products-scene/merchant-products-scene.wxss`

- [ ] **Step 1: 写失败测试，约束商品卡按钮区采用独立 wrapper + action shell**

```ts
test('merchant product cards keep edit delete actions in a dedicated stable action rail', () => {
  const wxml = readWorkspaceFile('App/miniprogram/components/merchant-products-scene/merchant-products-scene.wxml')
  const wxss = readWorkspaceFile('App/miniprogram/components/merchant-products-scene/merchant-products-scene.wxss')

  assert.match(wxml, /merchant-products-scene__card-actions/)
  assert.match(wxml, /merchant-products-scene__card-action-cell/)
  assert.match(wxml, /merchant-products-scene__card-action-shell/)
  assert.match(wxss, /\.merchant-products-scene__card-actions/)
  assert.match(wxss, /\.merchant-products-scene__card-action-cell/)
  assert.match(wxss, /\.merchant-products-scene__card-action-shell/)
})
```

- [ ] **Step 2: 运行测试，确认当前失败**

Run: `npm test -- merchant-products-scene`
Expected: FAIL，当前卡片底部仍直接用 `t-button` 参与网格布局

- [ ] **Step 3: 最小实现**

实现要点：
- 维持双列瀑布流列容器不变，不回退商品流结构
- 单卡改成“图片 / 内容 / 动作区”纵向结构，动作区始终处于卡片底部
- `编辑 / 删除` 变为独立 wrapper cell 内的 action shell，不再让 `t-button` 直接决定底部布局稳定性
- 批量勾选入口继续保留现有圆形勾选控件，不影响卡片宽度收缩

- [ ] **Step 4: 运行测试验证通过**

Run: `npm test -- merchant-products-scene`
Expected: PASS，且现有瀑布流、批量编辑、回收站相关断言继续通过

## Chunk 3: 订单卡片重排与图片承载

### Task 3: 为订单管理卡片新增图片与三段式结构测试

**Files:**
- Modify: `App/tests/merchant-orders-scene.test.ts`
- Modify: `App/miniprogram/components/merchant-orders-scene/merchant-orders-scene.wxml`
- Modify: `App/miniprogram/components/merchant-orders-scene/merchant-orders-scene.wxss`
- Modify: `App/miniprogram/components/merchant-orders-scene/merchant-orders-scene.ts`

- [ ] **Step 1: 写失败测试，约束订单卡结构与图片字段映射**

```ts
test('merchant orders scene renders cover image copy block and tag stack', () => {
  const wxml = readWorkspaceFile('App/miniprogram/components/merchant-orders-scene/merchant-orders-scene.wxml')
  const source = readWorkspaceFile('App/miniprogram/components/merchant-orders-scene/merchant-orders-scene.ts')

  assert.match(wxml, /merchant-orders-scene__cover-shell/)
  assert.match(wxml, /merchant-orders-scene__card-copy/)
  assert.match(wxml, /merchant-orders-scene__tag-stack/)
  assert.match(wxml, /coverImageUrl/)
  assert.match(source, /coverImageUrl/)
})
```

- [ ] **Step 2: 运行测试，确认当前失败**

Run: `npm test -- merchant-orders-scene`
Expected: FAIL，当前订单卡没有图片位和新的 display 映射字段

- [ ] **Step 3: 最小实现**

实现要点：
- 在 merchant order display record 上补 `coverImageUrl`，必要时补 `itemQuantitySummary`
- 复用订单项快照里的封面图，兜底到顾客端图片 fallback
- 卡片结构改为“左图 / 中央文案 / 右侧标签”三段式，元信息区单独落在卡片下半部分
- 长订单号、长商品名、长手机号都显式加 `min-width: 0` 和收缩策略

- [ ] **Step 4: 运行测试验证通过**

Run: `npm test -- merchant-orders-scene`
Expected: PASS

## Chunk 4: 账本图表容器重建

### Task 4: 为账本图表 shell、坐标轴和点选详情补失败测试

**Files:**
- Modify: `App/tests/merchant-account-book-scene.test.ts`
- Modify: `App/miniprogram/components/merchant-account-book-scene/merchant-account-book-scene.wxml`
- Modify: `App/miniprogram/components/merchant-account-book-scene/merchant-account-book-scene.wxss`
- Modify: `App/miniprogram/components/merchant-account-book-scene/merchant-account-book-scene.ts`

- [ ] **Step 1: 写失败测试，约束图表结构与交互**

```ts
test('merchant account book scene separates chart shell axes plot and point detail', () => {
  const wxml = readWorkspaceFile('App/miniprogram/components/merchant-account-book-scene/merchant-account-book-scene.wxml')
  const source = readWorkspaceFile('App/miniprogram/components/merchant-account-book-scene/merchant-account-book-scene.ts')

  assert.match(wxml, /merchant-account-book-scene__chart-shell/)
  assert.match(wxml, /merchant-account-book-scene__plot/)
  assert.match(wxml, /merchant-account-book-scene__y-axis/)
  assert.match(wxml, /merchant-account-book-scene__x-axis/)
  assert.match(wxml, /bindtap="handleChartPointTap"/)
  assert.match(wxml, /merchant-account-book-scene__point-detail/)
  assert.match(source, /selectedPointKey/)
})
```

- [ ] **Step 2: 运行测试，确认当前失败**

Run: `npm test -- merchant-account-book-scene`
Expected: FAIL，当前结构没有独立图表壳层，也没有点选明细状态

- [ ] **Step 3: 最小实现**

实现要点：
- 图表拆成 `chart-shell / chart-grid / plot / x-axis / legend / point-detail`
- 取消靠负偏移塞坐标轴的做法，所有坐标轴都进入正常布局流
- 收入和支出保留两条线，点位可点，选中后在图表下方显示 detail card
- 顺手修正 `merchant-account-book-scene.ts` 现有 `chartMax/chartMid/xLabels` 类型与字段错误

- [ ] **Step 4: 运行测试验证通过**

Run: `npm test -- merchant-account-book-scene`
Expected: PASS

## Chunk 5: 实现统一按钮 token 与页面落地

### Task 5: 把 merchant button token 落到商品、订单、账本、库存、风控页面

**Files:**
- Modify: `App/miniprogram/components/merchant-products-scene/merchant-products-scene.wxss`
- Modify: `App/miniprogram/components/merchant-orders-scene/merchant-orders-scene.wxss`
- Modify: `App/miniprogram/components/merchant-account-book-scene/merchant-account-book-scene.wxss`
- Modify: `App/miniprogram/components/merchant-inventory-scene/merchant-inventory-scene.wxss`
- Modify: `App/miniprogram/components/merchant-profile-scene/merchant-profile-scene.wxss`

- [ ] **Step 1: 写最小样式实现**

实现要点：
- 建立同名共享 token 片段，至少统一主按钮、浅填充描边按钮、危险按钮、禁用态
- 继续使用 `t-button` 的页面必须基于真实变量前缀设置：`--td-button-default-outline-*`、`--td-button-primary-*`、`--td-button-danger-outline-*`
- outline 类按钮补浅底、内高光和清晰边界，不再是白底融背景
- 不改无关布局，只收敛可见性和层级

- [ ] **Step 2: 运行定向测试**

Run: `npm test -- merchant-products-scene merchant-orders-scene merchant-account-book-scene`
Expected: PASS

## Chunk 6: 校验与回归

### Task 6: 跑测试、类型检查并准备微信补测清单

**Files:**
- Verify only: `App/tests/merchant-products-scene.test.ts`
- Verify only: `App/tests/merchant-orders-scene.test.ts`
- Verify only: `App/tests/merchant-account-book-scene.test.ts`
- Verify only: `App/miniprogram/components/merchant-*`

- [ ] **Step 1: 运行定向测试**

Run:
```bash
npm test -- merchant-products-scene
npm test -- merchant-orders-scene
npm test -- merchant-account-book-scene
```
Expected: PASS

- [ ] **Step 2: 运行类型检查**

Run: `npx tsc --noEmit`
Expected: 至少修掉 `merchant-account-book-scene.ts` 当前已知错误；若仍有失败，必须明确是否为本轮无关残留

- [ ] **Step 3: 运行全量测试**

Run: `npm test`
Expected: PASS；若失败，回到对应 chunk 修复

- [ ] **Step 4: 微信开发者工具补测准备**

补测项：
- 商品管理双列瀑布流下，任意商品卡的 `编辑 / 删除` 始终作为整体贴在卡片底部
- 商家端主要按钮在浅背景上边界清晰，禁用态可见且不可点击
- 订单管理卡片左侧图片、右侧标签、下方元信息在长文案下仍不重叠
- 账本图表完整显示横纵坐标，点击收入/支出点位后能看到详细信息

- [ ] **Step 5: 清理临时打印并整理风险**

交付说明必须包含：
- 按钮白底融背景的真实原因
- 商品卡动作区反复偏移的真实原因
- 账本图表此前显示不全的真实原因
- 需要大帅在微信开发者工具 `2.01.2510280` 执行的“操作步骤 + 预期效果”
