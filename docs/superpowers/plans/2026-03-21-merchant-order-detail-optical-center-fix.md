# Merchant Order Detail Optical Center Fix Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 修复商家订单详情页中短文本放大时“看起来没有处在正中间”的视觉偏差。

**Architecture:** 保持现有弹层舞台、卡片和字段放大结构不变，只把文本放大态从“整行文本块居中”改成“内容框 shrink-to-fit 后再居中”。这属于光学居中修复，不改图片预览、字段对齐和字号选择数据流。

**Tech Stack:** 微信小程序、WXML、WXSS、Node `node:test`

---

## Chunk 1: 红灯测试

### Task 1: 为文本内容框居中补失败测试

**Files:**
- Modify: `App/tests/merchant-order-detail-page.test.ts`
- Inspect: `App/miniprogram/pages/merchant/order-detail/order-detail.{wxml,wxss}`

- [ ] **Step 1: 写失败测试，要求文本放大存在独立内容框**

```ts
assert.match(wxml, /merchant-order-detail-page__zoom-copy-frame/)
assert.match(wxss, /\.merchant-order-detail-page__zoom-copy-frame[\s\S]*display:\s*inline-flex/)
```

- [ ] **Step 2: 运行测试确认失败**

Run: `npx tsx --test tests/merchant-order-detail-page.test.ts`
Expected: FAIL

## Chunk 2: 最小实现

### Task 2: 将文本放大从整行块居中改为内容框居中

**Files:**
- Modify: `App/miniprogram/pages/merchant/order-detail/order-detail.wxml`
- Modify: `App/miniprogram/pages/merchant/order-detail/order-detail.wxss`
- Test: `App/tests/merchant-order-detail-page.test.ts`

- [ ] **Step 1: 在文本放大态内新增 `zoom-copy-frame`**
- [ ] **Step 2: 去掉 `zoom-copy` 的整行占满策略，改为内容自适应宽度**
- [ ] **Step 3: 用 `inline-flex` 内容框承接视觉居中**
- [ ] **Step 4: 运行 `npx tsx --test tests/merchant-order-detail-page.test.ts` 验证通过**

## Chunk 3: 回归

### Task 3: 运行验证

**Files:**
- Verify only: `App/tests/merchant-order-detail-page.test.ts`
- Verify only: `App/npx tsc --noEmit`

- [ ] **Step 1: 运行测试**

Run: `npx tsx --test tests/merchant-order-detail-page.test.ts`
Expected: PASS

- [ ] **Step 2: 运行类型检查**

Run: `npx tsc --noEmit`
Expected: PASS
