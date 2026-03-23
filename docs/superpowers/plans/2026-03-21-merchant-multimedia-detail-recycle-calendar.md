# Merchant Multimedia Detail Recycle Calendar Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在不破坏既有商家端功能的前提下，完成商品规格扩充、奶油多选、多图上传预览、搜索框圆形清空按钮、订单详情放大查看、定时清理回收站链路，以及日期窗口主题统一。

**Architecture:** 先以失败测试锁定商品模型、订单删除链路、详情页结构和搜索框主题边界，再用兼容扩展层更新商家商品与订单数据结构。商品端采用“新字段承载新能力、旧字段保留兼容”的方式平滑迁移；订单端统一把手动删除、立即清空、定时清理收束到商家回收站 helper；日期和搜索样式在 TDesign 真实产物层做统一主题补丁，并同步到 `node_modules` 与 `miniprogram_npm`。

**Tech Stack:** 微信小程序、TypeScript 严格模式、TDesign Miniprogram、Node `node:test`、微信开发者工具 `2.01.2510280`

---

## Chunk 1: 类型与失败测试基线

### Task 1: 为商品模型扩展与回填兼容补失败测试

**Files:**
- Modify: `App/tests/merchant-product-storage.test.ts`
- Modify: `App/tests/merchant-products-scene.test.ts`
- Inspect: `App/types/product.d.ts`
- Inspect: `App/types/merchant-product.d.ts`
- Inspect: `App/miniprogram/utils/merchant-product-storage.ts`
- Inspect: `App/miniprogram/components/merchant-products-scene/merchant-products-scene.ts`

- [ ] **Step 1: 写失败测试，约束规格支持 `12/14/16-inch` 与奶油多选**

```ts
test('merchant product storage supports extended sizes and multiple cream types', () => {
  assert.deepEqual(createdProduct.specSizes, ['10-inch', '12-inch', '14-inch'])
  assert.deepEqual(createdProduct.creamTypes, ['animal-cream-i', 'naked-cake'])
})
```

- [ ] **Step 2: 写失败测试，约束多图存储、回填和封面兼容字段**

```ts
test('merchant product storage keeps imageUrls and derives coverImage from the first image', () => {
  assert.deepEqual(createdProduct.imageUrls, ['/tmp/a.png', '/tmp/b.png'])
  assert.equal(createdProduct.coverImage, '/tmp/a.png')
})
```

- [ ] **Step 3: 写失败测试，约束商品编辑器存在多选奶油和多图缩略图结构**

```ts
test('merchant products scene renders multi-select cream controls and multi-image preview rail', () => {
  assert.match(wxml, /creamOptions/)
  assert.match(wxml, /imageUrls/)
  assert.match(wxml, /handlePreviewProductImage/)
  assert.match(wxml, /handleRemoveProductImage/)
  assert.match(wxml, /handleSetPrimaryProductImage/)
})
```

- [ ] **Step 4: 运行定向测试，确认当前失败**

Run:
```bash
npx tsx --test tests/merchant-product-storage.test.ts
npx tsx --test tests/merchant-products-scene.test.ts
```
Expected: FAIL，当前仍是单奶油、单图结构

### Task 2: 为订单详情、回收站与定时清理链路补失败测试

**Files:**
- Modify: `App/tests/merchant-order-management.test.ts`
- Modify: `App/tests/merchant-orders-scene.test.ts`
- Create: `App/tests/merchant-order-detail-page.test.ts`
- Inspect: `App/types/order.d.ts`
- Inspect: `App/miniprogram/utils/merchant-order-management.ts`
- Inspect: `App/miniprogram/components/merchant-orders-scene/merchant-orders-scene.ts`

- [ ] **Step 1: 写失败测试，约束订单删除进入商家回收站而不是真删**

```ts
test('merchant order deletion moves completed orders into merchant recycle bin', () => {
  assert.equal(deletedOrder.merchantRecycleMeta?.source, 'manual')
  assert.equal(snapshot.some((order) => order.id === deletedOrder.id), true)
})
```

