# Welcome Screen Redesign Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current foundation-style launch page with the approved Yue Shi welcome screen, including the new cake visual, CTA intro animation, circular reveal transition, and role-based routing handoff.

**Architecture:** Add a dedicated `pages/welcome` launch page and keep the role-routing decision isolated in a small helper so animation state stays local to the page. Implement the cake visual and title styling directly in page markup/WXSS, then drive intro and reveal animations from typed page state in TypeScript.

**Tech Stack:** WeChat Mini Program, TypeScript strict mode, WXML, WXSS, TDesign Mini Program, inline SVG, Git

---

## Chunk 1: Launch Entry And Static Welcome Shell

### Task 1: Add a dedicated welcome page as the app launch entry

**Files:**
- Modify: `App/miniprogram/app.json`
- Create: `App/miniprogram/pages/welcome/welcome.json`
- Create: `App/miniprogram/pages/welcome/welcome.ts`
- Create: `App/miniprogram/pages/welcome/welcome.wxml`
- Create: `App/miniprogram/pages/welcome/welcome.wxss`

- [ ] **Step 1: Move the welcome page to the top of the page list**

Set `pages/welcome/welcome` as the first entry in `App/miniprogram/app.json` so every app launch lands on the welcome screen first.

- [ ] **Step 2: Register page-local TDesign dependencies**

Add only the welcome-page components needed in `App/miniprogram/pages/welcome/welcome.json`, keeping aliases in `t-[name]` format.

- [ ] **Step 3: Create typed welcome page state**

Define a `WelcomePageData` type in `App/miniprogram/pages/welcome/welcome.ts` with fields for `showCake`, `showButton`, `isButtonReady`, `isTransitioning`, and `particleSeeds`.

- [ ] **Step 4: Verify the route order**

Run: `Get-Content -Raw App\\miniprogram\\app.json`
Expected: `pages/welcome/welcome` appears before `pages/index/index`.

### Task 2: Build the approved static visual baseline

**Files:**
- Modify: `App/miniprogram/pages/welcome/welcome.wxml`
- Modify: `App/miniprogram/pages/welcome/welcome.wxss`
- Modify: `App/miniprogram/pages/welcome/welcome.ts`

- [ ] **Step 1: Render the title block exactly as approved**

Add the `悦时` title and `遇见你的专属甜蜜时刻` subtitle in the upper visual zone, using separate layers if needed so the title reads as translucent text with shadow depth instead of outline strokes.

- [ ] **Step 2: Render the cake as a self-contained visual unit**

Use inline SVG or tightly scoped WXML structure to build the pale-pink sponge cake, white cream, three candles, and scattered round candies. Do not reintroduce strawberries.

- [ ] **Step 3: Keep the CTA aligned with TDesign**

Place a `t-button` at the bottom safe area with the `进入主页` label and theme overrides that match the approved gradient and glow.

- [ ] **Step 4: Validate the static shell in source**

Run: `Get-Content -Raw App\\miniprogram\\pages\\welcome\\welcome.wxml`
Expected: title block, cake block, and CTA button all exist in one focused page layout.

## Chunk 2: Intro Motion And Reveal Transition

### Task 3: Add the welcome-page intro animation sequence

**Files:**
- Modify: `App/miniprogram/pages/welcome/welcome.ts`
- Modify: `App/miniprogram/pages/welcome/welcome.wxml`
- Modify: `App/miniprogram/pages/welcome/welcome.wxss`

- [ ] **Step 1: Sequence the initial states**

Initialize the page with the cake visible, then promote the button into view only after the first frame settles.

- [ ] **Step 2: Implement the button materialize animation**

Animate the CTA from center-out expansion with opacity and blur recovery, then unlock click interaction only after the animation completes.

- [ ] **Step 3: Add subtle cake idle motion**

Apply a light float animation to the cake and a pulse animation to the three candle flames without causing layout shift.

- [ ] **Step 4: Smoke-test the animation flags**

Run: `npx -y -p typescript tsc --noEmit -p App\\tsconfig.json`
Expected: exit code 0 with no implicit-`any` regressions from the new page state.

### Task 4: Implement circular reveal and isolate role routing

**Files:**
- Create: `App/miniprogram/utils/role-entry.ts`
- Modify: `App/miniprogram/pages/welcome/welcome.ts`
- Modify: `App/miniprogram/pages/welcome/welcome.wxml`
- Modify: `App/miniprogram/pages/welcome/welcome.wxss`

- [ ] **Step 1: Extract role-to-target resolution**

Create a small helper in `App/miniprogram/utils/role-entry.ts` that converts `admin | merchant | customer` into the next page path and message metadata.

- [ ] **Step 2: Add the reveal overlay and particle layer**

Render a screen-centered circular mask plus a lightweight particle tail layer that can be driven entirely by page state.

- [ ] **Step 3: Start routing during the transition**

On CTA tap, set `isTransitioning`, launch the reveal, start or continue `OpenID` lookup, resolve the role, and navigate only after the reveal finishes.

- [ ] **Step 4: Add a safe fallback path**

If role lookup fails or returns empty, route to the existing customer-side placeholder at `pages/index/index` and log the failure path for later hardening.

## Chunk 3: Documentation And Verification

### Task 5: Keep documentation aligned with the shipped welcome screen

**Files:**
- Modify: `docs/PRD.md`
- Modify: `docs/STYLE_GUIDE.md`
- Modify: `docs/superpowers/specs/2026-03-11-welcome-screen-design.md`

- [ ] **Step 1: Confirm the welcome-page wording still matches**

Check that the launch trigger, subtitle text, cake decorations, and transition description in docs still match the implementation.

- [ ] **Step 2: Record any deviation immediately**

If implementation changes timing, decoration density, or route fallback behavior, update the spec and PRD in the same commit.

### Task 6: Verify in TypeScript and WeChat DevTools

**Files:**
- Modify: None

- [ ] **Step 1: Run TypeScript verification**

Run: `npx -y -p typescript tsc --noEmit -p App\\tsconfig.json`
Expected: exit code 0.

- [ ] **Step 2: Review changed files**

Run: `git status --short`
Expected: only the welcome-page files and synchronized docs are modified.

- [ ] **Step 3: Run manual WeChat DevTools verification**

Use WeChat DevTools `2.01.2510280` and confirm:
- every launch opens the welcome page first;
- the title remains translucent without hard outlines;
- the cake uses colored round candies and pale-pink sponge;
- the CTA materializes from the center;
- tapping the CTA performs a screen-centered circular reveal with visible easing and particle detail.
