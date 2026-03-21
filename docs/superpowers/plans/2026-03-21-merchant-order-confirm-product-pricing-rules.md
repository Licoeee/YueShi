# Merchant Order Confirm Dialogs And Product Pricing Rules Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在不破坏既有商家端商品管理、订单管理、回收站、定时清理、搜索与主题样式的前提下，完成订单状态流转/删除主题弹窗、回收站整理、商品价格结构重构、层数选择、多选全选，以及必填校验主题弹窗。

**Architecture:** 先用失败测试锁定订单弹窗结构、回收站布局和商品价格/表单数据约束，再分别实现两条主链路：一条是订单管理与回收站的主题弹层统一；另一条是商品模型从“单一价格”升级为“基础价 + 尺寸/层数/奶油三维加价”的兼容扩展结构。商品编辑器继续复用现有 popup 壳层，不新增无关页面；旧字段保留兼容映射，避免破坏已存在的搜索、列表和顾客端价格承接。

**Tech Stack:** 微信小程序、TypeScript 严格模式、TDesign Miniprogram、Node `node:test`、微信开发者工具 `2.01.2510280`

---

## Chunk 1: 方案与失败测试基线

### Task 1: 固化价格方案和数据结构边界

**Files:**
- Modify: `docs/superpowers/plans/2026-03-21-merchant-order-confirm-product-pricing-rules.md`
- Inspect: `App/types/merchant-product.d.ts`
- Inspect: `App/miniprogram/utils/merchant-product-storage.ts`
- Inspect: `App/types/product.d.ts`
- Inspect: `App/miniprogram/pages/customer/product-detail/product-detail.ts`

- [ ] **Step 1: 在计划中确认价格录入方案采用方案 A（基础价 + 三维加价）**

方案要点：
- `basePrice`: 商品基础价
- `sizePriceAdjustments`: `Record<ProductSpecSize, number>`
- `layerPriceAdjustments`: `Record<MerchantProductLayer, number>`
- `creamPriceAdjustments`: `Record<MerchantCreamType, number>`
- 最终价格：`basePrice + sizeDelta + layerDelta + creamDelta`

- [ ] **Step 2: 记录兼容边界**

兼容要求：
- 保留 `basePrice`，但不再让 UI 只录单一最终价
- 保留 `creamType` / `coverImage` 兼容字段，由多选奶油和图片列表派生
- 顾客端若读取 merchant 商品价格配置，统一走价格计算 helper，不在页面里散落计算

### Task 2: 为订单主题弹窗和回收站整理补失败测试

**Files:**
- Modify: `App/tests/merchant-orders-scene.test.ts`
- Modify: `App/tests/merchant-order-recycle-page.test.ts`
- Inspect: `App/miniprogram/components/merchant-orders-scene/merchant-orders-scene.wxml`
- Inspect: `App/miniprogram/pages/merchant/order-recycle/order-recycle.wxml`

- [ ] **Step 1: 写失败测试，约束状态流转先弹主题确认弹窗**

```ts
test('merchant orders scene renders themed confirm dialog for status advance and delete', () => {
  const wxml = readWorkspaceFile('App/miniprogram/components/merchant-orders-scene/merchant-orders-scene.wxml')
  const source = readWorkspaceFile('App/miniprogram/components/merchant-orders-scene/merchant-orders-scene.ts')

  assert.match(wxml, /merchant-orders-scene__dialog-shell/)
  assert.match(wxml, /confirmDialogVisible/)
  assert.match(source, /pendingActionKind/)
  assert.match(source, /handleConfirmActionDialog/)
})
```

- [ ] **Step 2: 写失败测试，约束回收站去掉 subtitle 且清空按钮居中主题化**

```ts
test('merchant order recycle page removes subtitle and centers themed clear button', () => {
  const wxml = readWorkspaceFile('App/miniprogram/pages/merchant/order-recycle/order-recycle.wxml')
  const wxss = readWorkspaceFile('App/miniprogram/pages/merchant/order-recycle/order-recycle.wxss')

  assert.doesNotMatch(wxml, /merchant-order-recycle-page__subtitle/)
  assert.match(wxml, /merchant-order-recycle-page__clear-action/)
  assert.match(wxss, /merchant-order-recycle-page__clear-action/)
})
```

- [ ] **Step 3: 运行定向测试，确认当前失败**

Run:
```bash
npx tsx --test tests/merchant-orders-scene.test.ts tests/merchant-order-recycle-page.test.ts
```
Expected: FAIL，当前仍是默认 `t-dialog`，回收站仍有 subtitle 且按钮不在独立居中区域。