- [ ] **Step 2: 写失败测试，约束立即清空和自动清理复用回收站链路**

```ts
test('merchant cleanup moves completed orders into recycle bin for both instant clear and scheduled cleanup', () => {
  assert.equal(cleanedOrders.every((order) => order.merchantRecycleMeta !== undefined), true)
})
```

- [ ] **Step 3: 写失败测试，约束订单页存在详情入口与定时清理新文案**

```ts
test('merchant orders scene includes order detail entry and cleanup recycle actions', () => {
  assert.match(wxml, /定时清理/)
  assert.match(wxml, /立即清空/)
  assert.match(wxml, /回收站/)
  assert.match(source, /handleOpenOrderDetail/)
})
```

- [ ] **Step 4: 写失败测试，约束订单详情页存在字段放大弹窗与字号切换**

```ts
test('merchant order detail page supports field zoom popup and font-size switching', () => {
  assert.match(wxml, /放大镜/)
  assert.match(wxml, /fontSizeMode/)
  assert.match(wxml, /zoom-popup/)
})
```

- [ ] **Step 5: 运行定向测试，确认当前失败**

Run:
```bash
npx tsx --test tests/merchant-order-management.test.ts
npx tsx --test tests/merchant-orders-scene.test.ts
```
Expected: FAIL，当前删除是真删，也没有详情页与回收站链路

### Task 3: 为搜索清空按钮圆形主题与日期窗口主题补失败测试

**Files:**
- Create: `App/tests/merchant-shared-theme.test.ts`
- Inspect: `App/miniprogram/miniprogram_npm/tdesign-miniprogram/search/search.wxss`
- Inspect: `App/miniprogram/node_modules/tdesign-miniprogram/miniprogram_dist/search/search.wxss`
- Inspect: `App/miniprogram/miniprogram_npm/tdesign-miniprogram/input/input.wxss`
- Inspect: `App/miniprogram/node_modules/tdesign-miniprogram/miniprogram_dist/input/input.wxss`
- Inspect: `App/miniprogram/components/merchant-orders-scene/merchant-orders-scene.wxss`

- [ ] **Step 1: 写失败测试，约束搜索 clear 按钮圆形样式同时存在于 input/search 产物**

```ts
test('shared search theme styles clear buttons as circular affordances in both t-search and t-input', () => {
  assert.match(searchWxss, /t-search__clear/)
  assert.match(searchWxss, /border-radius/)
  assert.match(inputWxss, /t-input__wrap--clearable-icon/)
  assert.match(inputWxss, /border-radius/)
})
```

- [ ] **Step 2: 写失败测试，约束日期窗口主题变量接入 merchant orders scene**

```ts
test('merchant orders scene overrides calendar theme tokens instead of height only', () => {
  assert.match(wxss, /--td-calendar-active-color/)
  assert.match(wxss, /--td-calendar-title-color/)
  assert.match(wxss, /--td-calendar-bg-color/)
})
```

- [ ] **Step 3: 运行定向测试，确认当前失败**

Run: `npx tsx --test tests/merchant-shared-theme.test.ts`
Expected: FAIL，当前没有统一 clear 圆形主题，也没有日历主题变量覆盖

## Chunk 2: 商品模型、存储与多图编辑器

### Task 4: 扩展商品类型与存储兼容层

**Files:**
- Modify: `App/types/product.d.ts`
- Modify: `App/types/merchant-product.d.ts`
- Modify: `App/miniprogram/utils/merchant-product-storage.ts`
- Test: `App/tests/merchant-product-storage.test.ts`

- [ ] **Step 1: 扩展 `ProductSpecSize` 枚举**

实现要点：
- 新增 `12-inch | 14-inch | 16-inch`
- 保持顾客端现有 `6/8/10` 逻辑可继续编译

- [ ] **Step 2: 扩展 `MerchantCreamType` 与商家商品记录**

实现要点：
- 新增 `naked-cake`
- `MerchantProductRecord` / `MerchantProductDraftInput` / `MerchantProductBatchEditInput` 增加 `creamTypes`、`imageUrls`
- 保留 `creamType`、`coverImage` 兼容字段

