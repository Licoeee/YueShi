# Merchant Orders Calendar Full Date Range Fix Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 修复商家端订单管理日历默认只允许选择当天及未来日期的问题，显式开放历史与未来任意日期筛选。

**Architecture:** 先通过 TDesign 日历组件源码确认默认 `minDate` 会回退到当天，再用结构测试锁定订单页必须显式传入日历范围；实现层只在订单页补充稳定的历史/未来边界时间戳，不改现有订单过滤和状态流转逻辑。

**Tech Stack:** 微信小程序、TypeScript 严格模式、TDesign Miniprogram Calendar、Node `node:test`

---

## Chunk 1: 根因锁定与失败测试

### Task 1: 为订单页日历范围补失败测试

**Files:**
- Modify: `App/tests/merchant-orders-scene.test.ts`
- Inspect: `App/miniprogram/components/merchant-orders-scene/merchant-orders-scene.wxml`
- Inspect: `App/miniprogram/components/merchant-orders-scene/merchant-orders-scene.ts`
- Inspect: `App/miniprogram/miniprogram_npm/tdesign-miniprogram/calendar/calendar.js`

- [ ] **Step 1: 增加结构断言，要求订单页给 `t-calendar` 显式传入 `minDate` / `maxDate`**
- [ ] **Step 2: 运行 `npx tsx --test tests/merchant-orders-scene.test.ts`，确认当前红灯**

## Chunk 2: 最小实现与验证

### Task 2: 为订单页显式设置完整日期范围

**Files:**
- Modify: `App/miniprogram/components/merchant-orders-scene/merchant-orders-scene.ts`
- Modify: `App/miniprogram/components/merchant-orders-scene/merchant-orders-scene.wxml`
- Modify: `App/tests/merchant-orders-scene.test.ts`

- [ ] **Step 1: 在订单页增加稳定的历史起点和未来终点时间戳字段**
- [ ] **Step 2: 把 `minDate` / `maxDate` 绑定到 `t-calendar`，保持现有筛选逻辑不变**
- [ ] **Step 3: 运行 `npx tsx --test tests/merchant-orders-scene.test.ts` 与 `npx tsc --noEmit`，确认绿灯**
