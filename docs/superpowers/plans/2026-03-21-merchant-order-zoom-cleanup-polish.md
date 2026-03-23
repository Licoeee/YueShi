# Merchant Order Zoom And Cleanup Polish Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在不破坏订单详情、回收站、定时清理与现有放大查看链路的前提下，完成商家订单页定时清理区信息拆分、回收站入口外提、订单详情原生图片预览双指缩放、数字型字号选择，以及放大内容卡片的对齐与居中重构。

**Architecture:** 订单列表页只做信息架构拆层，不改订单状态与回收站数据链路；“定时清理”继续只承载清理设置与立即清空，回收站入口提升为独立操作。订单详情页将“图片查看”和“文本放大”拆成两套能力：图片改走微信原生 `wx.previewImage` 以获得双指缩放和图集滑动，文本字段继续使用底部弹层，但把旧的纯文本内容改为结构化字段卡片，并引入数字型字号选择器，保证长内容、长规格和大字号下的对齐与滚动稳定。

**Tech Stack:** 微信小程序、TypeScript 严格模式、TDesign Miniprogram、Node `node:test`、微信开发者工具 `2.01.2510280`

---

## Chunk 1: 审查结论与失败测试锁定

### Task 1: 为订单列表页定时清理区重排补失败测试

**Files:**
- Modify: `App/tests/merchant-orders-scene.test.ts`
- Inspect: `App/miniprogram/components/merchant-orders-scene/merchant-orders-scene.{ts,wxml,wxss}`

- [ ] **Step 1: 写失败测试，约束提示文案删除与回收站入口外提**

```ts
test('merchant orders scene separates recycle entry from cleanup settings and removes passive utility copy', () => {
  assert.doesNotMatch(wxml, /定时清理已关闭/)
  assert.doesNotMatch(wxml, /回收站 \{\{recycleOrderCount\}\} 条/)
  assert.match(wxml, /merchant-orders-scene__recycle-entry/)
  assert.match(wxml, /bindtap="handleOpenRecyclePage"/)
})
```

- [ ] **Step 2: 运行测试确认失败**

Run: `npx tsx --test tests/merchant-orders-scene.test.ts`
Expected: FAIL，当前仍存在 utility copy，回收站仍在定时清理弹层中。

### Task 2: 为订单详情页原生图片预览、数字字号与居中卡片补失败测试

**Files:**
- Modify: `App/tests/merchant-order-detail-page.test.ts`
- Inspect: `App/miniprogram/pages/merchant/order-detail/order-detail.{ts,wxml,wxss,json}`

- [ ] **Step 1: 写失败测试，约束图片走原生预览链路**

```ts
test('merchant order detail page uses wx.previewImage for image zoom so native pinch-to-zoom stays available', () => {
  assert.match(source, /wx\.previewImage\(/)
  assert.match(source, /handlePreviewOrderImages/)
})
```

- [ ] **Step 2: 写失败测试，约束字号改为数字型下拉选择**

```ts
test('merchant order detail page uses numeric font-size picker options instead of semantic chips', () => {
  assert.match(wxml, /t-picker/)
  assert.match(source, /fontSizeOptions: .*14.*16.*18/s)
  assert.doesNotMatch(wxml, /标准|大字|特大/)
})
```

- [ ] **Step 3: 写失败测试，约束放大内容使用居中卡片与结构化字段列表**

```ts
test('merchant order detail page renders centered zoom card with aligned field rows', () => {
  assert.match(wxml, /merchant-order-detail-page__zoom-stage/)
  assert.match(wxml, /merchant-order-detail-page__zoom-card/)
  assert.match(wxml, /merchant-order-detail-page__zoom-field-label/)
  assert.match(wxml, /merchant-order-detail-page__zoom-field-value/)
  assert.match(wxss, /merchant-order-detail-page__zoom-stage[\s\S]*justify-content:\s*center/)
})
```

- [ ] **Step 4: 运行测试确认失败**

Run: `npx tsx --test tests/merchant-order-detail-page.test.ts`
Expected: FAIL，当前图片仍走自定义 popup 图集，字号仍是语义档位，放大内容还是纯文本块。

## Chunk 2: 订单列表页信息架构重排