- [ ] **Step 3: 更新商品存储 normalize / parse / create / update / batchEdit**

实现要点：
- 兼容旧快照：若只有 `creamType`，迁移为单项 `creamTypes`
- 兼容旧快照：若只有 `coverImage`，迁移为单项 `imageUrls`
- 所有保存路径统一写回新字段，并派生旧字段
- 搜索与展示始终用标准化结果

- [ ] **Step 4: 运行定向测试验证通过**

Run: `npx tsx --test tests/merchant-product-storage.test.ts`
Expected: PASS

### Task 5: 改造商品编辑器为多选奶油 + 多图上传预览

**Files:**
- Modify: `App/miniprogram/components/merchant-products-scene/merchant-products-scene.ts`
- Modify: `App/miniprogram/components/merchant-products-scene/merchant-products-scene.wxml`
- Modify: `App/miniprogram/components/merchant-products-scene/merchant-products-scene.wxss`
- Test: `App/tests/merchant-products-scene.test.ts`

- [ ] **Step 1: 扩展规格与奶油选项**

实现要点：
- 规格选项补 `12/14/16 寸`
- 奶油改为 `t-checkbox-group`
- 保留商家端文案 `动物奶油i`
- 新增 `裸蛋糕`

- [ ] **Step 2: 扩展组件状态与展示文案**

实现要点：
- `productCreamTypes: MerchantCreamType[]`
- `batchCreamTypes: MerchantCreamType[]`
- `productImageUrls: string[]`
- 列表展示把多奶油拼成 `creamSummary`

- [ ] **Step 3: 实现多图上传、预览、删除和设为首图**

实现要点：
- `wx.chooseMedia({ count: 9 })`
- 缩略图列表点击预览：`wx.previewImage({ current, urls })`
- 删除单图与设为首图同步刷新首图与兼容字段
- 编辑回填完整图片数组

- [ ] **Step 4: 运行定向测试验证通过**

Run: `npx tsx --test tests/merchant-products-scene.test.ts`
Expected: PASS

## Chunk 3: 搜索框圆形清空按钮共享主题

### Task 6: 补齐 `t-search` 与 `t-input` 的圆形 clear 主题

**Files:**
- Modify: `App/miniprogram/miniprogram_npm/tdesign-miniprogram/search/search.wxss`
- Modify: `App/miniprogram/node_modules/tdesign-miniprogram/miniprogram_dist/search/search.wxss`
- Modify: `App/miniprogram/miniprogram_npm/tdesign-miniprogram/input/input.wxss`
- Modify: `App/miniprogram/node_modules/tdesign-miniprogram/miniprogram_dist/input/input.wxss`
- Test: `App/tests/merchant-shared-theme.test.ts`

- [ ] **Step 1: 为 `t-search__clear` 增加圆形容器、高度和居中规则**

实现要点：
- 明确 `width/height`
- `display:flex` 居中
- 圆形背景与主题描边
- 手机视口下不挤压输入文字

- [ ] **Step 2: 为 `t-input__wrap--clearable-icon` 增加同一视觉规则**

实现要点：
- 与 `t-search` 对齐尺寸与圆角
- 保持点击热区稳定
- 不破坏 suffix / suffix-icon 布局

- [ ] **Step 3: 运行共享主题测试**

Run: `npx tsx --test tests/merchant-shared-theme.test.ts`
Expected: PASS

## Chunk 4: 商家订单回收站与定时清理链路

### Task 7: 重构商家订单管理 helper 为“回收站优先”链路

**Files:**
- Modify: `App/types/order.d.ts`
- Modify: `App/miniprogram/utils/merchant-order-management.ts`
- Test: `App/tests/merchant-order-management.test.ts`
- Inspect: `App/miniprogram/utils/customer-order-recycle.ts`

- [ ] **Step 1: 在订单类型中新增 `merchantRecycleMeta`**

实现要点：
- 结构包含 `deletedAt` 与 `source`
- 不影响顾客端现有 `customerRecycleMeta`

- [ ] **Step 2: 新增 helper**

