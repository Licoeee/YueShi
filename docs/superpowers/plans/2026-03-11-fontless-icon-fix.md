# Fontless Icon Fix Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the first-phase homepage's dependency on TDesign font icons so WeChat DevTools preview and real-device debugging no longer fail on font loading.

**Architecture:** Treat the issue as a rendering-platform constraint rather than a missing asset. Strip `@font-face` from the patched TDesign icon stylesheets so the renderer stops requesting fonts, then remove the only active icon usages on the current homepage to avoid displaying missing glyphs.

**Tech Stack:** WeChat Mini Program, TDesign Mini Program, WXSS, Git worktree

---

## Chunk 1: Remove Font Requests

### Task 1: Neutralize TDesign icon font loading

**Files:**
- Modify: `App/miniprogram/miniprogram_npm/tdesign-miniprogram/icon/icon.wxss`
- Modify: `App/miniprogram/node_modules/tdesign-miniprogram/miniprogram_dist/icon/icon.wxss`

- [ ] **Step 1: Remove `@font-face` from the generated icon stylesheet**

Keep the existing icon class rules, but delete the font-face declaration so no local or remote font request is emitted.

- [ ] **Step 2: Mirror the same change in the source package stylesheet**

Patch the source package copy so future `构建 npm` results stay aligned.

## Chunk 2: Remove Active Icon Usage

### Task 2: Make the first-phase page icon-free

**Files:**
- Modify: `App/miniprogram/pages/index/index.wxml`

- [ ] **Step 1: Remove the decorative header icon**

Replace the explicit `t-icon` in the hero meta row with a non-font visual marker.

- [ ] **Step 2: Disable the search component's default left icon**

Pass an empty `leftIcon` value so `t-search` no longer renders the built-in search icon.

## Chunk 3: Verification

### Task 3: Verify the fontless path

**Files:**
- Modify: None

- [ ] **Step 1: Confirm no `@font-face` remains in the patched icon stylesheets**

Run: `Get-Content -TotalCount 1 App\miniprogram\miniprogram_npm\tdesign-miniprogram\icon\icon.wxss`
Expected: the first line starts with `@import` and does not contain `@font-face`.

- [ ] **Step 2: Re-run TypeScript verification**

Run: `npx -y -p typescript tsc --noEmit -p App\tsconfig.json`
Expected: exit code 0.

- [ ] **Step 3: Provide the exact DevTools retest sequence**

Document the cache clear, npm rebuild, compile, and real-device-debug expectations for the updated page.
