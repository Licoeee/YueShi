# Merchant Default Pricing And Recycle Fix Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 修复商家商品回收站永久删除点击失效，统一商品删除弹窗主题样式，并落地“我的页默认价格配置 + 商品新增/编辑加价联动 + 层数收敛为 1/2/3 层”的完整链路。

**Architecture:** 保留现有商家端页面骨架与视觉方向，先用测试锁定回收站、弹窗和价格联动行为，再把商品价格模型从“基础价 + 维度加价 map”升级为“默认价格配置项 + 商品加价 override”的配置项 schema。默认价格作为独立仓储挂在商家“我的”页；商品新增/编辑页只消费同一份 schema 并保存各配置项加价，避免配置项增删后回填错位。

**Tech Stack:** 微信小程序原生组件、TDesign MiniProgram、TypeScript 严格模式、Node test、项目现有 merchant storage/util 架构。

---

## File Map

- Modify: `App/miniprogram/components/merchant-products-scene/merchant-products-scene.ts`
  - 修复回收站永久删除点击失效。
  - 替换商品删除默认弹窗为商家主题弹层。
  - 接入默认价格 schema，重做商品新增/编辑加价面板与层数选择。
- Modify: `App/miniprogram/components/merchant-products-scene/merchant-products-scene.wxml`
  - 增加主题删除弹窗、回收站永久删除确认链路、默认价格驱动的单层/双层/三层加价面板。
- Modify: `App/miniprogram/components/merchant-products-scene/merchant-products-scene.wxss`
  - 补商品删除/永久删除主题弹层样式，以及配置型价格面板样式。
- Modify: `App/miniprogram/components/merchant-profile-scene/merchant-profile-scene.ts`
  - 增加默认价格区域状态、展开/收起、自定义弹窗与输入回填逻辑。
- Modify: `App/miniprogram/components/merchant-profile-scene/merchant-profile-scene.wxml`
  - 新增“默认价格”入口区、单层/双层/三层可展开面板、自定义主题弹窗。
- Modify: `App/miniprogram/components/merchant-profile-scene/merchant-profile-scene.wxss`
  - 默认价格区、展开项、输入区、弹窗主题样式。
- Modify: `App/miniprogram/components/merchant-profile-scene/merchant-profile-scene.json`
  - 注册新增使用到的 TDesign 组件。
- Modify: `App/miniprogram/utils/merchant-product-storage.ts`
  - 引入新的价格 schema 持久化解析与兼容迁移。
  - 增加回收站永久删除 helper。
  - 层数有效值收敛为 `1-layer|2-layer|3-layer`。
- Create: `App/miniprogram/utils/merchant-default-pricing-storage.ts`
  - 默认价格配置项仓储、默认种子数据、自定义项增删、配置项规范化。
- Create: `App/types/merchant-default-pricing.d.ts`
  - 默认价格配置项、层级、组合尺寸、自定义表单、仓储快照类型。
- Modify: `App/types/merchant-product.d.ts`
  - 商品价格结构改为与默认价格配置项联动的数据模型，并收敛层数字面量。
- Modify: `App/tests/merchant-products-scene.test.ts`
  - 增加回收站永久删除、主题弹窗、默认价格联动加价面板、层数收敛断言。
- Modify: `App/tests/merchant-profile-scene.test.ts`
  - 增加默认价格入口、展开区、自定义弹窗结构断言。
- Modify: `App/tests/merchant-product-storage.test.ts`
  - 重写价格 schema 相关断言，覆盖默认价格 + 商品加价联动、ID 不复用、回收站永久删除。
- Create: `App/tests/merchant-default-pricing-storage.test.ts`
  - 验证默认项、自定义项、删除项与读取兼容。
- Modify: `docs/STYLE_GUIDE.md`
  - 写入商家端统一主题弹窗规范，声明商品删除与订单确认/删除共用一套标准。

---

## Chunk 1: Root Cause Lock + Failing Tests

### Task 1: 为回收站永久删除、主题弹窗和默认价格入口补失败测试

