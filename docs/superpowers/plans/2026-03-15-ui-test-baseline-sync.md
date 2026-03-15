# UI Test Baseline Sync Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将顾客端 UI 相关测试断言同步到 Gemini 当前实现，消除“实现已更新但测试仍绑定旧结构”的失真。

**Architecture:** 不改现有页面实现，只修正测试基线。先用失败测试复现脱节点，再按当前 WXML/WXSS 的真实结构更新断言，最后重跑相关测试确认测试描述和实现一致。

**Tech Stack:** Node `tsx --test`、TypeScript 测试文件、微信小程序 WXML/WXSS

---

## Chunk 1: 失败复现

### Task 1: 锁定失真的测试断言

**Files:**
- Verify: `App/tests/customer-checkout-page.test.ts`
- Verify: `App/tests/customer-profile-scene.test.ts`

- [ ] **Step 1: 运行相关测试确认失败**

Run:
```bash
cd App
npm run test:file -- tests/customer-checkout-page.test.ts tests/customer-profile-scene.test.ts
```

Expected:
- `customer-checkout-page.test.ts` 因仍断言 `disabled="{{submitDisabled}}"` 失败
- `customer-profile-scene.test.ts` 因仍断言 `customer-profile-scene__action-button--ghost` 失败

## Chunk 2: 测试基线同步

### Task 2: 同步 checkout 测试到当前按钮实现

**Files:**
- Modify: `App/tests/customer-checkout-page.test.ts`

- [ ] **Step 2: 将断言改为当前自定义提交按钮壳**

断言目标：
- 保留 `pickupWarning` / `submitDisabled` 状态字段断言
- 改为断言 `checkout-page__submit-button--{{submitDisabled ? 'disabled' : 'primary'}}`

- [ ] **Step 3: 运行 checkout 测试确认通过**

Run:
```bash
cd App
npm run test:file -- tests/customer-checkout-page.test.ts
```

Expected:
- PASS

### Task 3: 同步 profile 测试到当前按钮变体

**Files:**
- Modify: `App/tests/customer-profile-scene.test.ts`

- [ ] **Step 4: 将断言改为当前 `primary/default/outline/disabled` 按钮壳**

断言目标：
- 保留 `customer-profile-scene__action-button` 主类
- 改为断言当前存在的 `--outline` 与动态状态变体

- [ ] **Step 5: 运行 profile 测试确认通过**

Run:
```bash
cd App
npm run test:file -- tests/customer-profile-scene.test.ts
```

Expected:
- PASS

## Chunk 3: 回归验证

### Task 4: 回归顾客端 UI 相关测试

**Files:**
- Verify only

- [ ] **Step 6: 运行受影响测试集**

Run:
```bash
cd App
npm run test:file -- tests/customer-cart-scene.test.ts tests/customer-checkout-page.test.ts tests/customer-order-detail-page.test.ts tests/customer-profile-scene.test.ts tests/customer-settings-page.test.ts
```

Expected:
- 全部 PASS

- [ ] **Step 7: 检查变更范围**

Run:
```bash
git status -sb
```

Expected:
- 本轮新增修改仅涉及测试文件和计划文件
