# Merchant Products Orders Search Status Cleanup Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在不破坏既有商家端功能的前提下，完成商品页顶部操作区重排、批量编辑阶段状态机、商品/订单搜索、订单状态 Tab 与状态流转、已完成订单自动清理，以及商家按钮系统统一。

**Architecture:** 先用失败测试锁定结构与数据流约束，再分别收敛商品页状态机、订单页过滤管线和商家订单管理 helper。按钮系统沿用 TDesign 按钮变量真实前缀做统一 token，商品卡底部动作区继续保留自定义 action shell 例外，避免再次被 `t-button` 盒模型扰乱双列卡片布局。

**Tech Stack:** 微信小程序、TypeScript 严格模式、TDesign Miniprogram、Node `node:test`、微信开发者工具 `2.01.2510280`

---

## Chunk 1: 失败测试与数据流约束

### Task 1: 为商品页两行操作区、搜索和阶段状态机补失败测试

**Files:**
- Modify: `App/tests/merchant-products-scene.test.ts`
- Inspect: `App/miniprogram/components/merchant-products-scene/merchant-products-scene.wxml`
- Inspect: `App/miniprogram/components/merchant-products-scene/merchant-products-scene.ts`
- Inspect: `App/miniprogram/components/merchant-products-scene/merchant-products-scene.wxss`

- [ ] **Step 1: 写失败测试，约束商品页两行操作区与搜索输入存在**

```ts
test('merchant products scene exposes two action rows and a search input', () => {
  const wxml = readWorkspaceFile('App/miniprogram/components/merchant-products-scene/merchant-products-scene.wxml')

  assert.match(wxml, /merchant-products-scene__action-grid/)
  assert.match(wxml, /merchant-products-scene__action-row--primary/)
  assert.match(wxml, /merchant-products-scene__action-row--secondary/)
  assert.match(wxml, /placeholder="搜索商品名称、ID、规格"/)
})
```

- [ ] **Step 2: 写失败测试，约束批量编辑使用阶段状态而不是单布尔态**

```ts
test('merchant products scene uses a multi-phase batch edit state machine', () => {
  const source = readWorkspaceFile('App/miniprogram/components/merchant-products-scene/merchant-products-scene.ts')

  assert.match(source, /type BatchEditPhase = 'idle' \| 'selecting' \| 'editing'/)
  assert.match(source, /batchEditPhase/)
  assert.match(source, /handleBatchEditTrigger/)
  assert.match(source, /handleExitBatchEdit/)
})
```

- [ ] **Step 3: 运行定向测试，确认当前失败**

Run: `npx tsx --test tests/merchant-products-scene.test.ts`
Expected: FAIL，当前实现仍是单行按钮和 `batchEditMode` 布尔态

### Task 2: 为订单页状态 Tab、搜索、自动清理入口补失败测试

**Files:**
- Modify: `App/tests/merchant-orders-scene.test.ts`
- Inspect: `App/miniprogram/components/merchant-orders-scene/merchant-orders-scene.wxml`
- Inspect: `App/miniprogram/components/merchant-orders-scene/merchant-orders-scene.ts`
- Inspect: `App/miniprogram/components/merchant-orders-scene/merchant-orders-scene.wxss`

- [ ] **Step 1: 写失败测试，约束订单页存在状态 Tab、搜索输入和自动清理入口**

```ts
test('merchant orders scene includes status tabs search and auto cleanup entry', () => {
  const wxml = readWorkspaceFile('App/miniprogram/components/merchant-orders-scene/merchant-orders-scene.wxml')

  assert.match(wxml, /待确认/)
  assert.match(wxml, /待制作/)
  assert.match(wxml, /待取货/)
  assert.match(wxml, /已完成/)
  assert.match(wxml, /placeholder="搜索订单号、手机号、商品名称"/)
  assert.match(wxml, /定时自动清空记录/)
})
```

- [ ] **Step 2: 写失败测试，约束订单状态流转动作与删除动作存在**