**Files:**
- Modify: `App/tests/merchant-products-scene.test.ts`
- Modify: `App/tests/merchant-profile-scene.test.ts`
- Modify: `App/tests/merchant-product-storage.test.ts`
- Create: `App/tests/merchant-default-pricing-storage.test.ts`

- [ ] **Step 1: 写回收站永久删除与商品主题弹窗失败测试**

```ts
test('merchant products recycle actions expose permanent delete handler and themed dialog shell', () => {
  const wxml = readWorkspaceFile('App/miniprogram/components/merchant-products-scene/merchant-products-scene.wxml')
  const source = readWorkspaceFile('App/miniprogram/components/merchant-products-scene/merchant-products-scene.ts')

  assert.doesNotMatch(wxml, /disabled="\{\{true\}\}"/)
  assert.match(wxml, /handleDeleteRecycleProductPermanently/)
  assert.match(wxml, /merchant-products-scene__dialog-shell/)
  assert.match(source, /pendingRecycleDeleteProductId/)
})
```

- [ ] **Step 2: 写默认价格区与自定义弹窗失败测试**

```ts
test('merchant profile scene renders default pricing groups and custom config dialog', () => {
  const wxml = readWorkspaceFile('App/miniprogram/components/merchant-profile-scene/merchant-profile-scene.wxml')
  assert.match(wxml, /默认价格/)
  assert.match(wxml, /单层/)
  assert.match(wxml, /双层/)
  assert.match(wxml, /三层/)
  assert.match(wxml, /自定义/)
  assert.match(wxml, /尺寸（一层）|尺寸\(一层\)/)
})
```

- [ ] **Step 3: 写默认价格 schema 与商品加价联动失败测试**

```ts
test('merchant product storage resolves sale price from default pricing base plus surcharge', () => {
  const defaultPricing = seedMerchantDefaultPricingSnapshot()
  const created = createMerchantProduct(storage, {
    title: '联动蛋糕',
    layers: ['2-layer'],
    priceAdjustmentsByConfigId: { 'double-10-6-animal-cream-i': 10 },
  }, nowFactory, defaultPricing)

  assert.equal(resolveMerchantProductConfiguredPrice(created, 'double-10-6-animal-cream-i', defaultPricing), 118)
})
```

- [ ] **Step 4: 运行失败测试，确认红灯是预期缺口而不是测试写错**

Run:
```bash
npx tsx --test tests/merchant-products-scene.test.ts tests/merchant-profile-scene.test.ts tests/merchant-product-storage.test.ts tests/merchant-default-pricing-storage.test.ts
```
Expected:
- `merchant-products-scene` 断言失败，提示永久删除 handler / 主题弹层不存在。
- `merchant-profile-scene` 断言失败，提示默认价格结构不存在。
- `merchant-product-storage` 断言失败，提示新 schema API/字段不存在。

- [ ] **Step 5: 提交测试红灯快照**

```bash
git add tests/merchant-products-scene.test.ts tests/merchant-profile-scene.test.ts tests/merchant-product-storage.test.ts tests/merchant-default-pricing-storage.test.ts
git commit -m "test: cover merchant default pricing workflow"
```

---

## Chunk 2: Default Pricing Schema + Storage Layer

### Task 2: 建立默认价格配置项仓储并收敛层数范围

**Files:**
- Create: `App/types/merchant-default-pricing.d.ts`
- Create: `App/miniprogram/utils/merchant-default-pricing-storage.ts`
- Modify: `App/types/merchant-product.d.ts`
- Modify: `App/miniprogram/utils/merchant-product-storage.ts`
- Test: `App/tests/merchant-default-pricing-storage.test.ts`
- Test: `App/tests/merchant-product-storage.test.ts`

- [ ] **Step 1: 定义默认价格类型与层级 schema**

