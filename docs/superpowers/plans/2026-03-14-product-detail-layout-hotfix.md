# Product Detail Layout Hotfix Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 修复详情页底部固定操作栏重叠/偏右问题，并将详情页顶部商品预览区提升到接近 2/3 屏高度，且不改变现有业务行为。

**Architecture:** 仅调整 `customer-product-detail` 组件的结构样式参数和 `customer-product-sheet` 的展示高度参数，不改动事件绑定、页面跳转与购物车数据流。先通过样式与组件默认行为对比定位根因，再做最小 CSS/WXML 修复并执行类型与单测回归。

**Tech Stack:** 微信小程序 (WXML/WXSS/TypeScript strict) + TDesign Miniprogram

---

## Chunk 1: Root Cause & Scope Lock

### Task 1: 建立可解释根因（禁止拍脑袋调值）

**Files:**
- Modify: `App/miniprogram/components/customer-product-detail/customer-product-detail.wxss`
- Reference: `App/miniprogram/miniprogram_npm/tdesign-miniprogram/button/button.wxss`
- Reference: `docs/superpowers/previews/2026-03-14-phase3-ui-stability-draft-v2.html`

- [ ] **Step 1: 对比当前底栏栅格与目标图二结构**
  
检查 `grid-template-columns`、容器内边距、左右分组宽度与留白是否匹配目标参考图（左小入口 + 右主操作区）。

- [ ] **Step 2: 对比 TDesign 按钮默认尺寸规则**
  
确认 `t-button` 默认字号与横向 padding 是否导致双按钮在窄宽度下发生内容挤压/溢出。

- [ ] **Step 3: 明确根因假设并锁定最小改动点**
  
根因候选：按钮默认横向 padding 与字号过大 + 右侧双列空间不足 + 选择器未命中导致文本样式未生效。

## Chunk 2: Layout Fix

### Task 2: 重做详情页底部固定操作栏布局

**Files:**
- Modify: `App/miniprogram/components/customer-product-detail/customer-product-detail.wxml`
- Modify: `App/miniprogram/components/customer-product-detail/customer-product-detail.wxss`

- [ ] **Step 1: 保持业务事件不变，仅调整结构语义与按钮尺寸属性**
  
维持 `bindtap` 逻辑与文案透传，必要时为操作按钮声明一致的尺寸模式，保证容器内不重叠。

- [ ] **Step 2: 按图二关系修正容器与分组布局**
  
实现整体居中、左右留白均衡；左侧功能入口尺寸小于右侧主操作按钮区；按钮间距、最小宽度与文字展示稳定。

- [ ] **Step 3: 修正未命中的文本样式选择器**
  
避免使用无效选择器，确保按钮文本在窄屏不发生重叠、挤压与越界。

### Task 3: 调整详情页顶部预览区至约 2/3 屏

**Files:**
- Modify: `App/miniprogram/components/customer-product-detail/customer-product-detail.wxss`
- Modify: `App/miniprogram/components/customer-product-sheet/customer-product-sheet.wxss`

- [ ] **Step 1: 提升详情页主图区域高度到接近 2/3 屏**
  
使用 `vh + rpx` 上下限策略，避免粗暴拉伸和长短屏失真。

- [ ] **Step 2: 同步半屏预览层高度基线**
  
将半屏预览层调整为稳定 2/3 观感，并保留详情图点击放大能力。

- [ ] **Step 3: 复查首屏节奏**
  
确认主图、标题价格、规格区和底栏之间的滚动与视觉重心协调。

## Chunk 3: Verification & Regression

### Task 4: 自动化回归与人工补测清单

**Files:**
- Test: `App/tests/**/*.test.ts`（按现有测试集合执行）

- [ ] **Step 1: 运行 TS 严格类型检查**

Run: `npx --prefix App tsc -p App/tsconfig.json --noEmit`  
Expected: 无类型错误

- [ ] **Step 2: 运行单元测试**

Run: `npm --prefix App run test`  
Expected: 测试通过（或仅存在既有基线失败并记录）

- [ ] **Step 3: 输出微信开发者工具补测步骤**

覆盖路径：顾客首页 -> 商品卡片 -> 半屏预览 -> 上滑进入详情 -> 底部操作栏。  
记录预期：无重叠、无偏右、预览区接近 2/3 屏、图片可放大、业务行为不变。