```ts
test('merchant orders scene renders merchant status actions and completed delete action', () => {
  const wxml = readWorkspaceFile('App/miniprogram/components/merchant-orders-scene/merchant-orders-scene.wxml')
  const source = readWorkspaceFile('App/miniprogram/components/merchant-orders-scene/merchant-orders-scene.ts')

  assert.match(wxml, /确认付款/)
  assert.match(wxml, /制作完成/)
  assert.match(wxml, /已取货/)
  assert.match(wxml, /删除订单/)
  assert.match(source, /activeStatusTab/)
  assert.match(source, /orderSearchKeyword/)
})
```

- [ ] **Step 3: 运行定向测试，确认当前失败**

Run: `npx tsx --test tests/merchant-orders-scene.test.ts`
Expected: FAIL，当前订单页没有状态 Tab、搜索和自动清理入口

### Task 3: 为商家订单管理 helper 补失败测试

**Files:**
- Create: `App/tests/merchant-order-management.test.ts`
- Create: `App/miniprogram/utils/merchant-order-management.ts`
- Inspect: `App/miniprogram/utils/customer-order-storage.ts`
- Inspect: `App/types/order.d.ts`

- [ ] **Step 1: 写失败测试，约束状态流转、已完成删除和自动清理行为**

```ts
test('merchant order management updates status and timestamp through dedicated helpers', () => {
  assert.equal(typeof updateMerchantOrderStatus, 'function')
})

test('merchant order management only deletes completed orders', () => {
  assert.equal(typeof deleteCompletedMerchantOrder, 'function')
})

test('merchant order management purges expired completed orders by configured days', () => {
  assert.equal(typeof purgeExpiredCompletedMerchantOrders, 'function')
})
```

- [ ] **Step 2: 运行定向测试，确认当前失败**

Run: `npx tsx --test tests/merchant-order-management.test.ts`
Expected: FAIL，helper 文件尚不存在

## Chunk 2: 商品页状态机与搜索实现

### Task 4: 实现商品页两行操作区、搜索链路和批量编辑阶段状态机

**Files:**
- Modify: `App/miniprogram/components/merchant-products-scene/merchant-products-scene.ts`
- Modify: `App/miniprogram/components/merchant-products-scene/merchant-products-scene.wxml`
- Modify: `App/miniprogram/components/merchant-products-scene/merchant-products-scene.wxss`

- [ ] **Step 1: 增加商品搜索状态与过滤函数**

实现要点：
- 引入 `productSearchKeyword`
- 新增 `filterProductsByKeyword()`，覆盖 `id / title / description / specSummary / creamLabel`
- 把 `syncProducts()` 改成“原始商品 -> 搜索过滤 -> 瀑布流分列”

- [ ] **Step 2: 用 `batchEditPhase` 替换 `batchEditMode`**

实现要点：
- 新增 `type BatchEditPhase = 'idle' | 'selecting' | 'editing'`
- `idle -> selecting`：首次点“批量编辑”
- `selecting` 再点“批量编辑”：
  - 已选商品：打开弹窗并置为 `editing`
  - 未选商品：toast 提示
- “退出编辑”统一回到 `idle` 并清空选择

- [ ] **Step 3: 把顶部操作区改成两行**

实现要点：
- 第一行：新增商品、回收站
- 第二行：批量编辑、退出编辑
- 状态提示文案必须明确当前阶段和已选数量
- 保持手机宽度下不挤压、不换成异常三列

- [ ] **Step 4: 运行商品页定向测试**

Run: `npx tsx --test tests/merchant-products-scene.test.ts`
Expected: PASS

## Chunk 3: 商家按钮系统统一

### Task 5: 抽取 merchant 按钮 token，统一主次按钮高光和禁用态

