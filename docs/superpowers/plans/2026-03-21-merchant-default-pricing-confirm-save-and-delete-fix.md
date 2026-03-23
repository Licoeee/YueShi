# Merchant Default Pricing Confirm Save And Recycle Fix Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在不破坏商家端现有商品管理、默认价格、回收站与主题弹窗能力的前提下，修复商品回收站永久删除交互失效，补齐默认价格“确认保存”链路，修复自定义添加选不中与商品卡价格错误显示 `0` 的根因，并把商品删除/默认价格删除统一到同一套主题确认弹窗。

**Architecture:** 先按 systematic-debugging 固定 4 条根因证据，再用 TDD 补失败测试，最后分别修复“弹层栈顺序 + 默认价格编辑态 + picker 值回写 + 商品卡价格汇总”四条链路。默认价格继续使用现有 schema 仓储，不回退到旧的维度加价模型；本轮只增加草稿编辑态、显式保存动作和删除确认，不改动顾客端既有价格取值接口。

**Tech Stack:** 微信小程序原生组件、TDesign MiniProgram、TypeScript 严格模式、Node `tsx --test`、项目现有 merchant storage / scene 架构。

---

## Root Cause Snapshot

- **永久删除“点了没反应”**：代码层已存在 `handleDeleteRecycleProductPermanently` 与确认弹层状态字段，`t-popup` 也已注册；异常只发生在“回收站底部弹层内再次弹中心确认层”这条链路。当前回收站 popup 与确认 popup 共用默认 `t-popup` 层级，属于双弹层竞争场景，真实小程序里容易出现确认层被现有底部 popup 视觉压住或反馈不明显，导致用户感知为“永久删除不可点”。修复应收敛为单一明确的确认入口，并显式拉开确认层级。
- **自定义添加能展开但选不中**：`merchant-profile-scene.ts` 中 `handleCustomSizeChange` 只接受 `number` 型 `dataset.index`，但小程序 `data-index="0"` 进入事件后是字符串，直接被 `typeof index !== 'number'` 拦截，导致选择器看起来可操作、实际不回写。
- **默认价格当前静默生效**：`handlePricingInputChange` 直接调用 `updateMerchantDefaultPricingItemPrice` 写入仓储，用户没有明确保存动作，也没有“未保存离开”语义，不符合本轮要求。
- **商品卡价格显示 `0`**：`syncProducts()` 虽先按真实默认价格快照算出 `basePrice`，但 `mapProductToDisplay()` 内又重新调用了一次 `resolveMerchantProductMinSalePrice(product)`，且没传入当前默认价格快照，函数会退回零价种子快照，把卡片价格重新算成 `0`。这属于展示层二次错误重算，不是仓储没保存。

---

## File Map

- Modify: `App/miniprogram/components/merchant-products-scene/merchant-products-scene.ts`
  - 修复商品卡价格汇总逻辑。
  - 收敛回收站永久删除确认链路，避免双 popup 反馈丢失。
  - 保持商品删除弹窗与主题样式一致。
- Modify: `App/miniprogram/components/merchant-products-scene/merchant-products-scene.wxml`
  - 为回收站永久删除确认链路补显式承托与必要的层级参数。
- Modify: `App/miniprogram/components/merchant-products-scene/merchant-products-scene.wxss`
  - 如需，补确认弹层和回收站动作区的层级/承托样式。
- Modify: `App/miniprogram/components/merchant-profile-scene/merchant-profile-scene.ts`
  - 新增默认价格草稿态、保存/放弃逻辑、未保存提示与删除确认状态。
  - 修复自定义添加 picker 选中回写。
- Modify: `App/miniprogram/components/merchant-profile-scene/merchant-profile-scene.wxml`
  - 补“保存默认价格”按钮、未保存提示语义、删除确认弹窗、自定义添加稳定选择器结构。
- Modify: `App/miniprogram/components/merchant-profile-scene/merchant-profile-scene.wxss`
  - 补保存区、编辑态、删除确认与自定义选择区样式。
- Modify: `App/miniprogram/components/merchant-profile-scene/merchant-profile-scene.json`
  - 如切换到更稳定的 TDesign picker / radio / cell，则同步注册组件。
