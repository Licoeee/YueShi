# Merchant Products Layout Selection Scroll Fix Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 修复商家商品管理页双列瀑布流失效、勾选控件不统一、商品新增/编辑弹窗无法内部滚动的问题，并保持现有商品 CRUD/批量编辑/回收站能力不回退。

**Architecture:** 以 `merchant-products-scene` 为单点收敛修复对象，先把“布局容器”和“选择状态容器”解耦，再统一勾选组件的图标语义与样式变量，最后把底部弹窗拆成“固定头部 + 可滚动内容区 + 固定操作区”的稳定结构。测试先覆盖结构和状态，再写最小实现通过，避免继续在已有补丁式样式上碰运气。

**Tech Stack:** 微信小程序、TypeScript 严格模式、TDesign Miniprogram、Node `tsx --test`

---

## Chunk 1: 根因验证与结构性测试

### Task 1: 为商品页布局与弹窗结构补失败测试

**Files:**
- Modify: `App/tests/merchant-products-scene.test.ts`
- Inspect: `App/miniprogram/components/merchant-products-scene/merchant-products-scene.wxml`
- Inspect: `App/miniprogram/components/merchant-products-scene/merchant-products-scene.wxss`

- [ ] **Step 1: 写失败测试，约束真实目标结构**

```ts
test('merchant products scene keeps waterfall layout outside checkbox-group wrapper', () => {
  const wxml = readWorkspaceFile('App/miniprogram/components/merchant-products-scene/merchant-products-scene.wxml')

  assert.doesNotMatch(wxml, /<t-checkbox-group[^>]*>\s*<view class="merchant-products-scene__waterfall"/)
  assert.match(wxml, /class="merchant-products-scene__selection"/)
})

test('merchant products scene uses scroll-view inside product editor popup body', () => {
  const wxml = readWorkspaceFile('App/miniprogram/components/merchant-products-scene/merchant-products-scene.wxml')
  const wxss = readWorkspaceFile('App/miniprogram/components/merchant-products-scene/merchant-products-scene.wxss')

  assert.match(wxml, /scroll-view class="merchant-products-scene__popup-scroll"/)
  assert.match(wxss, /\.merchant-products-scene__popup-shell/)
  assert.match(wxss, /\.merchant-products-scene__popup-scroll/)
})
```

- [ ] **Step 2: 运行测试，确认按预期失败**

Run: `npm test -- merchant-products-scene`
Expected: FAIL，提示当前 WXML 仍把瀑布流包在 `t-checkbox-group` 内，且商品弹窗未使用内部 `scroll-view`

- [ ] **Step 3: 如果失败原因不对，先修正测试再继续**

Run: `npm test -- merchant-products-scene`
Expected: FAIL 原因直接对应本轮目标，而不是拼写错误或无关断言

- [ ] **Step 4: 提交当前测试草稿检查点**

```bash
git add App/tests/merchant-products-scene.test.ts
git commit -m "test: cover merchant product layout regressions"
```

## Chunk 2: 商品瀑布流与勾选体系修复

### Task 2: 解耦选择容器，恢复稳定双列瀑布流

**Files:**
- Modify: `App/miniprogram/components/merchant-products-scene/merchant-products-scene.wxml`
- Modify: `App/miniprogram/components/merchant-products-scene/merchant-products-scene.wxss`
- Modify: `App/miniprogram/components/merchant-products-scene/merchant-products-scene.ts`
- Test: `App/tests/merchant-products-scene.test.ts`

- [ ] **Step 1: 写一个失败测试，约束批量编辑仍保留选择能力**

```ts
test('merchant products scene still exposes batch selection controls within each card', () => {
  const wxml = readWorkspaceFile('App/miniprogram/components/merchant-products-scene/merchant-products-scene.wxml')

  assert.match(wxml, /handleToggleProductSelection/)
  assert.match(wxml, /icon="circle"/)
})
```

- [ ] **Step 2: 运行测试，确认当前实现失败**

Run: `npm test -- merchant-products-scene`
Expected: FAIL，当前卡片选择仍依赖外层 `t-checkbox-group`

- [ ] **Step 3: 写最小实现**

实现要点：
- 将瀑布流外层改为纯 `<view class="merchant-products-scene__waterfall">`
- 单卡内保留独立勾选控件和点击入口，不再让 `t-checkbox-group` 包裹整个布局
- 在 TS 中新增显式选择切换方法，继续复用 `selectedProductIds`
- 移除会把按钮样式污染到卡片按钮和容器宽度计算的重复规则

- [ ] **Step 4: 运行测试验证通过**

Run: `npm test -- merchant-products-scene`
Expected: PASS，且原有商品 CRUD/批量编辑相关断言继续通过

- [ ] **Step 5: 提交布局修复检查点**

```bash
git add App/miniprogram/components/merchant-products-scene/merchant-products-scene.*
git add App/tests/merchant-products-scene.test.ts
git commit -m "fix: restore merchant product waterfall layout"
```

### Task 3: 统一商家商品页所有勾选控件视觉语义