### Task 3: 为商品价格结构、层数、全选和必填校验补失败测试

**Files:**
- Modify: `App/tests/merchant-products-scene.test.ts`
- Modify: `App/tests/merchant-product-storage.test.ts`
- Inspect: `App/miniprogram/components/merchant-products-scene/merchant-products-scene.ts`
- Inspect: `App/miniprogram/components/merchant-products-scene/merchant-products-scene.wxml`
- Inspect: `App/miniprogram/utils/merchant-product-storage.ts`
- Inspect: `App/types/merchant-product.d.ts`

- [ ] **Step 1: 写失败测试，约束商品模型具备层数和三维价格调整字段**

```ts
test('merchant product storage supports layer selection and dimension price adjustments', () => {
  const source = readWorkspaceFile('App/types/merchant-product.d.ts')

  assert.match(source, /type MerchantProductLayer =/)
  assert.match(source, /layerOptions/)
  assert.match(source, /sizePriceAdjustments/)
  assert.match(source, /layerPriceAdjustments/)
  assert.match(source, /creamPriceAdjustments/)
})
```

- [ ] **Step 2: 写失败测试，约束表单存在层数选择、全选入口、主题必填星号和校验弹窗**

```ts
test('merchant products scene renders layer selection select-all controls and themed required dialog', () => {
  const wxml = readWorkspaceFile('App/miniprogram/components/merchant-products-scene/merchant-products-scene.wxml')
  const source = readWorkspaceFile('App/miniprogram/components/merchant-products-scene/merchant-products-scene.ts')

  assert.match(wxml, /层数选择/)
  assert.match(wxml, /全选/)
  assert.match(wxml, /merchant-products-scene__required-mark/)
  assert.match(wxml, /validationDialogVisible/)
  assert.match(source, /collectMissingRequiredFields/)
})
```

- [ ] **Step 3: 运行定向测试，确认当前失败**

Run:
```bash
npx tsx --test tests/merchant-products-scene.test.ts tests/merchant-product-storage.test.ts
```
Expected: FAIL，当前还没有层数、价格维度调整结构、全选入口和结构化校验弹窗。

## Chunk 2: 订单主题弹窗与回收站整理

### Task 4: 用统一主题弹层替换订单页默认删除/流转弹窗

**Files:**
- Modify: `App/miniprogram/components/merchant-orders-scene/merchant-orders-scene.ts`
- Modify: `App/miniprogram/components/merchant-orders-scene/merchant-orders-scene.wxml`
- Modify: `App/miniprogram/components/merchant-orders-scene/merchant-orders-scene.wxss`
- Modify: `App/miniprogram/components/merchant-orders-scene/merchant-orders-scene.json`

- [ ] **Step 1: 抽象统一弹窗状态**

实现要点：
- 新增 `confirmDialogVisible`
- 新增 `pendingActionKind: 'advance' | 'delete' | ''`
- 新增 `pendingAdvanceOrderId`、`pendingAdvanceNextStatus`、`confirmDialogTone`
- 统一标题、说明、主次按钮文案和危险/确认态

- [ ] **Step 2: 状态流转点击先开弹窗，再在确认后真正更新**

实现要点：
- `确认付款` / `制作完成` / `已取货` 不再直接调用 `updateMerchantOrderStatus`
- 先记录待执行动作，确认后调用 helper
- 删除订单也走同一套主题弹层壳

- [ ] **Step 3: 弹窗壳层沿用当前暖粉橙高光主题**

实现要点：
- 使用现有 popup/dialog 外层样式 token，不回退到默认 `t-dialog` 内容样式
- 主按钮区和次按钮区保持层级清晰
- 危险态只改变强调色，不切回割裂的默认危险弹窗视觉

- [ ] **Step 4: 运行订单页定向测试**

Run: `npx tsx --test tests/merchant-orders-scene.test.ts`
Expected: PASS

### Task 5: 整理回收站页面结构与主题弹窗

**Files:**
- Modify: `App/miniprogram/pages/merchant/order-recycle/order-recycle.ts`
- Modify: `App/miniprogram/pages/merchant/order-recycle/order-recycle.wxml`
- Modify: `App/miniprogram/pages/merchant/order-recycle/order-recycle.wxss`
- Modify: `App/tests/merchant-order-recycle-page.test.ts`

