# Cart Delete Dialog Event Fix Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restore the customer cart delete confirmation dialog so tapping the swipe delete action opens the page-level dialog and confirmed deletion still refreshes cart data safely.

**Architecture:** Keep the dialog rendered at the cart page root to avoid transformed-container overlay bugs. Repair the `customer-cart-scene -> role-page-scene -> customer cart page` event handoff with the smallest possible change and cover the regression with a focused test.

**Tech Stack:** WeChat Mini Program, TypeScript, TDesign Mini Program, Node test runner (`tsx --test`)

---

## Chunk 1: Root Cause Lock-In

### Task 1: Compare the broken cart delete flow with existing working `sceneaction` patterns

**Files:**
- Modify: `App/tests/role-page-scene.test.ts`
- Modify: `App/tests/customer-cart-scene.test.ts`
- Modify: `App/miniprogram/components/customer-cart-scene/customer-cart-scene.ts`
- Modify: `App/miniprogram/components/role-page-scene/role-page-scene.ts`

- [ ] **Step 1: Write the failing regression check**

Add a focused assertion that the cart delete request is forwarded with the same `sceneaction` event contract used by other role-page scenes, including the explicit event options needed for cross-component/page delivery.

- [ ] **Step 2: Run the targeted tests to verify the regression check fails**

Run: `npm run test:file -- tests/customer-cart-scene.test.ts tests/role-page-scene.test.ts`
Expected: FAIL because the cart delete `sceneaction` forwarding contract is missing the required event options/assertions.

- [ ] **Step 3: Implement the minimal fix**

Update the cart scene delete request emit and the role-page-scene forwarding emit so both explicitly preserve the `sceneaction` payload across component boundaries while keeping the page-owned dialog flow unchanged.

- [ ] **Step 4: Run targeted tests to verify the fix passes**

Run: `npm run test:file -- tests/customer-cart-scene.test.ts tests/role-page-scene.test.ts`
Expected: PASS with the new forwarding regression check green.

- [ ] **Step 5: Commit**

```bash
git add App/tests/customer-cart-scene.test.ts App/tests/role-page-scene.test.ts App/miniprogram/components/customer-cart-scene/customer-cart-scene.ts App/miniprogram/components/role-page-scene/role-page-scene.ts docs/superpowers/plans/2026-03-15-cart-delete-dialog-event-fix.md
git commit -m "fix: restore cart delete dialog event flow"
```

## Chunk 2: Verification

### Task 2: Re-run full cart-related verification

**Files:**
- Verify only: `App/tests/customer-cart-swipe.test.ts`
- Verify only: `App/miniprogram/pages/customer/cart/cart.ts`
- Verify only: `App/miniprogram/pages/customer/cart/cart.wxml`

- [ ] **Step 1: Run the cart regression test set**

Run: `npm run test:file -- tests/customer-cart-scene.test.ts tests/role-page-scene.test.ts tests/customer-cart-swipe.test.ts`
Expected: PASS

- [ ] **Step 2: Run TypeScript verification**

Run: `npx tsc --noEmit`
Expected: PASS

- [ ] **Step 3: Run the full test suite**

Run: `npm test`
Expected: PASS