**Files:**
- Modify: `App/miniprogram/components/merchant-products-scene/merchant-products-scene.wxss`
- Modify: `App/miniprogram/components/merchant-orders-scene/merchant-orders-scene.wxss`
- Modify: `App/miniprogram/components/merchant-account-book-scene/merchant-account-book-scene.wxss`
- Modify: `App/miniprogram/components/merchant-inventory-scene/merchant-inventory-scene.wxss`
- Modify: `App/miniprogram/components/merchant-profile-scene/merchant-profile-scene.wxss`
- Inspect: `App/miniprogram/miniprogram_npm/tdesign-miniprogram/button/button.wxss`

- [ ] **Step 1: 基于真实变量前缀统一按钮 token**

实现要点：
- `theme="primary"` 使用 `--td-button-primary-*`
- `theme="default" variant="outline"` 使用 `--td-button-default-outline-*`
- `theme="danger" variant="outline"` 使用 `--td-button-danger-outline-*`
- outline 背景继续通过 `--td-bg-color-container` 控制，不让按钮再融进背景

- [ ] **Step 2: 把 token 同步到 merchant 主要页面**

实现要点：
- 只统一视觉和禁用态，不做无关重排
- 商品卡底部动作区继续沿用 action shell，不强行改回 `t-button`

- [ ] **Step 3: 运行相关结构测试**

Run:
```bash
npx tsx --test tests/merchant-products-scene.test.ts
npx tsx --test tests/merchant-orders-scene.test.ts
```
Expected: PASS

## Chunk 4: 商家订单管理 helper

### Task 6: 新建商家订单管理工具，沉淀状态流转与自动清理逻辑

**Files:**
- Create: `App/miniprogram/utils/merchant-order-management.ts`
- Create: `App/tests/merchant-order-management.test.ts`
- Modify: `App/tests/customer-order-repository.test.ts`（如需补共享快照兼容断言）

- [ ] **Step 1: 实现自动清理配置读写**

实现要点：
- 新增 `MERCHANT_ORDER_AUTO_CLEANUP_KEY`
- 提供 `loadMerchantOrderAutoCleanupDays()` / `saveMerchantOrderAutoCleanupDays()`
- 配置支持 `0 | 3 | 7 | 15 | 30`

- [ ] **Step 2: 实现商家订单状态流转 helper**

实现要点：
- `updateMerchantOrderStatus(storage, orderId, nextStatus)`
- 只允许合法迁移：
  - `pending-payment|paid -> in-production`
  - `in-production -> ready-for-pickup`
  - `ready-for-pickup -> completed`
- 同步刷新 `updatedAt`

- [ ] **Step 3: 实现已完成删除与自动清理 helper**

实现要点：
- `deleteCompletedMerchantOrder(storage, orderId)`
- `purgeExpiredCompletedMerchantOrders(orders, days, now)`
- 手动删除与自动清理共用同一删除链路

- [ ] **Step 4: 运行 helper 定向测试**

Run: `npx tsx --test tests/merchant-order-management.test.ts`
Expected: PASS

## Chunk 5: 订单页状态 Tab、搜索、日期并排与自动清理入口

### Task 7: 改造订单页过滤管线与动作区

**Files:**
- Modify: `App/miniprogram/components/merchant-orders-scene/merchant-orders-scene.ts`
- Modify: `App/miniprogram/components/merchant-orders-scene/merchant-orders-scene.wxml`
- Modify: `App/miniprogram/components/merchant-orders-scene/merchant-orders-scene.wxss`
- Modify: `App/miniprogram/components/merchant-orders-scene/merchant-orders-scene.json`
- Modify: `App/tests/merchant-orders-scene.test.ts`

- [ ] **Step 1: 引入统一过滤函数**

实现要点：
- 新增 `activeStatusTab`
- 新增 `orderSearchKeyword`
- 把 `visibleOrders` 替换为“原始订单 -> 自动清理 -> 日期 -> 搜索 -> Tab”的统一结果

- [ ] **Step 2: 实现状态 Tab 与搜索输入**

