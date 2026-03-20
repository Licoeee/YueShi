# 顾客端删除订单登录门禁补丁 Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将顾客端“删除订单”操作与登录状态绑定，行为与“加入购物车/恢复订单”一致。

**Architecture:** 不调整订单数据结构，仅在订单详情删除确认动作层接入 `runCustomerAuthorizedAction`。保持删除资格判断、弹窗与页面跳转不变。

**Tech Stack:** 微信小程序 TypeScript、TDesign、tsx 测试。

---

### Task 1: 测试先行锁定行为

**Files:**
- Modify: `App/tests/customer-order-detail-page.test.ts`

- [ ] **Step 1: 增加删除动作需调用登录门禁的失败测试**
- [ ] **Step 2: 运行单测确认失败**

Run: `npm run test:file -- tests/customer-order-detail-page.test.ts`
Expected: FAIL

### Task 2: 删除动作接入登录门禁

**Files:**
- Modify: `App/miniprogram/pages/customer/order-detail/order-detail.ts`

- [ ] **Step 1: 引入并调用 `runCustomerAuthorizedAction` 包裹删除逻辑**
- [ ] **Step 2: 未授权时给出“请先完成微信登录”提示**

### Task 3: 回归验证

**Files:**
- Test: `App/tests/customer-order-detail-page.test.ts`
- Test: `App/tests/customer-order-repository.test.ts`

- [ ] **Step 1: 运行目标测试**

Run: `npm run test:file -- tests/customer-order-detail-page.test.ts tests/customer-order-repository.test.ts`
Expected: PASS
