# Merchant Search And Multi-Tier Product Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 统一顾客首页、商家订单页、商家商品页的搜索清除与列表恢复链路，并把商家商品新增/编辑从扁平层级筛选升级为“同一商品可并存配置单层、双层、三层”的稳定数据结构，同时记录顾客端后续改造 TODO。

**Architecture:** 先用失败测试锁定两类根因：搜索控件双清除链路与商品层级配置模型错误；再引入一套受控搜索壳层，统一改为自定义圆形清除按钮；商品侧新增按层级分组的已启用价目项字段，并在编辑页按层级独立配置和回填，保持现有默认价格仓储与价格计算 helper 可兼容。顾客端本轮不改逻辑，只在文档里补后续改造项。

**Tech Stack:** 微信小程序、TypeScript 严格模式、TDesign Miniprogram、Node `node:test` / `tsx --test`、现有 merchant storage / scene 架构

---

## Chunk 1: 失败测试与根因锁定

### Task 1: 为顾客首页搜索清除链路补失败测试

**Files:**
- Modify: `App/tests/customer-home-scene.test.ts`
- Inspect: `App/miniprogram/components/customer-home-scene/customer-home-scene.ts`
- Inspect: `App/miniprogram/components/customer-home-scene/customer-home-scene.wxml`

- [ ] **Step 1: 增加结构断言，锁定首页不再依赖默认 clearable 图标**

```ts
test('customer home scene uses a single custom round clear action instead of TDesign built-in clearable icon', () => {
  const wxml = readHomeSceneWxml()
  const source = readHomeSceneTs()

  assert.match(wxml, /customer-home-scene__search-clear/)
  assert.match(source, /handleClearSearch/)
  assert.doesNotMatch(wxml, /clearable="\{\{true\}\}"/)
})
```

- [ ] **Step 2: 增加行为断言，锁定搜索同步使用显式关键字而不是立即回读 `this.data`**

```ts
assert.doesNotMatch(source, /setData\([\s\S]*keyword:[\s\S]*\)\s*this\.syncFeed\(\)/)
assert.match(source, /syncFeed\(keyword: string = this\.data\.keyword\)/)
```

- [ ] **Step 3: 运行定向测试，确认当前红灯**

Run: `npx tsx --test tests/customer-home-scene.test.ts`
Expected: FAIL，当前首页仍使用 `t-search` 默认清除链路且存在 `setData` 后立刻 `syncFeed()` 的状态时序风险。

### Task 2: 为商家订单页与商品页搜索清除/恢复补失败测试

**Files:**
- Modify: `App/tests/merchant-orders-scene.test.ts`
- Modify: `App/tests/merchant-products-scene.test.ts`
- Inspect: `App/miniprogram/components/merchant-orders-scene/merchant-orders-scene.ts`
- Inspect: `App/miniprogram/components/merchant-products-scene/merchant-products-scene.ts`

- [ ] **Step 1: 增加订单页断言，要求存在显式清除处理与自定义圆形按钮**

```ts
assert.match(source, /handleClearOrderSearch/)
assert.match(wxml, /merchant-orders-scene__search-clear/)
assert.doesNotMatch(wxml, /clearable="\{\{true\}\}"/)
```

- [ ] **Step 2: 增加商品页断言，要求存在显式清除处理与自定义圆形按钮**

```ts
assert.match(source, /handleClearProductSearch/)
assert.match(wxml, /merchant-products-scene__search-clear/)
assert.doesNotMatch(wxml, /clearable="\{\{true\}\}"/)
```

- [ ] **Step 3: 增加行为断言，要求订单/商品页不只绑定 `change`，而是有单独的清除入口**

```ts
assert.match(source, /buildVisibleOrdersPatch\(.*orderSearchKeyword/s)
assert.match(source, /buildVisibleProductPatch\(.*productSearchKeyword/s)
```

- [ ] **Step 4: 运行定向测试，确认当前红灯**