```ts
export type MerchantPriceTier = 'single' | 'double' | 'triple'

export interface MerchantDefaultPriceConfigItem {
  id: string
  tier: MerchantPriceTier
  sizes: ProductSpecSize[]
  creamType: MerchantCreamType
  label: string
  basePrice: number
  builtIn: boolean
}
```

- [ ] **Step 2: 实现默认项种子、自定义项新增删除、快照读取与规范化**

Run:
```bash
npx tsx --test tests/merchant-default-pricing-storage.test.ts
```
Expected: PASS

- [ ] **Step 3: 将商品价格模型改为配置项 override 结构并收敛层数**

```ts
export interface MerchantProductRecord {
  // ...existing fields
  layers: ('1-layer' | '2-layer' | '3-layer')[]
  priceAdjustmentsByConfigId: Partial<Record<string, number>>
}
```

- [ ] **Step 4: 在商品仓储中实现旧数据兼容迁移与最终价解析 helper**

```ts
function resolveMerchantProductConfiguredPrice(
  product: MerchantProductRecord,
  configId: string,
  pricingSnapshot: MerchantDefaultPricingSnapshot,
): number {
  return resolveDefaultPrice(configId, pricingSnapshot) + resolveSurcharge(product.priceAdjustmentsByConfigId, configId)
}
```

- [ ] **Step 5: 增加回收站永久删除 helper，并保持 ID 计数器永不复用**

Run:
```bash
npx tsx --test tests/merchant-product-storage.test.ts tests/merchant-default-pricing-storage.test.ts
```
Expected: PASS

- [ ] **Step 6: 提交仓储与类型层修改**

```bash
git add types/merchant-default-pricing.d.ts miniprogram/utils/merchant-default-pricing-storage.ts types/merchant-product.d.ts miniprogram/utils/merchant-product-storage.ts tests/merchant-default-pricing-storage.test.ts tests/merchant-product-storage.test.ts
git commit -m "feat: add merchant default pricing schema"
```

---

## Chunk 3: Merchant Profile Default Pricing UI

### Task 3: 在商家“我的”页落地默认价格可展开配置区

**Files:**
- Modify: `App/miniprogram/components/merchant-profile-scene/merchant-profile-scene.ts`
- Modify: `App/miniprogram/components/merchant-profile-scene/merchant-profile-scene.wxml`
- Modify: `App/miniprogram/components/merchant-profile-scene/merchant-profile-scene.wxss`
- Modify: `App/miniprogram/components/merchant-profile-scene/merchant-profile-scene.json`
- Test: `App/tests/merchant-profile-scene.test.ts`

- [ ] **Step 1: 扩展组件数据状态，接默认价格仓储与三组展开态**
- [ ] **Step 2: 渲染“单层 / 双层 / 三层”三组默认项输入区、设置按钮、自定义按钮**
- [ ] **Step 3: 实现自定义主题弹窗与同排下拉选择器**
- [ ] **Step 4: 实现删除默认项、输入价格、持久化回填**
- [ ] **Step 5: 运行页面结构测试**

Run:
```bash
npx tsx --test tests/merchant-profile-scene.test.ts
```
Expected: PASS

- [ ] **Step 6: 提交“我的页”默认价格区**

```bash
git add miniprogram/components/merchant-profile-scene/merchant-profile-scene.ts miniprogram/components/merchant-profile-scene/merchant-profile-scene.wxml miniprogram/components/merchant-profile-scene/merchant-profile-scene.wxss miniprogram/components/merchant-profile-scene/merchant-profile-scene.json tests/merchant-profile-scene.test.ts
git commit -m "feat: add merchant default pricing settings"
```

---

## Chunk 4: Merchant Products Scene Fixes + Pricing Linkage

### Task 4: 修复回收站永久删除、统一商品删除弹窗、重做商品加价面板

**Files:**
- Modify: `App/miniprogram/components/merchant-products-scene/merchant-products-scene.ts`
- Modify: `App/miniprogram/components/merchant-products-scene/merchant-products-scene.wxml`
- Modify: `App/miniprogram/components/merchant-products-scene/merchant-products-scene.wxss`
- Test: `App/tests/merchant-products-scene.test.ts`
- Test: `App/tests/merchant-product-storage.test.ts`

