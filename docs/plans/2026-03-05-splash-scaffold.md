# Splash Scaffold Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Scaffold splash page files and update initial navigation + TODO text.

**Architecture:** Create empty page files and directories only, then point `app.json` to the new splash page. Update the TODO wording to reflect the welcome page visual task without marking completion.

**Tech Stack:** WeChat Mini Program (TypeScript), TDesign conventions.

---

### Task 1: Create splash page folder and files

**Files:**
- Create: `App/miniprogram/pages/splash/`
- Create: `App/miniprogram/pages/splash/splash.wxml`
- Create: `App/miniprogram/pages/splash/splash.wxss`
- Create: `App/miniprogram/pages/splash/splash.ts`
- Create: `App/miniprogram/pages/splash/splash.json`

**Step 1: Create empty files**

Create the folder and the four empty files listed above.

**Step 2: Verify file presence**

Run: `ls App/miniprogram/pages/splash`
Expected: `splash.wxml splash.wxss splash.ts splash.json`

### Task 2: Create custom-tab-bar directory

**Files:**
- Create: `App/miniprogram/custom-tab-bar/`

**Step 1: Create directory**

Create the empty `custom-tab-bar` directory.

**Step 2: Verify directory presence**

Run: `ls App/miniprogram`
Expected: includes `custom-tab-bar/`

### Task 3: Configure splash as first page

**Files:**
- Modify: `App/miniprogram/app.json`

**Step 1: Update pages order**

Move `pages/splash/index` to the top of the `pages` array.

**Step 2: Sanity check**

Ensure the splash page path matches the file structure created in Task 1 (adjust if required).

### Task 4: Update TODO wording

**Files:**
- Modify: `docs/TODO.md`

**Step 1: Rename first task**

Change the first welcome-page task text to “欢迎页视觉落地”, keep it unchecked.