**Files:**
- Modify: `App/miniprogram/components/merchant-products-scene/merchant-products-scene.wxml`
- Modify: `App/miniprogram/components/merchant-products-scene/merchant-products-scene.wxss`
- Test: `App/tests/merchant-products-scene.test.ts`

- [ ] **Step 1: 写失败测试，约束圆形勾选规则**

```ts
test('merchant products scene uses circular filled-or-hollow selection affordances consistently', () => {
  const wxml = readWorkspaceFile('App/miniprogram/components/merchant-products-scene/merchant-products-scene.wxml')
  const wxss = readWorkspaceFile('App/miniprogram/components/merchant-products-scene/merchant-products-scene.wxss')

  assert.match(wxml, /<t-checkbox[^>]*icon="circle"/)
  assert.match(wxml, /<t-radio[^>]*icon="dot"/)
  assert.match(wxss, /--td-checkbox-icon-checked-color/)
  assert.match(wxss, /--td-radio-icon-checked-color/)
})
```

- [ ] **Step 2: 运行测试，确认失败**

Run: `npm test -- merchant-products-scene`
Expected: FAIL，当前商品页未显式统一 `icon` 和勾选变量

- [ ] **Step 3: 写最小实现**

实现要点：
- 规格多选、批量多选、卡片勾选统一使用 `icon="circle"`
- 奶油单选统一使用 `icon="dot"`
- 用商品页局部类名定义同一套颜色、边框、禁用态变量，避免一页一个样

- [ ] **Step 4: 运行测试验证通过**

Run: `npm test -- merchant-products-scene`
Expected: PASS

- [ ] **Step 5: 提交勾选统一检查点**

```bash
git add App/miniprogram/components/merchant-products-scene/merchant-products-scene.wxml
git add App/miniprogram/components/merchant-products-scene/merchant-products-scene.wxss
git add App/tests/merchant-products-scene.test.ts
git commit -m "fix: unify merchant product selection controls"
```

## Chunk 3: 弹窗滚动修复与回归

### Task 4: 为新增/编辑商品弹窗建立稳定的内部滚动链路

**Files:**
- Modify: `App/miniprogram/components/merchant-products-scene/merchant-products-scene.wxml`
- Modify: `App/miniprogram/components/merchant-products-scene/merchant-products-scene.wxss`
- Modify: `App/miniprogram/components/merchant-products-scene/merchant-products-scene.ts`
- Test: `App/tests/merchant-products-scene.test.ts`

- [ ] **Step 1: 写失败测试，约束弹窗为“壳层 + 可滚动内容 + 固定底部按钮”**

```ts
test('merchant product editor popup separates shell scroll content and footer actions', () => {
  const wxml = readWorkspaceFile('App/miniprogram/components/merchant-products-scene/merchant-products-scene.wxml')

  assert.match(wxml, /merchant-products-scene__popup-shell/)
  assert.match(wxml, /merchant-products-scene__popup-scroll/)
  assert.match(wxml, /merchant-products-scene__popup-actions/)
})
```

- [ ] **Step 2: 运行测试，确认当前失败**

Run: `npm test -- merchant-products-scene`
Expected: FAIL，当前弹窗内容仍是普通 `view` 直接堆叠

- [ ] **Step 3: 写最小实现**

实现要点：
- 商品新增/编辑弹窗改成固定高度壳层
- 表单主体放入 `scroll-view scroll-y`
- 头部与底部按钮留在壳层内，不跟随滚动
- 底部补齐 `env(safe-area-inset-bottom)`，避免被 TabBar 或安全区遮挡

- [ ] **Step 4: 运行测试验证通过**

Run: `npm test -- merchant-products-scene`
Expected: PASS

- [ ] **Step 5: 提交弹窗修复检查点**

```bash
git add App/miniprogram/components/merchant-products-scene/merchant-products-scene.*
git add App/tests/merchant-products-scene.test.ts
git commit -m "fix: enable internal scroll for merchant product editor"
```

### Task 5: 运行类型检查与回归验证

**Files:**
- Verify only: `App/miniprogram/components/merchant-products-scene/*`
- Verify only: `App/tests/merchant-products-scene.test.ts`

- [ ] **Step 1: 运行商品页定向测试**

Run: `npm test -- merchant-products-scene`
Expected: PASS

- [ ] **Step 2: 运行 TypeScript 检查并记录现状**

Run: `npx tsc --noEmit`
Expected: 若失败，失败项应仅限已存在的非本轮文件；本轮文件不得新增 TS 错误

- [ ] **Step 3: 运行全量测试**

Run: `npm test`
Expected: PASS；若有失败，定位是否为本轮结构改动引起并立即修正

- [ ] **Step 4: 微信开发者工具回归准备**

补测重点：
- 商品管理页双列瀑布流在手机视口下稳定展示
- 进入批量编辑后，卡片勾选、规格多选、奶油单选视觉一致
- 新增商品、编辑商品弹窗内容超出屏幕后可在弹窗内部完整上下滑动

- [ ] **Step 5: 整理风险与补测说明后再交付**

交付中必须说明：
- 之前瀑布流失效的真实根因
- 仍需大帅在微信开发者工具 `2.01.2510280` 补测的步骤与预期
- 当前仓库中与本轮无关的既有 TS 基线问题
