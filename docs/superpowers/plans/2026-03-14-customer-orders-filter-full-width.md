# Customer Orders Filter Full Width Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让顾客订单页顶部四个状态入口横向铺满容器，形成等宽四列。

**Architecture:** 不改订单状态逻辑，只调整 `customer-orders-scene` 的筛选区结构与样式。保持 TDesign `t-tag`，通过外层四等分布局和标签宽度拉伸实现铺满。

**Tech Stack:** WeChat Mini Program (WXML/WXSS/TS), TDesign Mini Program, `tsx` + `node:test`.

---

## Chunk 1: Test First

### Task 1: 为四等分铺满布局补结构测试

**Files:**
- Modify: `App/tests/customer-orders-scene.test.ts`

- [ ] **Step 1: 先写失败测试**

```ts
assert.match(wxml, /class="customer-orders-scene__tab-item"/)
assert.match(wxss, /\.customer-orders-scene__tab-item\s*\{[\s\S]*flex:\s*1/)
assert.match(wxss, /\.customer-orders-scene__tab-item[\s\S]*min-width:\s*0/)
```

- [ ] **Step 2: 运行聚焦测试并确认先失败**

Run:

```bash
npm --prefix App run test:file -- tests/customer-orders-scene.test.ts
```

Expected: FAIL，因为当前四个状态入口还没有等宽铺满。

## Chunk 2: Minimal Implementation

### Task 2: 实现四等分横向铺满

**Files:**
- Modify: `App/miniprogram/components/customer-orders-scene/customer-orders-scene.wxml`
- Modify: `App/miniprogram/components/customer-orders-scene/customer-orders-scene.wxss`

- [ ] **Step 1: 保持四项结构不变，只让每项占满四分之一**

```css
.customer-orders-scene__tab-item {
  flex: 1;
  min-width: 0;
}
```

- [ ] **Step 2: 让内部 TDesign 标签宽度跟随容器**

```css
.customer-orders-scene__tab-item .t-tag {
  width: 100%;
}
```

- [ ] **Step 3: 居中文案并去掉多余外缩**

```css
.customer-orders-scene__tab-item .t-tag {
  display: flex;
  justify-content: center;
}
```

- [ ] **Step 4: 重新运行聚焦测试**

Run:

```bash
npm --prefix App run test:file -- tests/customer-orders-scene.test.ts
```

Expected: PASS.

## Chunk 3: Verification

### Task 3: 跑回归与手测

**Files:**
- Test: `App/tests/customer-orders-scene.test.ts`

- [ ] **Step 1: 运行订单页聚焦测试**

Run:

```bash
npm --prefix App run test:file -- tests/customer-orders-scene.test.ts
```

Expected: PASS.

- [ ] **Step 2: 微信开发者工具 `2.01.2510280` 手测**

操作步骤：

```text
1. 打开顾客端订单页。
2. 观察顶部四个状态入口。
3. 逐个点击四个状态入口并观察宽度是否始终均分。
```

预期效果：

```text
- “待确认 / 待制作 / 待取货 / 已完成”横向铺满整行。
- 四项宽度一致，不因文案长短变化。
- 点击态和筛选功能保持正常。
```