Run:
```bash
npx tsx --test tests/merchant-orders-scene.test.ts
npx tsx --test tests/merchant-products-scene.test.ts
```
Expected: FAIL，当前两页仍直接使用 `t-input clearable` 且没有独立清除处理入口。

### Task 3: 为商家商品多层级并存配置补失败测试

**Files:**
- Modify: `App/tests/merchant-product-storage.test.ts`
- Modify: `App/tests/merchant-products-scene.test.ts`
- Modify: `App/types/merchant-product.d.ts`
- Inspect: `App/miniprogram/utils/merchant-product-storage.ts`
- Inspect: `App/miniprogram/components/merchant-products-scene/merchant-products-scene.ts`

- [ ] **Step 1: 新增类型结构断言，要求存在按层级分组的启用配置字段**

```ts
assert.match(types, /enabledConfigIdsByTier/)
assert.match(types, /single:\s*string\[\]/)
assert.match(types, /double:\s*string\[\]/)
assert.match(types, /triple:\s*string\[\]/)
```

- [ ] **Step 2: 新增仓储行为测试，验证同一商品可以同时启用单层和双层配置项**

```ts
test('merchant product storage persists enabled config ids across multiple tiers on the same product', () => {
  assert.deepEqual(createdProduct.enabledConfigIdsByTier.single.length > 0, true)
  assert.deepEqual(createdProduct.enabledConfigIdsByTier.double.length > 0, true)
})
```

- [ ] **Step 3: 新增场景结构断言，要求编辑器存在分层配置视图而不是单一扁平配置区**

```ts
assert.match(wxml, /merchant-products-scene__tier-block/)
assert.match(source, /handleToggleTierConfigItem/)
assert.match(source, /productEnabledConfigIdsByTier/)
```

- [ ] **Step 4: 运行定向测试，确认当前红灯**

Run:
```bash
npx tsx --test tests/merchant-product-storage.test.ts
npx tsx --test tests/merchant-products-scene.test.ts
```
Expected: FAIL，当前类型和场景都还是扁平模型。

## Chunk 2: 搜索壳层统一与列表恢复

### Task 4: 实现共享搜索壳层与三页统一清除行为

**Files:**
- Create: `App/miniprogram/components/shared-search-shell/shared-search-shell.ts`
- Create: `App/miniprogram/components/shared-search-shell/shared-search-shell.wxml`
- Create: `App/miniprogram/components/shared-search-shell/shared-search-shell.wxss`
- Create: `App/miniprogram/components/shared-search-shell/shared-search-shell.json`
- Modify: `App/miniprogram/components/customer-home-scene/customer-home-scene.json`
- Modify: `App/miniprogram/components/customer-home-scene/customer-home-scene.wxml`
- Modify: `App/miniprogram/components/customer-home-scene/customer-home-scene.ts`
- Modify: `App/miniprogram/components/customer-home-scene/customer-home-scene.wxss`
- Modify: `App/miniprogram/components/merchant-orders-scene/merchant-orders-scene.json`
- Modify: `App/miniprogram/components/merchant-orders-scene/merchant-orders-scene.wxml`
- Modify: `App/miniprogram/components/merchant-orders-scene/merchant-orders-scene.ts`
- Modify: `App/miniprogram/components/merchant-orders-scene/merchant-orders-scene.wxss`
- Modify: `App/miniprogram/components/merchant-products-scene/merchant-products-scene.json`
- Modify: `App/miniprogram/components/merchant-products-scene/merchant-products-scene.wxml`
- Modify: `App/miniprogram/components/merchant-products-scene/merchant-products-scene.ts`
- Modify: `App/miniprogram/components/merchant-products-scene/merchant-products-scene.wxss`

- [ ] **Step 1: 写共享搜索壳层最小接口**

```ts
interface SharedSearchShellData {
  keyword: string
  placeholder: string
  showClear: boolean
}
```

要求：
- 使用 `t-input` 作为输入承载，但 `clearable` 固定关闭
- 自绘圆形清除按钮
- 只向外触发 `change` 和 `clear`

