# Merchant Order Detail Text Center Fix Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 修复商家订单详情页中“订单号”和“关键信息”类文本放大后没有稳定处于视觉中心的问题。

**Architecture:** 保持现有订单详情图片预览、字段放大和字号选择链路不变，只针对文本放大态补充专用居中容器与卡片布局约束。根因先通过现有 WXML/WXSS 结构分析锁定，再用一个最小失败测试约束“文本放大必须存在专用居中承载层并在样式上双轴居中”。

**Tech Stack:** 微信小程序、TypeScript、WXML、WXSS、Node `node:test`

---

## Chunk 1: 根因确认与红灯测试

### Task 1: 为文本放大居中补失败测试

**Files:**
- Modify: `App/tests/merchant-order-detail-page.test.ts`
- Inspect: `App/miniprogram/pages/merchant/order-detail/order-detail.{wxml,wxss}`

- [ ] **Step 1: 写失败测试，要求文本放大存在专用居中容器**

```ts
assert.match(wxml, /merchant-order-detail-page__zoom-copy-shell/)
assert.match(wxss, /\.merchant-order-detail-page__zoom-copy-shell[\s\S]*justify-content:\s*center/)
assert.match(wxss, /\.merchant-order-detail-page__zoom-copy-shell[\s\S]*align-items:\s*center/)
```

- [ ] **Step 2: 运行测试确认失败**

Run: `npx tsx --test tests/merchant-order-detail-page.test.ts`
Expected: FAIL，因为当前文本放大直接落在卡片里，没有专用双轴居中容器。

## Chunk 2: 最小实现

### Task 2: 为文本放大增加专用中心容器

**Files:**
- Modify: `App/miniprogram/pages/merchant/order-detail/order-detail.wxml`
- Modify: `App/miniprogram/pages/merchant/order-detail/order-detail.wxss`
- Test: `App/tests/merchant-order-detail-page.test.ts`

- [ ] **Step 1: 仅在文本放大态下新增 `zoom-copy-shell` 容器**
- [ ] **Step 2: 为文本态卡片补最小高度和双轴居中约束，避免短文本贴上沿**
- [ ] **Step 3: 保持字段放大态布局不变，避免影响商品清单对齐**
- [ ] **Step 4: 运行 `npx tsx --test tests/merchant-order-detail-page.test.ts` 验证通过**

## Chunk 3: 回归验证

### Task 3: 校验类型与相关链路

**Files:**
- Verify only: `App/tests/merchant-order-detail-page.test.ts`
- Verify only: `App/npx tsc --noEmit`

- [ ] **Step 1: 运行文本放大相关测试**

Run: `npx tsx --test tests/merchant-order-detail-page.test.ts`
Expected: PASS

- [ ] **Step 2: 运行类型检查**

Run: `npx tsc --noEmit`
Expected: PASS

- [ ] **Step 3: 记录微信开发者工具补测项**

重点补测：
- 订单号放大后文字在卡片视觉中心
- 关键信息类放大后文字在卡片视觉中心
- 字号切大后仍保持卡片内居中和滚动稳定