- [ ] **Step 1: 删除小字介绍并重排 hero 区**

实现要点：
- 移除 `merchant-order-recycle-page__subtitle`
- 保留标题和数量 tag
- 独立出居中的清空操作区 `merchant-order-recycle-page__clear-action`

- [ ] **Step 2: 回收站清空/彻底删除使用同一主题弹层语言**

实现要点：
- 复用当前页面已有确认状态字段，但换成主题化承载层
- `清空回收站` 按钮改为主题色，不再用纯 outline 危险按钮

- [ ] **Step 3: 运行回收站定向测试**

Run: `npx tsx --test tests/merchant-order-recycle-page.test.ts`
Expected: PASS

## Chunk 3: 商品模型与仓储结构升级

### Task 6: 为 merchant product 类型和 storage 引入层数与三维价格规则

**Files:**
- Modify: `App/types/merchant-product.d.ts`
- Modify: `App/miniprogram/utils/merchant-product-storage.ts`
- Modify: `App/tests/merchant-product-storage.test.ts`
- Modify: `App/types/product.d.ts`（仅在需要对接价格读取类型时）

- [ ] **Step 1: 定义层数与价格调整类型**

实现要点：
- 新增 `type MerchantProductLayer = '1-layer' | ... | '10-layer'`
- 新增 `type MerchantPriceAdjustmentMap<T extends string> = Partial<Record<T, number>>`
- `MerchantProductRecord` / `MerchantProductDraft` / `MerchantBatchEditInput` 增加：
  - `layers`
  - `sizePriceAdjustments`
  - `layerPriceAdjustments`
  - `creamPriceAdjustments`

- [ ] **Step 2: storage 层实现归一化与兼容迁移**

实现要点：
- 旧数据只有 `basePrice` 时，三维加价 map 默认为空对象
- 新增 `normalizeLayers()`、`normalizePriceAdjustmentMap()`
- `createMerchantProduct()` / `updateMerchantProduct()` / `batchEditMerchantProducts()` 全部支持新字段
- 批量编辑改为“可选覆盖基础价和各维度加价”，不再只有统一最终价

- [ ] **Step 3: 增加价格计算 helper**

实现要点：
- 新建或内聚 `resolveMerchantProductPrice(product, size, layer, creamType)`
- 顾客端或 merchant 列表要展示示例价时，使用统一 helper

- [ ] **Step 4: 运行 storage 定向测试**

Run: `npx tsx --test tests/merchant-product-storage.test.ts`
Expected: PASS

## Chunk 4: 商品编辑器重做价格录入、层数与全选

### Task 7: 改造商品新增/编辑弹窗与批量编辑弹窗

**Files:**
- Modify: `App/miniprogram/components/merchant-products-scene/merchant-products-scene.ts`
- Modify: `App/miniprogram/components/merchant-products-scene/merchant-products-scene.wxml`
- Modify: `App/miniprogram/components/merchant-products-scene/merchant-products-scene.wxss`
- Modify: `App/tests/merchant-products-scene.test.ts`

- [ ] **Step 1: 新增层数多选区和多维价格录入区**

实现要点：
- 新增层数选项 1~10
- 新增基础价输入
- 分三组录入“尺寸加价 / 层数加价 / 奶油加价”
- UI 采用列表式分组，不做复杂矩阵表格

- [ ] **Step 2: 为规格 / 层数 / 奶油增加标题右侧全选按钮**

实现要点：
- 复用现有圆圈勾选视觉语言
- 全选规则：未全选时点一下全选全部；已全选时点一下取消全部
- 手动勾选部分项目时，全选态按集合是否完整自动更新

- [ ] **Step 3: 批量编辑同步支持层数和价格规则覆盖**

实现要点：
- 批量编辑区与商品编辑器采用同一套字段模型
- 若不填写某个价格调整输入，则不覆盖已有值
- 继续保留当前两阶段批量编辑流程，不回退旧逻辑

- [ ] **Step 4: 商品列表摘要与搜索兼容新字段**

实现要点：
- `specSummary`、`creamSummary` 外增加 `layerSummary`
- 搜索字段纳入层数摘要
- 列表价格展示采用“基础价起”或最小可售组合价，避免误导成唯一价

- [ ] **Step 5: 运行商品 scene 定向测试**

Run: `npx tsx --test tests/merchant-products-scene.test.ts`
Expected: PASS

## Chunk 5: 必填规则与主题校验弹窗

### Task 8: 建立商品表单必填元数据和主题校验弹窗