- [ ] **Step 1: 替换回收站“永久删除”占位按钮，接入真实 handler 与主题确认弹层**
- [ ] **Step 2: 把商品删除从默认 `t-dialog` 改为订单页同款主题弹层壳层**
- [ ] **Step 3: 删除旧的维度型价格输入区，改为按默认价格 schema 驱动的单层/双层/三层加价面板**
- [ ] **Step 4: 让商品新增/编辑回填当前默认价格配置，未填写加价统一按 `0`，并只显示对应层级有效项**
- [ ] **Step 5: 收敛层数选择为 `1层 / 2层 / 3层`，同步批量编辑与展示摘要**
- [ ] **Step 6: 跑场景结构测试与仓储行为测试**

Run:
```bash
npx tsx --test tests/merchant-products-scene.test.ts tests/merchant-product-storage.test.ts
```
Expected: PASS

- [ ] **Step 7: 提交商品管理页改造**

```bash
git add miniprogram/components/merchant-products-scene/merchant-products-scene.ts miniprogram/components/merchant-products-scene/merchant-products-scene.wxml miniprogram/components/merchant-products-scene/merchant-products-scene.wxss tests/merchant-products-scene.test.ts tests/merchant-product-storage.test.ts
git commit -m "feat: link merchant products to default pricing"
```

---

## Chunk 5: Dialog Standard Documentation + Final Verification

### Task 5: 写商家端统一主题弹窗规范并完成校验

**Files:**
- Modify: `docs/STYLE_GUIDE.md`
- Test: `App/tests/merchant-products-scene.test.ts`
- Test: `App/tests/merchant-profile-scene.test.ts`
- Test: `App/tests/merchant-product-storage.test.ts`
- Test: `App/tests/merchant-default-pricing-storage.test.ts`

- [ ] **Step 1: 将商家主题弹窗标准写入视觉规范**

内容至少包括：
- 标题居中、说明文案居中。
- 暖粉橙渐变浅底承托层。
- 主次按钮使用统一 `merchant-button-token`。
- 危险操作使用 `danger outline` 或同等级自定义 shell，不允许默认系统样式混入。
- 商品删除、订单流转确认、回收站永久删除统一复用同一套类名和视觉层级。

- [ ] **Step 2: 运行 TypeScript 与全部相关测试**

Run:
```bash
npx tsx --test tests/merchant-products-scene.test.ts tests/merchant-profile-scene.test.ts tests/merchant-product-storage.test.ts tests/merchant-default-pricing-storage.test.ts
npx tsc --noEmit
```
Expected:
- 全部 PASS
- TypeScript 无 `any`、无类型报错

- [ ] **Step 3: 人工回归清单整理（微信开发者工具 2.01.2510280）**

需要覆盖：
1. 回收站永久删除。
2. 商品删除主题弹窗。
3. “我的页”默认价格默认项编辑、自定义项新增、删除。
4. 商品新增时按层级读取默认价格并填写加价。
5. 编辑已有商品后默认价格更新与加价回填。
6. 层数仅剩 1/2/3 层，顾客端商品展示与价格读取无异常。

- [ ] **Step 4: 提交文档与验证结果**

```bash
git add ../docs/STYLE_GUIDE.md
git commit -m "docs: standardize merchant themed dialogs"
```

---

## Notes / Risks To Carry Into Implementation

- 双层默认项中的 `14寸+10寸乳脂奶油` 与 `10寸+10寸动物奶油` 存在不对称文案风险，按需求原文实现，不擅自更改业务含义；最终回报时单独标注。
- 默认价格修改后，建议新建商品与编辑商品都实时读取最新默认价格；但已有商品仅更新“基础价格参考”，不自动篡改其已保存加价，避免无提示改价。
- 本轮不更新 `docs/TODO.md`，除非大帅后续确认功能完成并要求同步。