### Task 3: 拆分定时清理区与回收站入口

**Files:**
- Modify: `App/miniprogram/components/merchant-orders-scene/merchant-orders-scene.ts`
- Modify: `App/miniprogram/components/merchant-orders-scene/merchant-orders-scene.wxml`
- Modify: `App/miniprogram/components/merchant-orders-scene/merchant-orders-scene.wxss`
- Test: `App/tests/merchant-orders-scene.test.ts`

- [ ] **Step 1: 删除被动提示文案状态字段与无效文案渲染**
- [ ] **Step 2: 将回收站入口从定时清理弹层中移出，放到工具区独立按钮位**
- [ ] **Step 3: 保留弹层中的“定时清理 + 立即清空”核心能力，不混入回收站信息**
- [ ] **Step 4: 在真实小程序宽度下重排 utility 区，保证不拥挤、层级清晰**
- [ ] **Step 5: 运行 `npx tsx --test tests/merchant-orders-scene.test.ts` 验证通过**

## Chunk 3: 订单详情页图片预览与放大弹层重构

### Task 4: 把图片查看切到原生预览链路

**Files:**
- Modify: `App/miniprogram/pages/merchant/order-detail/order-detail.ts`
- Modify: `App/miniprogram/pages/merchant/order-detail/order-detail.wxml`
- Test: `App/tests/merchant-order-detail-page.test.ts`

- [ ] **Step 1: 提炼订单图集数据，建立独立 `handlePreviewOrderImages` 入口**
- [ ] **Step 2: 所有图片查看入口改为 `wx.previewImage({ current, urls })`**
- [ ] **Step 3: 保持文本放大弹层能力不受影响**
- [ ] **Step 4: 运行 `npx tsx --test tests/merchant-order-detail-page.test.ts` 验证图片预览断言通过**

### Task 5: 字号选择改为数字型选择器，并重建放大内容卡片

**Files:**
- Modify: `App/miniprogram/pages/merchant/order-detail/order-detail.ts`
- Modify: `App/miniprogram/pages/merchant/order-detail/order-detail.wxml`
- Modify: `App/miniprogram/pages/merchant/order-detail/order-detail.wxss`
- Modify: `App/miniprogram/pages/merchant/order-detail/order-detail.json`
- Test: `App/tests/merchant-order-detail-page.test.ts`

- [ ] **Step 1: 定义数字型字号选项数据结构（例如 `14/16/18/20/24`）和默认值**
- [ ] **Step 2: 用 TDesign 选择器承载字号选择，保留实时回填和立即生效逻辑**
- [ ] **Step 3: 将文本放大内容改为“居中舞台 + 承托卡片 + 结构化字段列表”**
- [ ] **Step 4: 将商品清单放大内容从换行字符串改为字段数组，统一 label/value 列宽与对齐规则**
- [ ] **Step 5: 验证长文本、长规格和大字号时卡片内滚动仍稳定**
- [ ] **Step 6: 运行 `npx tsx --test tests/merchant-order-detail-page.test.ts` 验证通过**

## Chunk 4: 回归与类型校验

### Task 6: 运行针对性测试与类型检查

**Files:**
- Verify only: `App/tests/merchant-orders-scene.test.ts`
- Verify only: `App/tests/merchant-order-detail-page.test.ts`
- Verify only: `App/tests/merchant-order-recycle-page.test.ts`
- Verify only: `App/npx tsc --noEmit`

- [ ] **Step 1: 运行订单列表、订单详情、订单回收站相关测试**

Run:
```bash
npx tsx --test tests/merchant-orders-scene.test.ts tests/merchant-order-detail-page.test.ts tests/merchant-order-recycle-page.test.ts
```
Expected: PASS

- [ ] **Step 2: 运行类型检查**

Run: `npx tsc --noEmit`
Expected: PASS

- [ ] **Step 3: 记录微信开发者工具补测项**

重点补测：
- 订单详情页点击图片进入原生预览后能双指缩放
- 字号选择器切换 14/16/18/20/24 后内容实时放大且不破版
- 商品清单字段卡片在长规格和大字号下仍对齐
- 定时清理与回收站入口分离后，按钮层级清晰且不拥挤