实现要点：
- `moveCompletedOrderToMerchantRecycle()`
- `moveCompletedOrdersToMerchantRecycle()`
- `restoreMerchantRecycledOrder()`
- `purgeMerchantRecycledOrders()`
- `clearMerchantRecycleOrders()`

- [ ] **Step 3: 调整自动清理逻辑**

实现要点：
- 定时清理不再 `filter` 掉订单
- 到期后转入 `merchantRecycleMeta.source = 'auto-cleanup'`
- “立即清空”写入 `source = 'instant-clear'`

- [ ] **Step 4: 运行订单管理 helper 测试**

Run: `npx tsx --test tests/merchant-order-management.test.ts`
Expected: PASS

### Task 8: 改造订单列表页为详情入口 + 定时清理新弹窗

**Files:**
- Modify: `App/miniprogram/components/merchant-orders-scene/merchant-orders-scene.ts`
- Modify: `App/miniprogram/components/merchant-orders-scene/merchant-orders-scene.wxml`
- Modify: `App/miniprogram/components/merchant-orders-scene/merchant-orders-scene.wxss`
- Modify: `App/miniprogram/components/merchant-orders-scene/merchant-orders-scene.json`
- Test: `App/tests/merchant-orders-scene.test.ts`

- [ ] **Step 1: 接入订单详情页跳转入口**

实现要点：
- 卡片主体点击进入详情页
- 原有状态操作按钮保留独立点击区域，不与卡片跳转冲突

- [ ] **Step 2: 改造定时清理弹窗**

实现要点：
- 标题改为“定时清理”
- 保留清理配置单选
- 新增“立即清空”按钮
- 新增“回收站”按钮
- 说明文案与按钮放在统一弹窗布局内

- [ ] **Step 3: 调整列表过滤逻辑，排除 `merchantRecycleMeta` 订单**

实现要点：
- 当前列表只显示活跃订单
- 已进入商家回收站的订单仅在回收站页可见
- 搜索、日期、Tab 筛选继续在活跃订单集上执行

- [ ] **Step 4: 运行定向测试**

Run: `npx tsx --test tests/merchant-orders-scene.test.ts`
Expected: PASS

## Chunk 5: 商家订单详情页与回收站页

### Task 9: 新建商家订单详情页

**Files:**
- Create: `App/miniprogram/pages/merchant/order-detail/order-detail.ts`
- Create: `App/miniprogram/pages/merchant/order-detail/order-detail.wxml`
- Create: `App/miniprogram/pages/merchant/order-detail/order-detail.wxss`
- Create: `App/miniprogram/pages/merchant/order-detail/order-detail.json`
- Modify: `App/miniprogram/app.json`
- Test: `App/tests/merchant-order-detail-page.test.ts`

- [ ] **Step 1: 搭建详情页数据读取与页面状态**

实现要点：
- 通过 `orderId` 读取订单
- 页面状态包含 `zoomFieldKey`、`zoomVisible`、`fontSizeMode`
- 为每个关键字段生成可放大的配置项

- [ ] **Step 2: 实现字段级放大弹窗**

实现要点：
- 图片字段支持大图预览或图集视图
- 文本字段支持长文滚动
- 字号切换支持小 / 中 / 大
- 放大镜按钮位置固定，不挤压正文

- [ ] **Step 3: 运行详情页测试**

Run: `npx tsx --test tests/merchant-order-detail-page.test.ts`
Expected: PASS

### Task 10: 新建商家订单回收站页

**Files:**
- Create: `App/miniprogram/pages/merchant/order-recycle/order-recycle.ts`
- Create: `App/miniprogram/pages/merchant/order-recycle/order-recycle.wxml`
- Create: `App/miniprogram/pages/merchant/order-recycle/order-recycle.wxss`
- Create: `App/miniprogram/pages/merchant/order-recycle/order-recycle.json`
- Modify: `App/miniprogram/app.json`
- Create: `App/tests/merchant-order-recycle-page.test.ts`

- [ ] **Step 1: 搭建回收站列表与统计**