实现要点：
- Tab 使用当前项目暖色胶囊分段风格
- 搜索范围覆盖 `id / contact.phone / itemSummary / note`
- 搜索与日期筛选、Tab 切换叠加时结果必须一致

- [ ] **Step 3: 保持“选择日期 / 清除筛选”同排稳定**

实现要点：
- 固定两按钮为同排双列
- 控制最小宽度和高度，避免因为新布局挤压变形

- [ ] **Step 4: 增加自动清理设置入口与弹层**

实现要点：
- 入口命名：`定时自动清空记录`
- 弹层里展示可选时长
- 保存后立即触发重新清理并刷新列表

- [ ] **Step 5: 运行订单页定向测试**

Run: `npx tsx --test tests/merchant-orders-scene.test.ts`
Expected: PASS

## Chunk 6: 订单状态流转动作落地

### Task 8: 接入订单卡动作按钮与状态更新

**Files:**
- Modify: `App/miniprogram/components/merchant-orders-scene/merchant-orders-scene.ts`
- Modify: `App/miniprogram/components/merchant-orders-scene/merchant-orders-scene.wxml`
- Modify: `App/miniprogram/components/merchant-orders-scene/merchant-orders-scene.wxss`
- Modify: `App/miniprogram/utils/merchant-order-management.ts`

- [ ] **Step 1: 为不同 Tab 渲染对应动作按钮**

实现要点：
- 待确认：`确认付款`
- 待制作：`制作完成`
- 待取货：`已取货`
- 已完成：`删除订单`

- [ ] **Step 2: 接入点击链路**

实现要点：
- 状态按钮调用商家 helper
- 删除按钮仅对 completed 可见，并直接走 completed 删除 helper
- 成功后重新 `syncOrders()`

- [ ] **Step 3: 覆盖极限内容与空态**

实现要点：
- 长订单号、长商品名、长手机号下卡片不重叠
- 空搜索、无结果、某个 Tab 无数据时有明确空态

- [ ] **Step 4: 运行订单管理定向测试**

Run:
```bash
npx tsx --test tests/merchant-order-management.test.ts
npx tsx --test tests/merchant-orders-scene.test.ts
```
Expected: PASS

## Chunk 7: 总体验证

### Task 9: 跑类型检查、全量测试并准备微信补测说明

**Files:**
- Verify only: `App/miniprogram/components/merchant-products-scene/*`
- Verify only: `App/miniprogram/components/merchant-orders-scene/*`
- Verify only: `App/miniprogram/utils/merchant-order-management.ts`
- Verify only: `App/tests/merchant-*.test.ts`

- [ ] **Step 1: 运行定向测试**

Run:
```bash
npx tsx --test tests/merchant-products-scene.test.ts
npx tsx --test tests/merchant-order-management.test.ts
npx tsx --test tests/merchant-orders-scene.test.ts
```
Expected: PASS

- [ ] **Step 2: 运行类型检查**

Run: `npx tsc --noEmit`
Expected: PASS

- [ ] **Step 3: 运行全量测试**

Run: `npm test`
Expected: PASS

- [ ] **Step 4: 整理微信开发者工具补测项**

补测必须覆盖：
- 商品页两行操作区在手机尺寸下稳定显示
- “批量编辑 -> 选商品 -> 再次点批量编辑 -> 进入批量修改”链路清晰
- 商品搜索不破坏瀑布流与勾选状态
- 订单页状态 Tab、日期筛选、搜索叠加后结果正确
- 订单状态流转按钮只在对应阶段出现
- 已完成订单手动删除与自动清理配置都能生效

- [ ] **Step 5: 清理临时打印并记录风险**

交付说明必须明确：
- 商家删除 completed 订单会同步影响当前本地顾客快照
- 自动清理依据 `updatedAt` 近似代表完成时间
- 若微信开发者工具真机层对 `t-calendar` 或弹层高度仍有差异，需要以补测结果为最终准绳