**Files:**
- Modify: `App/miniprogram/components/merchant-products-scene/merchant-products-scene.ts`
- Modify: `App/miniprogram/components/merchant-products-scene/merchant-products-scene.wxml`
- Modify: `App/miniprogram/components/merchant-products-scene/merchant-products-scene.wxss`
- Modify: `App/tests/merchant-products-scene.test.ts`

- [ ] **Step 1: 定义必填字段元信息**

实现要点：
- 除 `商品描述` 外全部必填
- 字段中文名统一来源一处，例如：
  - 商品名称
  - 商品图片
  - 基础价格
  - 规格多选
  - 层数选择
  - 奶油类型
  - 对应维度价格调整（若选了该维度项，要求有对应价格输入）

- [ ] **Step 2: 提交前收集缺失字段并弹主题提示窗**

实现要点：
- 新增 `validationDialogVisible`
- 新增 `validationMissingFields: string[]`
- 不再只用 `wx.showToast('请填写完整')`
- 弹窗内明确列出中文字段名

- [ ] **Step 3: 在字段标题前加主题色必填星号**

实现要点：
- 新增 `merchant-products-scene__required-mark`
- 颜色跟随主题暖橙，不用默认鲜红
- 星号与标题基线对齐，不挤压标题区域

- [ ] **Step 4: 运行商品 scene 定向测试**

Run: `npx tsx --test tests/merchant-products-scene.test.ts`
Expected: PASS

## Chunk 6: 顾客端价格承接与总体验证

### Task 9: 让顾客端价格读取兼容 merchant 商品新规则（若当前链路已接入 merchant 商品）

**Files:**
- Inspect: `App/miniprogram/pages/customer/product-detail/product-detail.ts`
- Inspect: `App/types/product.d.ts`
- Modify if needed: `App/miniprogram/pages/customer/product-detail/product-detail.ts`
- Modify if needed: `App/tests/customer-orders-scene.test.ts`

- [ ] **Step 1: 确认顾客端当前是否直接读取 merchant 商品价格结构**

判断规则：
- 若顾客端仍完全走静态 `CakeDetail`，则本轮只补兼容类型和未来接入 helper，不强行改全链路
- 若已有承接 merchant 商品字段，则统一改为价格 helper 取值

- [ ] **Step 2: 补必要测试并验证不破坏现有顾客端能力**

Run: `npx tsx --test tests/customer-orders-scene.test.ts tests/customer-order-repository.test.ts`
Expected: PASS 或无需改动

### Task 10: 跑总体验证并整理补测说明

**Files:**
- Verify only: `App/miniprogram/components/merchant-orders-scene/*`
- Verify only: `App/miniprogram/pages/merchant/order-recycle/*`
- Verify only: `App/miniprogram/components/merchant-products-scene/*`
- Verify only: `App/miniprogram/utils/merchant-product-storage.ts`
- Verify only: `App/types/merchant-product.d.ts`

- [ ] **Step 1: 运行定向测试**

Run:
```bash
npx tsx --test tests/merchant-orders-scene.test.ts tests/merchant-order-recycle-page.test.ts tests/merchant-products-scene.test.ts tests/merchant-product-storage.test.ts
```
Expected: PASS

- [ ] **Step 2: 运行类型检查**

Run: `npx tsc --noEmit`
Expected: PASS

- [ ] **Step 3: 运行必要回归测试**

Run:
```bash
npx tsx --test tests/merchant-order-management.test.ts tests/merchant-order-detail-page.test.ts
```
Expected: PASS

- [ ] **Step 4: 整理微信开发者工具补测项**

补测必须覆盖：
- 订单状态流转按钮点击后先出主题确认弹窗，再确认后流转
- 删除订单与回收站清空/彻底删除弹窗视觉统一
- 回收站页面无小字介绍，清空按钮在手机尺寸下居中稳定
- 商品新增/编辑时：层数选择、规格多选、奶油多选的“全选”交互正确
- 商品价格录入：基础价 + 维度加价输入后，编辑回填正确、保存后列表摘要合理
- 缺失必填项时弹出主题弹窗，并列出中文字段名

- [ ] **Step 5: 清理临时打印并记录边界风险**

交付说明必须明确：
- 价格方案当前采用线性叠加，不支持单个组合独立特价
- 若未来需要组合特价，应在现有结构上额外增加 override map，而不是回退矩阵大表单
- 本轮不更新 `docs/TODO.md`，等待大帅确认后再同步文档