- [ ] **Step 2: 顾客首页接入共享搜索壳层**

实现要点：
- `syncFeed(keyword: string = this.data.keyword)`
- `handleSearchChange` 直接把新值传入 `syncFeed(keyword)`
- `handleClearSearch` 显式置空并 `syncFeed('')`

- [ ] **Step 3: 商家订单页接入共享搜索壳层**

实现要点：
- 删除页面对 `t-input clearable` 的直接依赖
- `handleClearOrderSearch` 显式把 `orderSearchKeyword` 置空
- 重新调用 `buildVisibleOrdersPatch(..., '', ...)`

- [ ] **Step 4: 商家商品页接入共享搜索壳层**

实现要点：
- 删除页面对 `t-input clearable` 的直接依赖
- `handleClearProductSearch` 显式把 `productSearchKeyword` 置空
- 重新调用 `buildVisibleProductPatch(..., '')`

- [ ] **Step 5: 运行搜索相关定向测试**

Run:
```bash
npx tsx --test tests/customer-home-scene.test.ts
npx tsx --test tests/merchant-orders-scene.test.ts
npx tsx --test tests/merchant-products-scene.test.ts
```
Expected: PASS

## Chunk 3: 商品多层级配置数据结构

### Task 5: 在类型与仓储中新增按层级分组的启用配置字段

**Files:**
- Modify: `App/types/merchant-product.d.ts`
- Modify: `App/miniprogram/utils/merchant-product-storage.ts`
- Modify: `App/tests/merchant-product-storage.test.ts`

- [ ] **Step 1: 扩展类型定义**

```ts
export interface MerchantEnabledConfigIdsByTier {
  single: string[]
  double: string[]
  triple: string[]
}
```

并在：
- `MerchantProductRecord`
- `MerchantProductDraftInput`
- `MerchantProductBatchEditInput`（如需只读兼容则按最小范围处理）
中补充字段。

- [ ] **Step 2: 实现仓储解析与归一化**

要求：
- 老数据缺失该字段时，返回空结构或通过兼容推导初始化
- 归一化时去重、过滤空字符串

- [ ] **Step 3: 在创建/更新商品时写入新字段**

要求：
- 创建时使用编辑页显式传入值
- 更新时支持部分 patch
- 不破坏现有 `priceAdjustmentsByConfigId`

- [ ] **Step 4: 新增仓储回归测试**

覆盖：
- 创建商品同时启用 `single` 与 `double`
- 更新商品后保留多层级配置
- 老数据未带新字段时加载不报错

- [ ] **Step 5: 运行仓储测试**

Run: `npx tsx --test tests/merchant-product-storage.test.ts`
Expected: PASS

## Chunk 4: 商品编辑页按层级独立配置

### Task 6: 把商品编辑器从扁平模型升级为按层级独立配置

**Files:**
- Modify: `App/miniprogram/components/merchant-products-scene/merchant-products-scene.ts`
- Modify: `App/miniprogram/components/merchant-products-scene/merchant-products-scene.wxml`
- Modify: `App/miniprogram/components/merchant-products-scene/merchant-products-scene.wxss`
- Modify: `App/tests/merchant-products-scene.test.ts`

- [ ] **Step 1: 为场景数据新增按层级分组的编辑态字段**

```ts
productEnabledConfigIdsByTier: {
  single: string[]
  double: string[]
  triple: string[]
}
```

必要时新增视图模型：

```ts
interface PricingTierBlockView {
  tier: MerchantPriceTier
  title: string
  checked: boolean
  items: Array<{ id: string; label: string; selected: boolean; adjustmentInput: string }>
}
```

- [ ] **Step 2: 重写 `buildPricingGroups` 为按层级输出独立配置块**

要求：
- 只要层级被勾选，就显示该层级块
- 该层级块内再决定哪些配置项被勾选启用
- 仅对启用项要求填写加价

- [ ] **Step 3: 新增交互处理**

至少包括：
- `handleToggleTierEnabled`
- `handleToggleTierConfigItem`
- `handleTierConfigPriceChange`

