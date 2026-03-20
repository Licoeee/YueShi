# 顾客端删除订单与回收站 UI 合规收口 Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在保持既有删除/回收站链路不回退的前提下，完成入口层级、回收站垃圾桶语义与恢复按钮样式的规范化落地。

**Architecture:** 不重构订单数据层；仅调整顾客“我的”页入口组织与回收站页面 UI 表达。继续复用现有 `customer-order-recycle` 工具和仓储能力，通过 TDesign 按钮变量做样式收口，并补齐对应断言。

**Tech Stack:** 微信小程序 TypeScript、TDesign 小程序组件、tsx 测试。

---

### Task 1: 锁定新增验收点（测试先行）

**Files:**
- Modify: `App/tests/customer-profile-scene.test.ts`
- Modify: `App/tests/customer-order-recycle-page.test.ts`

- [ ] **Step 1: 增加失败测试（入口独立区块 / 垃圾桶语义 / 恢复按钮样式变量）**
- [ ] **Step 2: 运行测试确认先失败**

Run: `npm run test:file -- tests/customer-profile-scene.test.ts tests/customer-order-recycle-page.test.ts`
Expected: FAIL

### Task 2: “我的”页删除入口改为独立一栏

**Files:**
- Modify: `App/miniprogram/components/customer-profile-scene/customer-profile-scene.wxml`
- Modify: `App/miniprogram/components/customer-profile-scene/customer-profile-scene.wxss`

- [ ] **Step 1: 从“本地账号说明”移除删除入口**
- [ ] **Step 2: 新增独立删除订单区块（含独立标题、说明、入口按钮）**
- [ ] **Step 3: 入口文案改为“删除订单”并保持跳转路径不变**

### Task 3: 回收站页面补垃圾桶语义与按钮样式合规

**Files:**
- Modify: `App/miniprogram/pages/customer/order-recycle/order-recycle.wxml`
- Modify: `App/miniprogram/pages/customer/order-recycle/order-recycle.wxss`
- Modify: `App/miniprogram/pages/customer/order-recycle/order-recycle.ts`
- Modify: `App/miniprogram/pages/customer/order-recycle/order-recycle.json`

- [ ] **Step 1: 增加“垃圾桶/回收站”语义头部（不使用 `t-icon`）**
- [ ] **Step 2: 恢复按钮改为明确 TDesign 按钮样式（含常态/按下态/禁用态变量）**
- [ ] **Step 3: 核对按钮变量前缀与 `miniprogram_npm` 一致**

### Task 4: 回归验证

**Files:**
- Test: `App/tests/customer-profile-scene.test.ts`
- Test: `App/tests/customer-order-recycle-page.test.ts`
- Test: `App/tests/customer-order-repository.test.ts`
- Test: `App/tests/customer-orders-scene.test.ts`
- Test: `App/tests/customer-order-detail-page.test.ts`

- [ ] **Step 1: 运行目标测试确认通过**

Run:
`npm run test:file -- tests/customer-profile-scene.test.ts tests/customer-order-recycle-page.test.ts tests/customer-order-repository.test.ts tests/customer-orders-scene.test.ts tests/customer-order-detail-page.test.ts`
Expected: PASS

- [ ] **Step 2: 运行全量测试确认无回归**

Run: `npm test`
Expected: PASS

- [ ] **Step 3: 输出微信开发者工具 2.01.2510280 补测步骤与预期**
