# DevTools ES6 Fix Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix WeChat DevTools real-device debugging for TDesign components by aligning project compile settings with the ESM output inside `miniprogram_npm`.

**Architecture:** Keep the fix constrained to WeChat project configuration. Enable ES6 compilation in the project config, expose the corresponding toggle in the private config, and verify the resulting settings so the existing TDesign package can be processed correctly during preview and real-device debug.

**Tech Stack:** WeChat Mini Program project config, TDesign Mini Program, Git worktree

---

## Chunk 1: Root-Cause Fix

### Task 1: Enable ES6 compilation for the App project

**Files:**
- Modify: `App/project.config.json`
- Modify: `App/project.private.config.json`

- [ ] **Step 1: Enable the project-level ES6 compile switch**

Set `setting.es6` to `true` in `App/project.config.json`.

- [ ] **Step 2: Surface the ES6 toggle in the private config**

Set `setting.showES6CompileOption` to `true` in `App/project.private.config.json`.

- [ ] **Step 3: Verify config values**

Run: `Get-Content -Raw App\project.config.json`
Expected: `setting.es6` is `true`

## Chunk 2: Manual Verification Guidance

### Task 2: Prepare deterministic DevTools test instructions

**Files:**
- Modify: None

- [ ] **Step 1: Provide rebuild steps**

List the exact DevTools actions required after changing the config.

- [ ] **Step 2: Provide expected outcomes**

List the expected compile, preview, and real-device-debug results for the current first-phase homepage.
