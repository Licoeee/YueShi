# Merchant Order Detail Whitespace Center Fix Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 修复商家订单详情页中文本放大内容因模板空白被保留而产生的水平偏移问题。

**Architecture:** 保持现有放大弹层、字段卡片、字号选择和图片预览链路不变，只修文本放大态的数据承载节点。根因是 `white-space: pre-wrap` 与 WXML 内部缩进组合，导致模板中的换行和缩进被当成真实前导空白渲染，因此需要通过失败测试约束文本节点必须采用“无模板前导空白”的同一写法。

**Tech Stack:** 微信小程序、WXML、WXSS、Node `node:test`

---

## Chunk 1: 根因锁定

### Task 1: 为模板空白问题补失败测试

**Files:**
- Modify: `App/tests/merchant-order-detail-page.test.ts`
- Inspect: `App/miniprogram/pages/merchant/order-detail/order-detail.wxml`

- [ ] **Step 1: 写失败测试，约束文本节点必须无前导模板空白**

```ts
assert.match(
  wxml,
  /class="merchant-order-detail-page__zoom-copy"[\s\S]*>\{\{zoomPopupTextContent\}\}<\/text>/,
)
```

- [ ] **Step 2: 运行测试确认失败**

Run: `npx tsx --test tests/merchant-order-detail-page.test.ts`
Expected: FAIL，因为当前文本插值被放在多行缩进结构中。

## Chunk 2: 最小实现

### Task 2: 去除文本节点模板缩进空白

**Files:**
- Modify: `App/miniprogram/pages/merchant/order-detail/order-detail.wxml`
- Test: `App/tests/merchant-order-detail-page.test.ts`

- [ ] **Step 1: 将文本放大节点改为单行插值写法，消除前导空白**
- [ ] **Step 2: 保持 `pre-wrap`，只保留数据中的换行，不保留模板缩进**
- [ ] **Step 3: 不改字段放大结构，不改字号选择逻辑**
- [ ] **Step 4: 运行 `npx tsx --test tests/merchant-order-detail-page.test.ts` 验证通过**

## Chunk 3: 回归验证

### Task 3: 验证不回归

**Files:**
- Verify only: `App/tests/merchant-order-detail-page.test.ts`
- Verify only: `App/npx tsc --noEmit`

- [ ] **Step 1: 运行放大弹层测试**

Run: `npx tsx --test tests/merchant-order-detail-page.test.ts`
Expected: PASS

- [ ] **Step 2: 运行类型检查**

Run: `npx tsc --noEmit`
Expected: PASS
