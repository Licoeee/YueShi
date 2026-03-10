# Font And Background Fix Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the first-phase homepage so TDesign icon assets no longer depend on remote fonts during preview/real-device debugging, and eliminate the background seam observed while scrolling.

**Architecture:** Keep the repair narrow. Localize the TDesign icon font into the project and patch both the source package and generated `miniprogram_npm` output to reference the local file, then convert the page background into a dedicated fixed layer so long pages no longer show a viewport-sized gradient break.

**Tech Stack:** WeChat Mini Program, TDesign Mini Program, WXSS, Git worktree

---

## Chunk 1: Local Icon Font

### Task 1: Vendor the TDesign icon font locally

**Files:**
- Create: `App/miniprogram/node_modules/tdesign-miniprogram/miniprogram_dist/icon/t.woff`
- Create: `App/miniprogram/miniprogram_npm/tdesign-miniprogram/icon/t.woff`
- Modify: `App/miniprogram/node_modules/tdesign-miniprogram/miniprogram_dist/icon/icon.wxss`
- Modify: `App/miniprogram/miniprogram_npm/tdesign-miniprogram/icon/icon.wxss`

- [ ] **Step 1: Download the official `t.woff` font once**

Fetch `https://tdesign.gtimg.com/icon/0.4.1/fonts/t.woff` into the source icon directory.

- [ ] **Step 2: Copy the font into generated output**

Copy the same `t.woff` into the `miniprogram_npm` icon directory so the current worktree can run immediately.

- [ ] **Step 3: Switch icon WXSS to local font loading**

Replace the remote `@font-face` URLs with a single local `url(./t.woff) format('woff')` entry in both icon stylesheets.

## Chunk 2: Background Layer

### Task 2: Move the homepage gradient into a fixed background layer

**Files:**
- Modify: `App/miniprogram/pages/index/index.wxml`
- Modify: `App/miniprogram/pages/index/index.wxss`
- Modify: `App/miniprogram/app.wxss`

- [ ] **Step 1: Add a dedicated background node**

Wrap the existing page content in a content container and prepend a fixed background view.

- [ ] **Step 2: Keep content above the background**

Add layout styles so the background remains fixed while content scrolls cleanly above it.

- [ ] **Step 3: Reduce the global page background to a flat fallback**

Keep a soft fallback background color on `page`, but let the dedicated background layer own the gradient.

## Chunk 3: Verification

### Task 3: Verify the repair points

**Files:**
- Modify: None

- [ ] **Step 1: Verify icon WXSS no longer references the remote host**

Run: `Select-String -Path App\miniprogram\**\icon.wxss -Pattern 'tdesign.gtimg.com/icon'`
Expected: no matches in patched icon stylesheets.

- [ ] **Step 2: Verify TypeScript still passes**

Run: `npx -y -p typescript tsc --noEmit -p App\tsconfig.json`
Expected: exit code 0.

- [ ] **Step 3: Prepare deterministic DevTools retest instructions**

Document the exact clean-cache, build, preview, and real-device-debug sequence plus the expected visual result.
