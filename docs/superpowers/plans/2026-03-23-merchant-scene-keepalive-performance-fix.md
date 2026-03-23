# Merchant Scene Keep-Alive Switch Performance Fix Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 修复商家端 scene 模式下 Tab 切换时因场景组件反复销毁重建导致的明显卡顿与底部加载动画长时间悬挂问题。

**Architecture:** 先用结构测试锁定 `role-page-scene` 必须对商家场景采用首次挂载后保活的渲染策略，再把 merchant scenes 从 `wx:elif` 独占切换改为“首次访问 `wx:if` 挂载 + `hidden` 隐藏”的方式，避免每次 Tab 切换都重新执行 `attached` 中的大段同步初始化。

**Tech Stack:** 微信小程序、TypeScript 严格模式、scene-mode role page host、Node `node:test`

---

## Chunk 1: 失败测试

### Task 1: 锁定 role-page-scene 的商家场景保活结构

**Files:**
- Modify: `App/tests/role-page-scene.test.ts`
- Inspect: `App/miniprogram/components/role-page-scene/role-page-scene.ts`
- Inspect: `App/miniprogram/components/role-page-scene/role-page-scene.wxml`

- [ ] **Step 1: 增加断言，要求 merchant scenes 存在 mounted 标记与 hidden 复用结构**
- [ ] **Step 2: 运行 `npx tsx --test tests/role-page-scene.test.ts`，确认当前红灯**

## Chunk 2: 最小实现

### Task 2: 把 merchant scenes 改为首次访问挂载后保活

**Files:**
- Modify: `App/miniprogram/components/role-page-scene/role-page-scene.ts`
- Modify: `App/miniprogram/components/role-page-scene/role-page-scene.wxml`
- Modify: `App/tests/role-page-scene.test.ts`

- [ ] **Step 1: 在 role-page-scene data 中增加 merchant scene 挂载标记**
- [ ] **Step 2: 在 syncScene 中首次访问 merchant renderMode 时置位挂载标记**
- [ ] **Step 3: 在 WXML 中改为 `wx:if + hidden` 复用 merchant scenes，避免每次切换 remount**
- [ ] **Step 4: 运行 `npx tsx --test tests/role-page-scene.test.ts` 与 `npx tsc --noEmit`，确认通过**