实现要点：
- 读取 `merchantRecycleMeta` 订单
- 显示删除来源与删除时间

- [ ] **Step 2: 实现恢复、单条彻底删除、清空回收站**

实现要点：
- 所有危险动作加二次确认
- 恢复后订单回到正常列表
- 清空回收站走真正物理删除链路

- [ ] **Step 3: 运行回收站页测试**

Run: `npx tsx --test tests/merchant-order-recycle-page.test.ts`
Expected: PASS

## Chunk 6: 日期窗口主题统一

### Task 11: 为订单日期选择窗口接入 merchant 主题变量

**Files:**
- Modify: `App/miniprogram/components/merchant-orders-scene/merchant-orders-scene.wxss`
- Test: `App/tests/merchant-shared-theme.test.ts`
- Inspect: `App/miniprogram/miniprogram_npm/tdesign-miniprogram/calendar/calendar.wxss`

- [ ] **Step 1: 为 `merchant-orders-scene__calendar` 增加主题变量覆盖**

实现要点：
- `--td-calendar-bg-color`
- `--td-calendar-title-color`
- `--td-calendar-active-color`
- `--td-calendar-selected-color`
- `--td-calendar-item-disabled-color`
- 需要时补 footer 背景与按钮区域留白

- [ ] **Step 2: 保持面板可视高度与安全区稳定**

实现要点：
- 维持原有高度修复
- 不让主题覆盖导致面板再次超出可视区

- [ ] **Step 3: 运行共享主题测试**

Run: `npx tsx --test tests/merchant-shared-theme.test.ts`
Expected: PASS

## Chunk 7: 总体验证

### Task 12: 运行类型检查、全量测试并整理微信补测

**Files:**
- Verify only: `App/types/*.d.ts`
- Verify only: `App/miniprogram/components/merchant-products-scene/*`
- Verify only: `App/miniprogram/components/merchant-orders-scene/*`
- Verify only: `App/miniprogram/pages/merchant/order-detail/*`
- Verify only: `App/miniprogram/pages/merchant/order-recycle/*`
- Verify only: `App/miniprogram/miniprogram_npm/tdesign-miniprogram/{search,input}/*.wxss`
- Verify only: `App/miniprogram/node_modules/tdesign-miniprogram/miniprogram_dist/{search,input}/*.wxss`

- [ ] **Step 1: 运行定向测试**

Run:
```bash
npx tsx --test tests/merchant-product-storage.test.ts
npx tsx --test tests/merchant-products-scene.test.ts
npx tsx --test tests/merchant-order-management.test.ts
npx tsx --test tests/merchant-orders-scene.test.ts
npx tsx --test tests/merchant-order-detail-page.test.ts
npx tsx --test tests/merchant-order-recycle-page.test.ts
npx tsx --test tests/merchant-shared-theme.test.ts
```
Expected: PASS

- [ ] **Step 2: 运行类型检查**

Run: `npx tsc --noEmit`
Expected: PASS

- [ ] **Step 3: 运行全量测试**

Run: `npm test`
Expected: PASS

- [ ] **Step 4: 整理微信开发者工具补测清单**

补测必须覆盖：
- 商品编辑勾选 `12/14/16 寸` 与多奶油后保存、回填、搜索命中
- 多图上传后点击预览，支持左右滑动；删除单图与设为首图后列表封面正确
- 顾客端首页、商家商品页、商家订单页的搜索框清空按钮都为圆形且点击正常
- 订单管理点击卡片进入详情；每个关键字段的放大镜弹窗可用，字号切换可见
- 定时清理弹窗可设置天数、立即清空、进入回收站；回收站支持恢复和清空
- 选择日期窗口主题与商家端一致，且面板完整可见

- [ ] **Step 5: 清理临时打印并记录风险**

交付说明必须明确：
- 商家商品模型采用兼容扩展层，新旧字段并存是过渡设计
- 商家订单删除已改为“先入回收站”，彻底清空才是真删除
- `动物奶油i` 依需求原文保留，存在文案口径风险
- TDesign 搜索主题补丁已双改产物，否则构建 npm 会回退