- Modify: `App/miniprogram/utils/merchant-default-pricing-storage.ts`
  - 补批量保存接口或草稿提交辅助函数，避免逐项即时写盘。
- Modify: `App/tests/merchant-products-scene.test.ts`
  - 补商品卡价格显示与永久删除确认链路断言。
- Modify: `App/tests/merchant-profile-scene.test.ts`
  - 补默认价格保存动作、删除确认、自定义选择器稳定结构断言。
- Modify: `App/tests/merchant-product-storage.test.ts`
  - 补“默认价格 100 + 加价 0 => 最终价 100”的回归断言。
- Modify: `App/tests/merchant-default-pricing-storage.test.ts`
  - 补默认价格批量保存/草稿提交断言（如仓储 API 变化）。
- Modify: `docs/STYLE_GUIDE.md`
  - 把商品删除 / 默认价格删除 / 回收站永久删除统一主题弹窗规范补到商家端标准中。

---

## Chunk 1: Failing Tests For Current Regressions

### Task 1: 先写失败测试锁定四条根因

**Files:**
- Modify: `App/tests/merchant-products-scene.test.ts`
- Modify: `App/tests/merchant-profile-scene.test.ts`
- Modify: `App/tests/merchant-product-storage.test.ts`
- Modify: `App/tests/merchant-default-pricing-storage.test.ts`

- [ ] **Step 1: 增加商品卡价格显示快照来源断言**

Run expectation:
```ts
assert.match(source, /mapProductToDisplay/)
assert.match(source, /pricingSnapshot/)
assert.doesNotMatch(source, /resolveMerchantProductMinSalePrice\(product\)\s*$/m)
```

- [ ] **Step 2: 增加默认价格保存动作与删除确认结构断言**

Run expectation:
```ts
assert.match(wxml, /保存默认价格|确认保存/)
assert.match(wxml, /pendingDeletePricingItemId/)
assert.match(wxml, /pricingDraftDirty/)
```

- [ ] **Step 3: 增加自定义添加选择器回写与永久删除确认链路断言**

Run expectation:
```ts
assert.match(source, /parseDatasetIndex|normalizeDatasetIndex/)
assert.match(source, /confirmDialogSource: 'recycle'/)
```

- [ ] **Step 4: 增加默认价格 100 + 加价 0 => 最终价 100 的行为测试**

Run:
```bash
npx tsx --test tests/merchant-product-storage.test.ts
```
Expected: FAIL，当前展示层仍可能把价格重算回 `0`。

- [ ] **Step 5: 运行本轮相关测试，确认红灯来自真实缺口**

Run:
```bash
npx tsx --test tests/merchant-products-scene.test.ts tests/merchant-profile-scene.test.ts tests/merchant-product-storage.test.ts tests/merchant-default-pricing-storage.test.ts
```
Expected:
- `merchant-products-scene` 与 `merchant-profile-scene` 新断言失败。
- `merchant-product-storage` 或场景断言暴露价格快照缺口。

---

## Chunk 2: Default Pricing Draft Save Flow

### Task 2: 把默认价格从“即时写盘”改成“草稿编辑 + 明确保存”

**Files:**
- Modify: `App/miniprogram/components/merchant-profile-scene/merchant-profile-scene.ts`
- Modify: `App/miniprogram/components/merchant-profile-scene/merchant-profile-scene.wxml`
- Modify: `App/miniprogram/components/merchant-profile-scene/merchant-profile-scene.wxss`
- Modify: `App/miniprogram/utils/merchant-default-pricing-storage.ts`
- Test: `App/tests/merchant-profile-scene.test.ts`
- Test: `App/tests/merchant-default-pricing-storage.test.ts`

- [ ] **Step 1: 为默认价格输入建立草稿态数据结构**
- [ ] **Step 2: 输入时仅更新本地草稿，不立即写 storage**
- [ ] **Step 3: 新增“保存默认价格”动作，确认后统一写盘并刷新页面**
- [ ] **Step 4: 补未保存态提示与离开关闭时的回退策略**
- [ ] **Step 5: 运行 profile / pricing storage 测试**

Run:
```bash
npx tsx --test tests/merchant-profile-scene.test.ts tests/merchant-default-pricing-storage.test.ts
```
Expected: PASS

