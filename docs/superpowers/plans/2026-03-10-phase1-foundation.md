# Phase 1 Foundation Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete the first-phase project foundation for the Yue Shi mini program by fixing TDesign base wiring, adding domain type declarations, and defining reusable global theme tokens in an isolated worktree.

**Architecture:** Keep the footprint small and focused on project scaffolding. Rework the default index page into a TDesign-based foundation preview so the app has an immediate rendering target, add standalone declaration files for business entities under `App/types`, and tighten TypeScript scope so the local project checks only source files instead of generated vendor declarations.

**Tech Stack:** WeChat Mini Program, TypeScript strict mode, TDesign Mini Program, WXSS custom properties, Git worktree

---

## Chunk 1: Workspace And TypeScript Baseline

### Task 1: Narrow TypeScript scope to application sources

**Files:**
- Modify: `App/tsconfig.json`

- [ ] **Step 1: Exclude generated and duplicated declaration directories**

Update `exclude` so `App/miniprogram/node_modules` and `App/miniprogram/miniprogram_npm` are not typechecked.

- [ ] **Step 2: Include domain declaration files explicitly**

Ensure `include` covers `App/types/**/*.d.ts` in addition to project TypeScript sources.

- [ ] **Step 3: Verify the config shape**

Run: `Get-Content -Raw App\tsconfig.json`
Expected: `include` covers `types/**/*.d.ts` and `exclude` covers generated dependency folders.

## Chunk 2: TDesign Foundation Wiring

### Task 2: Add global TDesign component registration and theme manifest

**Files:**
- Modify: `App/miniprogram/app.json`
- Create: `App/miniprogram/t-design.json`

- [ ] **Step 1: Register shared TDesign components globally**

Add `usingComponents` entries in `App/miniprogram/app.json` using `t-[name]` aliases only.

- [ ] **Step 2: Create theme token manifest**

Create `App/miniprogram/t-design.json` with the sunset, peach, and pink tokens plus radius and glow metadata used by the app shell.

- [ ] **Step 3: Sanity-check component paths**

Run: `Get-ChildItem App\miniprogram\miniprogram_npm\tdesign-miniprogram`
Expected: registered component directories exist.

### Task 3: Replace the starter page with a TDesign-based foundation preview

**Files:**
- Modify: `App/miniprogram/pages/index/index.ts`
- Modify: `App/miniprogram/pages/index/index.wxml`
- Modify: `App/miniprogram/pages/index/index.wxss`
- Modify: `App/miniprogram/pages/index/index.json`

- [ ] **Step 1: Remove starter avatar logic**

Replace the default scaffold with typed static data that describes the first-phase checkpoints.

- [ ] **Step 2: Build the preview using TDesign components**

Use globally registered `t-search`, `t-tag`, `t-cell`, `t-cell-group`, `t-divider`, `t-button`, and `t-icon` components as the primary UI.

- [ ] **Step 3: Style the page against the global theme tokens**

Apply the PRD/STYLE_GUIDE colors, spacing, rounded corners, and glow effects with WXSS variables instead of hardcoded duplicates.

## Chunk 3: Domain Types And Global Theme Tokens

### Task 4: Add business declaration files for role, order, product, and user

**Files:**
- Create: `App/types/role.d.ts`
- Create: `App/types/order.d.ts`
- Create: `App/types/product.d.ts`
- Create: `App/types/user.d.ts`

- [ ] **Step 1: Define role declarations**

Add role literals and role-session metadata for `admin`, `merchant`, and `customer`.

- [ ] **Step 2: Define product and order declarations**

Add product specs, catalog status, order status, pickup slot, and order item declarations aligned with the PRD.

- [ ] **Step 3: Define user declarations**

Add customer, merchant, and admin profile declarations that reference the shared role and order/product types where needed.

### Task 5: Define reusable global app-shell theme tokens

**Files:**
- Modify: `App/miniprogram/app.wxss`

- [ ] **Step 1: Add color, radius, and glow variables**

Define `--color-sunset`, `--color-peach`, `--color-pink`, `--radius-lg`, and `--glow-effect`.

- [ ] **Step 2: Add shared shell styles**

Set the global page background, text color, and card/button helper classes used by the foundation preview.

## Chunk 4: Verification

### Task 6: Verify the first-phase baseline

**Files:**
- Modify: None

- [ ] **Step 1: Run TypeScript verification**

Run: `npx -y -p typescript tsc --noEmit -p App\tsconfig.json`
Expected: exit code 0

- [ ] **Step 2: Inspect git diff**

Run: `git status --short`
Expected: only the planned first-phase files are modified or added in the worktree.

- [ ] **Step 3: Record the manual DevTools verification gap**

Document that WeChat DevTools `2.01.2510280` visual rendering still requires local GUI confirmation because no CLI was found on this machine.
