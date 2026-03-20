# 顾客购物车滑删 Skyline 修复 Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在不影响购物车现有功能的前提下，替换 `t-swipe-cell`，让真机扫码进入顾客端后仍可通过左滑删除购物车商品。

**Architecture:** 保留当前购物车卡片与删除按钮视觉，只替换滑动手势层。通过一个纯函数手势工具处理方向、位移和阈值判断，由 `customer-cart-scene` 管理单项展开态与删除动作，从而规避 Skyline 下 `SwipeCell` 的兼容问题。

**Tech Stack:** 微信小程序原生触摸事件、TypeScript 严格模式、Node `tsx --test`

---

## Chunk 1: 回归测试先行

### Task 1: 为滑删兼容修复补失败测试

**Files:**
- Modify: `App/tests/customer-cart-scene.test.ts`
- Create: `App/tests/customer-cart-swipe.test.ts`

- [ ] **Step 1: 先修改结构测试，约束购物车场景不再依赖 `t-swipe-cell`，而是暴露自管触摸事件和删除操作区。**

- [ ] **Step 2: 新增手势工具测试，覆盖方向判定、位移裁剪和收手决策。**

- [ ] **Step 3: 运行 `npm run test:file -- tests/customer-cart-scene.test.ts tests/customer-cart-swipe.test.ts`，确认新测试先失败。**

## Chunk 2: 用自实现滑删替换 `t-swipe-cell`

### Task 2: 新增纯手势工具

**Files:**
- Create: `App/miniprogram/utils/customer-cart-swipe.ts`
- Test: `App/tests/customer-cart-swipe.test.ts`

- [ ] **Step 1: 实现方向判定纯函数，明确水平优先和最小拖动阈值。**

- [ ] **Step 2: 实现位移裁剪与展开决策纯函数。**

- [ ] **Step 3: 运行 `npm run test:file -- tests/customer-cart-swipe.test.ts`，确认转绿。**

### Task 3: 重写购物车场景的滑删承载层

**Files:**
- Modify: `App/miniprogram/components/customer-cart-scene/customer-cart-scene.ts`
- Modify: `App/miniprogram/components/customer-cart-scene/customer-cart-scene.wxml`
- Modify: `App/miniprogram/components/customer-cart-scene/customer-cart-scene.wxss`
- Modify: `App/miniprogram/components/customer-cart-scene/customer-cart-scene.json`
- Test: `App/tests/customer-cart-scene.test.ts`

- [ ] **Step 1: 在场景数据中加入仅供显示使用的滑动状态，不改购物车存储结构。**

- [ ] **Step 2: 将 `t-swipe-cell` 替换为“操作层 + 内容层”结构，保留当前删除按钮样式。**

- [ ] **Step 3: 为内容层接入 `touchstart / touchmove / touchend / touchcancel`，并保证一次只展开一项。**

- [ ] **Step 4: 保留现有勾选、全选、删除、结算逻辑，不改变业务入口。**

- [ ] **Step 5: 运行 `npm run test:file -- tests/customer-cart-scene.test.ts tests/customer-cart-swipe.test.ts`，确认通过。**

## Chunk 3: 回归验证

### Task 4: 购物车关键路径回归

**Files:**
- Test: `App/tests/customer-cart-state-extended.test.ts`
- Test: `App/tests/customer-checkout-page.test.ts`

- [ ] **Step 1: 运行 `npm run test:file -- tests/customer-cart-scene.test.ts tests/customer-cart-swipe.test.ts tests/customer-cart-state-extended.test.ts tests/customer-checkout-state.test.ts tests/customer-checkout-page.test.ts`。**

- [ ] **Step 2: 运行 `npm test`。**

- [ ] **Step 3: 如果仓库内有 TypeScript 检查命令则执行；若没有，至少记录该缺口。**

- [ ] **Step 4: 输出微信开发者工具与真机复测步骤，重点确认左滑删除、垂直滚动、勾选、全选、合计和去结算未回退。**
