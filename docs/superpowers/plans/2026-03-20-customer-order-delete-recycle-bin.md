# 顾客端订单删除与回收站 Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在不破坏现有订单链路的前提下，为顾客端提供“删除订单 + 回收站 7 天恢复”能力。

**Architecture:** 复用现有 `OrderRecord` 与本地订单存储，不新增独立订单模型。通过给订单追加顾客删除元数据，区分“常规订单视图”和“回收站视图”，并在读取阶段执行 7 天过期清理。删除/恢复动作收敛到仓储层，页面仅消费已过滤数据。

**Tech Stack:** 微信小程序 (TypeScript 严格模式), TDesign 小程序组件, Node `tsx --test`。

---

### Task 1: 数据结构与仓储能力扩展

**Files:**
- Modify: `App/types/order.d.ts`
- Create: `App/miniprogram/utils/customer-order-recycle.ts`
- Modify: `App/miniprogram/utils/customer-order-repository.ts`
- Test: `App/tests/customer-order-repository.test.ts`

- [ ] **Step 1: 写失败测试（删除/恢复/7天过期清理）**

```ts
// customer-order-repository.test.ts
await assert.rejects(() => repository.deleteOrder('pending-order'))
const deleted = await repository.deleteOrder('done-order')
assert.equal(deleted.customerRecycleMeta !== undefined, true)
const restored = await repository.restoreDeletedOrder('done-order')
assert.equal(restored.customerRecycleMeta === undefined, true)
```

- [ ] **Step 2: 运行单测确认失败**

Run: `npm run test:file -- tests/customer-order-repository.test.ts`
Expected: FAIL（缺少 delete/restore 能力或断言不满足）

- [ ] **Step 3: 实现最小仓储能力**

```ts
interface CustomerOrderRepository {
  deleteOrder(orderId: string): Promise<OrderRecord>
  restoreDeletedOrder(orderId: string): Promise<OrderRecord>
}
```

- [ ] **Step 4: 运行单测确认通过**

Run: `npm run test:file -- tests/customer-order-repository.test.ts`
Expected: PASS

### Task 2: 顾客常规订单列表过滤“已删除订单”

**Files:**
- Modify: `App/miniprogram/components/customer-orders-scene/customer-orders-scene.ts`
- Test: `App/tests/customer-orders-scene.test.ts`

- [ ] **Step 1: 写失败测试（要求场景层使用回收站过滤）**
- [ ] **Step 2: 运行单测确认失败**

Run: `npm run test:file -- tests/customer-orders-scene.test.ts`
Expected: FAIL

- [ ] **Step 3: 实现过滤与过期清理回写**
- [ ] **Step 4: 运行单测确认通过**

Run: `npm run test:file -- tests/customer-orders-scene.test.ts`
Expected: PASS

### Task 3: 订单详情增加删除操作（仅已取消/已完成）

**Files:**
- Modify: `App/miniprogram/pages/customer/order-detail/order-detail.ts`
- Modify: `App/miniprogram/pages/customer/order-detail/order-detail.wxml`
- Test: `App/tests/customer-order-detail-page.test.ts`

- [ ] **Step 1: 写失败测试（删除按钮与删除对话框）**
- [ ] **Step 2: 运行单测确认失败**

Run: `npm run test:file -- tests/customer-order-detail-page.test.ts`
Expected: FAIL

- [ ] **Step 3: 实现删除入口 + 仓储调用 + 跳转回订单页**
- [ ] **Step 4: 运行单测确认通过**

Run: `npm run test:file -- tests/customer-order-detail-page.test.ts`
Expected: PASS

### Task 4: “我的”页新增删除订单查询入口

**Files:**
- Modify: `App/miniprogram/components/customer-profile-scene/customer-profile-scene.ts`
- Modify: `App/miniprogram/components/customer-profile-scene/customer-profile-scene.wxml`
- Test: `App/tests/customer-profile-scene.test.ts`

- [ ] **Step 1: 写失败测试（新增删除订单查询入口）**
- [ ] **Step 2: 运行单测确认失败**

Run: `npm run test:file -- tests/customer-profile-scene.test.ts`
Expected: FAIL

- [ ] **Step 3: 实现入口与跳转逻辑**
- [ ] **Step 4: 运行单测确认通过**

Run: `npm run test:file -- tests/customer-profile-scene.test.ts`
Expected: PASS

### Task 5: 新增顾客回收站页面（查看/恢复）

**Files:**
- Modify: `App/miniprogram/app.json`
- Create: `App/miniprogram/pages/customer/order-recycle/order-recycle.ts`
- Create: `App/miniprogram/pages/customer/order-recycle/order-recycle.wxml`
- Create: `App/miniprogram/pages/customer/order-recycle/order-recycle.wxss`
- Create: `App/miniprogram/pages/customer/order-recycle/order-recycle.json`
- Test: `App/tests/customer-order-recycle-page.test.ts`

- [ ] **Step 1: 写失败测试（路由注册、列表渲染、恢复按钮）**
- [ ] **Step 2: 运行单测确认失败**

Run: `npm run test:file -- tests/customer-order-recycle-page.test.ts`
Expected: FAIL

- [ ] **Step 3: 实现页面与恢复交互**
- [ ] **Step 4: 运行单测确认通过**

Run: `npm run test:file -- tests/customer-order-recycle-page.test.ts`
Expected: PASS

### Task 6: 回归验证（不宣称全量通过）

**Files:**
- Test: `App/tests/customer-order-repository.test.ts`
- Test: `App/tests/customer-orders-scene.test.ts`
- Test: `App/tests/customer-order-detail-page.test.ts`
- Test: `App/tests/customer-profile-scene.test.ts`
- Test: `App/tests/customer-order-recycle-page.test.ts`

- [ ] **Step 1: 运行本需求相关测试集合**

Run:
`npm run test:file -- tests/customer-order-repository.test.ts tests/customer-orders-scene.test.ts tests/customer-order-detail-page.test.ts tests/customer-profile-scene.test.ts tests/customer-order-recycle-page.test.ts`
Expected: PASS

- [ ] **Step 2: 记录无法在本地 CLI 覆盖的微信开发者工具补测项**

Run: N/A（人工）
Expected: 给出“操作步骤 + 预期效果”