- [ ] **Step 4: 编辑回填兼容旧商品**

要求：
- 若商品已有 `enabledConfigIdsByTier`，直接回填
- 若没有，按旧字段 `layers + specSizes + creamTypes + priceAdjustmentsByConfigId` 推导初始勾选项

- [ ] **Step 5: 保存时写入新字段并保留旧字段汇总**

要求：
- `layers` 继续由已启用的层级汇总得到
- `priceAdjustmentsByConfigId` 只写入启用项
- `specSummary / creamSummary` 后续可从启用项反推

- [ ] **Step 6: 运行商品场景测试**

Run: `npx tsx --test tests/merchant-products-scene.test.ts`
Expected: PASS

## Chunk 5: 商品展示摘要与价格/搜索兼容

### Task 7: 让商品卡摘要和搜索都承接新层级配置

**Files:**
- Modify: `App/miniprogram/components/merchant-products-scene/merchant-products-scene.ts`
- Modify: `App/miniprogram/utils/merchant-product-storage.ts`
- Modify: `App/tests/merchant-products-scene.test.ts`
- Modify: `App/tests/merchant-product-storage.test.ts`

- [ ] **Step 1: 新增从启用配置项反推摘要的 helper**

目标：
- `specSummary`
- `layerSummary`
- `creamSummary`

都来自真实启用项，而不是旧的扁平字段直接拼接。

- [ ] **Step 2: 保持商品卡价格逻辑兼容现有默认价格体系**

要求：
- `basePrice` 继续取已启用配置中的最小最终售价
- 启用配置为空时，回退现有 `basePrice` 逻辑，避免把商品卡算成 `0`

- [ ] **Step 3: 调整商品搜索字段来源**

要求：
- 搜索继续覆盖 `id / title / description / specSummary / layerSummary / creamSummary`
- 新摘要生成后，不破坏现有瀑布流和筛选逻辑

- [ ] **Step 4: 运行商品相关测试**

Run:
```bash
npx tsx --test tests/merchant-product-storage.test.ts
npx tsx --test tests/merchant-products-scene.test.ts
```
Expected: PASS

## Chunk 6: TODO 记录与最终验证

### Task 8: 只记录顾客端后续影响，不直接改顾客端代码

**Files:**
- Modify: `docs/TODO.md`
- Inspect: `App/miniprogram/pages/customer/product-detail/product-detail.ts`
- Inspect: `App/miniprogram/utils/customer-product-selection.ts`
- Inspect: `App/miniprogram/utils/customer-order-repository.ts`

- [ ] **Step 1: 在第四阶段或新增补充段中追加顾客端后续 TODO**

至少包含：
- 顾客端详情页展示单层/双层/三层并存选项
- 层级切换后的规格与价格联动
- 顾客端多图与层级展示是否需要关联
- 购物车 / 订单快照是否需要记录更精确的 `configId`

- [ ] **Step 2: 运行最终自动化验证**

Run:
```bash
npx tsx --test tests/customer-home-scene.test.ts
npx tsx --test tests/merchant-orders-scene.test.ts
npx tsx --test tests/merchant-products-scene.test.ts
npx tsx --test tests/merchant-product-storage.test.ts
npx tsc --noEmit
```
Expected: PASS

- [ ] **Step 3: 整理微信开发者工具 2.01.2510280 补测项**

必须覆盖：
1. 首页搜索输入后点击圆形清除，商品列表立即恢复。
2. 订单管理搜索输入后点击圆形清除，订单列表立即恢复。
3. 商品管理搜索输入后点击圆形清除，商品列表立即恢复。
4. 新增商品时同时勾选单层和双层，并分别启用不同价目项后保存成功。
5. 编辑老商品时，能自动回填为多层级配置视图且保存不报错。

- [ ] **Step 4: 清理临时打印并复查工作区**

Run:
```bash
git status -sb
```
Expected: 仅保留本轮相关改动，无临时打印残留。