---

## Chunk 3: Custom Picker And Delete Confirmation Fixes

### Task 3: 修复自定义添加选不中，并为默认价格删除增加主题确认

**Files:**
- Modify: `App/miniprogram/components/merchant-profile-scene/merchant-profile-scene.ts`
- Modify: `App/miniprogram/components/merchant-profile-scene/merchant-profile-scene.wxml`
- Modify: `App/miniprogram/components/merchant-profile-scene/merchant-profile-scene.wxss`
- Test: `App/tests/merchant-profile-scene.test.ts`

- [ ] **Step 1: 统一把 picker dataset index 归一化为 number，再更新 `customSizeIndexes` / `customCreamIndex`**
- [ ] **Step 2: 若原生 `picker` 在 popup 中继续不稳，切换为更稳定的单一主题选择器壳层，但保留现有视觉语言**
- [ ] **Step 3: 删除默认价格项前接入商家统一主题确认弹窗**
- [ ] **Step 4: 运行 profile 场景测试**

Run:
```bash
npx tsx --test tests/merchant-profile-scene.test.ts
```
Expected: PASS

---

## Chunk 4: Products Scene Price Summary And Recycle Delete Fixes

### Task 4: 修复商品卡价格显示与回收站永久删除确认反馈

**Files:**
- Modify: `App/miniprogram/components/merchant-products-scene/merchant-products-scene.ts`
- Modify: `App/miniprogram/components/merchant-products-scene/merchant-products-scene.wxml`
- Modify: `App/miniprogram/components/merchant-products-scene/merchant-products-scene.wxss`
- Test: `App/tests/merchant-products-scene.test.ts`
- Test: `App/tests/merchant-product-storage.test.ts`

- [ ] **Step 1: 让 `mapProductToDisplay` 直接消费已算好的价格，或显式接收 `pricingSnapshot`，禁止二次用零价种子重算**
- [ ] **Step 2: 将回收站永久删除确认链路收敛为明确高层级主题弹层，避免与底部回收站 popup 竞争层级**
- [ ] **Step 3: 保持商品删除与永久删除共用同一套主题 dialog shell 文案与按钮体系**
- [ ] **Step 4: 运行商品场景与仓储测试**

Run:
```bash
npx tsx --test tests/merchant-products-scene.test.ts tests/merchant-product-storage.test.ts
```
Expected: PASS

---

## Chunk 5: Dialog Standard Doc And Final Verification

### Task 5: 文档同步与最终校验

**Files:**
- Modify: `docs/STYLE_GUIDE.md`
- Test: `App/tests/merchant-products-scene.test.ts`
- Test: `App/tests/merchant-profile-scene.test.ts`
- Test: `App/tests/merchant-product-storage.test.ts`
- Test: `App/tests/merchant-default-pricing-storage.test.ts`

- [ ] **Step 1: 在风格规范中补充商家端统一主题确认弹窗适用范围与层级规则**
- [ ] **Step 2: 运行全部相关自动化测试**

Run:
```bash
npx tsx --test tests/merchant-products-scene.test.ts tests/merchant-profile-scene.test.ts tests/merchant-product-storage.test.ts tests/merchant-default-pricing-storage.test.ts
npx tsc --noEmit
```
Expected:
- 全部 PASS
- 无 TS 严格模式报错

- [ ] **Step 3: 整理微信开发者工具 2.01.2510280 补测清单**

必须覆盖：
1. 默认价格修改但未保存时离开/返回。
2. 保存默认价格后，新增商品不填加价时卡片显示基础价。
3. 自定义添加弹窗选择尺寸/奶油并确认新增。
4. 默认价格项删除二次确认。
5. 商品回收站永久删除确认链路。

---

## Notes / Risks

- 双层默认项中的 `14寸+10寸乳脂奶油` / `10寸+10寸动物奶油` 仍按需求原文保留，不擅自修正文案业务含义。
- `动物奶油i` 继续保持现有兼容口径，不在本轮改名。
- 若真实微信开发者工具里 `picker` 在 popup 中仍异常，需要以真实交互结果为准，不能拿自动化绿灯替代。
