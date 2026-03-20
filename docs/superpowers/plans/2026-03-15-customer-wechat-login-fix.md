# 顾客端微信登录修复 Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 修复顾客端关键动作无法完成微信登录的问题，让加购、立即购买、去结算与提交订单在本地闭环下可实际测试。

**Architecture:** 将“关键动作登录态建立”和“头像昵称资料授权”解耦。关键动作只依赖 `wx.login` 建立顾客本地会话；顾客“我的”页登录按钮继续尝试补充用户资料，但资料获取失败时不再阻断登录成功。

**Tech Stack:** 微信小程序原生 API、TypeScript 严格模式、Node `tsx --test`

---

## Chunk 1: 登录根因修复

### Task 1: 为顾客登录会话补 failing tests

**Files:**
- Modify: `App/tests/customer-session-storage.test.ts`
- Create: `App/tests/customer-session.test.ts`

- [ ] **Step 1: 写失败测试，覆盖“资料授权失败但 wx.login 成功时仍可登录”**

- [ ] **Step 2: 运行 `npm run test:file -- tests/customer-session.test.ts`，确认新测试先失败**

### Task 2: 解耦关键动作登录与资料授权

**Files:**
- Modify: `App/miniprogram/utils/customer-session.ts`
- Modify: `App/miniprogram/utils/customer-action-gate.ts`

- [ ] **Step 1: 先保留现有会话结构，新增“快速登录”与“资料增强”分层逻辑**

- [ ] **Step 2: 让关键动作默认只依赖快速登录，不再因 `getUserProfile` 失败而返回 `null`**

- [ ] **Step 3: 让资料授权失败时回退默认昵称/头像空值，而不是整段登录失败**

- [ ] **Step 4: 运行 `npm run test:file -- tests/customer-session.test.ts tests/customer-action-gate.test.ts`，确认通过**

## Chunk 2: 顾客“我的”页微信登录承接

### Task 3: 让“我的”页继续支持资料增强但不阻断登录

**Files:**
- Modify: `App/miniprogram/components/customer-profile-scene/customer-profile-scene.ts`
- Modify: `App/miniprogram/components/customer-profile-scene/customer-profile-scene.wxml`
- Test: `App/tests/customer-profile-scene.test.ts`

- [ ] **Step 1: 写/补测试，约束“我的”页仍然保留微信登录入口**

- [ ] **Step 2: 调整按钮文案与调用逻辑，显式表达微信登录**

- [ ] **Step 3: 如果资料授权失败但快速登录成功，页面仍进入已登录态**

- [ ] **Step 4: 运行 `npm run test:file -- tests/customer-profile-scene.test.ts`，确认通过**

## Chunk 3: 回归验证

### Task 4: 关键路径回归

**Files:**
- Modify: `App/tests/customer-product-detail-page.test.ts`
- Modify: `App/tests/customer-checkout-page.test.ts`

- [ ] **Step 1: 视需要补源码级断言，确保关键动作仍走统一门禁**

- [ ] **Step 2: 运行 `npm run test:file -- tests/customer-session.test.ts tests/customer-action-gate.test.ts tests/customer-product-detail-page.test.ts tests/customer-checkout-page.test.ts tests/customer-profile-scene.test.ts`**

- [ ] **Step 3: 运行 `npm test`**

- [ ] **Step 4: 运行 `npx tsc --noEmit`**

- [ ] **Step 5: 提交本次登录修复**
