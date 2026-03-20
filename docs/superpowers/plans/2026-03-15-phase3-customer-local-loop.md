# Phase 3 Customer Local Loop Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver the customer-side local closed loop for cart, checkout, orders, note detail, profile, settings, and login-gated critical actions without breaking role isolation or existing customer flows.

**Architecture:** Extend the existing local repository pattern instead of rebuilding it. Keep cart and order storage in `utils`, add a small customer session/settings layer for login state and phone history, and update customer scene components/pages to render from snapshots rather than backtracking into the catalog.

**Tech Stack:** WeChat Mini Program (WXML/WXSS/TS), TDesign Mini Program components, TypeScript strict mode, `tsx` + `node:test`, local `wx` storage.

---

## Chunk 1: Docs And Local Domain Contracts

### Task 1: Sync Product And Project Docs Before Code

**Files:**
- Modify: `docs/PRD.md`
- Modify: `docs/STYLE_GUIDE.md`
- Modify: `docs/TODO.md`

- [ ] **Step 1: Update PRD scope wording for this round**

Add or revise customer-side wording so it explicitly states:

- this round is local persistence plus front-end closure
- browsing can stay anonymous
- critical actions require login
- phone history and lightweight settings are in scope
- search by product ID is deferred until unified product IDs exist

- [ ] **Step 2: Update style guide for the new customer interactions**

Add visual rules for:

- cart checked cards
- swipe-delete action style
- orders status-tab capsule styling
- customer profile card and settings page rhythm

- [ ] **Step 3: Update TODO structure without marking completion**

Add pending items for:

- local customer session and login gate
- phone history management
- cart swipe delete and select-all
- customer profile/settings
- deferred product-ID search dependency

- [ ] **Step 4: Review the docs diff before continuing**

Run:

```bash
git diff -- docs/PRD.md docs/STYLE_GUIDE.md docs/TODO.md
```

Expected: only wording and TODO-structure updates, with no premature checkbox completion.

### Task 2: Extend Shared Type Contracts For Snapshot-Driven Rendering

**Files:**
- Modify: `App/types/cart.d.ts`
- Modify: `App/types/order.d.ts`
- Modify: `App/types/checkout.d.ts`
- Create: `App/types/customer-session.d.ts`
- Test: `App/tests/customer-cart-storage.test.ts`
- Test: `App/tests/customer-order-repository.test.ts`

- [ ] **Step 1: Write failing tests for the new snapshot fields**

Add assertions that cart/order/checkout snapshots preserve:

- `coverImage`
- `specLabel`
- `creamLabel`

Example:

```ts
assert.equal(item.creamLabel, '动物奶油')
assert.equal(order.items[0]?.coverImage, '/assets/cakes/sample-cover.png')
```

- [ ] **Step 2: Run the focused tests and confirm the new fields are missing**

Run:

```bash
npm --prefix App run test:file -- tests/customer-cart-storage.test.ts tests/customer-order-repository.test.ts
```

Expected: FAIL because the snapshot fields are not yet modeled consistently.

- [ ] **Step 3: Add the minimal type extensions**

Update types so:

- `CartItemRecord` includes `specLabel` and `creamLabel`
- `CheckoutItemRecord` keeps `coverImage`, `specLabel`, and `creamLabel`
- `OrderItem` includes `coverImage`, `specLabel`, and `creamLabel`
- `customer-session.d.ts` defines the local customer session shape and phone-history types

- [ ] **Step 4: Re-run the focused type-related tests**

Run:

```bash
npm --prefix App run test:file -- tests/customer-cart-storage.test.ts tests/customer-order-repository.test.ts
```

Expected: PASS for the type-backed snapshot assertions.

## Chunk 2: Customer Local Session, Phone History, And Action Gate

### Task 3: Add Local Customer Session Storage

**Files:**
- Create: `App/miniprogram/utils/customer-session-storage.ts`
- Create: `App/miniprogram/utils/customer-session.ts`
- Test: `App/tests/customer-session-storage.test.ts`

- [ ] **Step 1: Write failing tests for load/save/clear session**

Cover:

- empty storage returns logged-out state
- saved session reloads correctly
- clear removes session state only

- [ ] **Step 2: Run the new session-storage test**

Run:

```bash
npm --prefix App run test:file -- tests/customer-session-storage.test.ts
```

Expected: FAIL because the session utilities do not exist yet.

- [ ] **Step 3: Implement local customer session helpers**

Implement:

- memory storage adapter for tests
- `loadStoredCustomerSession`
- `saveStoredCustomerSession`
- `clearStoredCustomerSession`
- session shape normalization

- [ ] **Step 4: Re-run the session-storage test**

Run:

```bash
npm --prefix App run test:file -- tests/customer-session-storage.test.ts
```

Expected: PASS.

### Task 4: Add Phone History Storage

**Files:**
- Create: `App/miniprogram/utils/customer-phone-history-storage.ts`
- Test: `App/tests/customer-phone-history-storage.test.ts`

- [ ] **Step 1: Write failing tests for phone history dedupe and clear behavior**

Cover:

- invalid phone is ignored
- repeated phone numbers dedupe to one record
- newest entry moves to the front
- clear removes all history

- [ ] **Step 2: Run the phone-history test**

Run:

```bash
npm --prefix App run test:file -- tests/customer-phone-history-storage.test.ts
```

Expected: FAIL because the phone-history module does not exist yet.

- [ ] **Step 3: Implement phone history helpers**

Implement:

- `loadStoredPhoneHistory`
- `savePhoneToHistory`
- `removePhoneFromHistory`
- `clearStoredPhoneHistory`

Rules:

- only valid 11-digit phone numbers
- dedupe on save
- newest-first order
- stable maximum length

- [ ] **Step 4: Re-run the phone-history test**

Run:

```bash
npm --prefix App run test:file -- tests/customer-phone-history-storage.test.ts
```

Expected: PASS.

### Task 5: Gate Customer Critical Actions Behind Login

**Files:**
- Create: `App/miniprogram/utils/customer-action-gate.ts`
- Modify: `App/miniprogram/pages/customer/product-detail/product-detail.ts`
- Modify: `App/miniprogram/components/customer-cart-scene/customer-cart-scene.ts`
- Modify: `App/miniprogram/pages/customer/checkout/checkout.ts`
- Test: `App/tests/customer-action-gate.test.ts`

- [ ] **Step 1: Write failing tests for action gating**

Cover:

- logged-in session executes action immediately
- logged-out session triggers login flow before action
- login cancellation prevents mutation

- [ ] **Step 2: Run the action-gate test**

Run:

```bash
npm --prefix App run test:file -- tests/customer-action-gate.test.ts
```

Expected: FAIL because the gate utility does not exist yet.

- [ ] **Step 3: Implement the shared gate and wire it into customer actions**

Use one helper to wrap:

- `handleAddToCart`
- `handleBuyNow`
- `handleCheckout`
- `handleSubmit`

The helper should:

- inspect the stored customer session
- if needed, trigger a local WeChat login/profile acquisition flow
- persist session snapshot
- continue the original callback only on success

- [ ] **Step 4: Re-run the action-gate test**

Run:

```bash
npm --prefix App run test:file -- tests/customer-action-gate.test.ts
```

Expected: PASS.

## Chunk 3: Cart And Product Snapshot Upgrade

### Task 6: Freeze Cream Options And Preserve Snapshot Labels

**Files:**
- Modify: `App/miniprogram/utils/customer-product-selection.ts`
- Modify: `App/miniprogram/utils/customer-cake-catalog.ts`
- Test: `App/tests/customer-product-selection.test.ts`

- [ ] **Step 1: Write failing tests for the fixed cream options**

Assert that product selection exposes only:

- `乳脂奶油`
- `动物奶油`
- `裸蛋糕`

And that cart snapshots carry `creamLabel`.

- [ ] **Step 2: Run the product-selection test**

Run:

```bash
npm --prefix App run test:file -- tests/customer-product-selection.test.ts
```

Expected: FAIL because cream options and snapshot fields are not yet aligned.

- [ ] **Step 3: Implement the fixed cream-option contract**

Update the catalog/selection path so the default product data and `buildCartItemFromSelection` emit the frozen cream options and snapshot labels.

- [ ] **Step 4: Re-run the product-selection test**

Run:

```bash
npm --prefix App run test:file -- tests/customer-product-selection.test.ts
```

Expected: PASS.

### Task 7: Add Select-All, Delete, And Stable Summary Layout To Cart State

**Files:**
- Modify: `App/miniprogram/utils/customer-cart-state.ts`
- Test: `App/tests/customer-cart-state-extended.test.ts`

- [ ] **Step 1: Write failing tests for cart mutations**

Cover:

- select all checks all items
- clear all unchecks all items
- deleting an item removes it cleanly
- checked amount remains accurate

- [ ] **Step 2: Run the new cart-state test**

Run:

```bash
npm --prefix App run test:file -- tests/customer-cart-state-extended.test.ts
```

Expected: FAIL because the new helpers do not exist yet.

- [ ] **Step 3: Add minimal cart-state helpers**

Implement:

- `toggleAllCartItemsChecked`
- `removeCartItem`
- `areAllCartItemsChecked`

Keep the existing `toggleCartItemChecked` behavior intact.

- [ ] **Step 4: Re-run the cart-state test**

Run:

```bash
npm --prefix App run test:file -- tests/customer-cart-state-extended.test.ts
```

Expected: PASS.

### Task 8: Upgrade The Customer Cart Scene UI

**Files:**
- Modify: `App/miniprogram/components/customer-cart-scene/customer-cart-scene.ts`
- Modify: `App/miniprogram/components/customer-cart-scene/customer-cart-scene.wxml`
- Modify: `App/miniprogram/components/customer-cart-scene/customer-cart-scene.wxss`
- Test: `App/tests/customer-cart-scene.test.ts`

- [ ] **Step 1: Extend structural tests for cart visuals**

Assert that the cart scene contains:

- cover image rendering
- select-all affordance
- swipe-cell wrapper
- stable summary grouping

- [ ] **Step 2: Run the cart-scene test**

Run:

```bash
npm --prefix App run test:file -- tests/customer-cart-scene.test.ts
```

Expected: FAIL because the cart scene still uses the flat checkbox list.

- [ ] **Step 3: Implement the cart scene upgrade**

Render each item with:

- `t-swipe-cell`
- cover image
- card copy block
- separate checked control
- warm highlighted checked state

Footer must keep:

- `合计` and amount on one line
- checkout button fixed on the right
- select-all control on the left side of the footer group

- [ ] **Step 4: Re-run the cart-scene test**

Run:

```bash
npm --prefix App run test:file -- tests/customer-cart-scene.test.ts
```

Expected: PASS.

## Chunk 4: Checkout Flow, Natural-Month Pickup Picker, And Orders Snapshot Display

### Task 9: Replace The Pickup Picker With A Natural-Month Model

**Files:**
- Modify: `App/miniprogram/utils/customer-pickup-slot.ts`
- Test: `App/tests/customer-pickup-slot.test.ts`

- [ ] **Step 1: Write failing tests for month/day generation**

Cover:

- January exposes 31 days
- April exposes 30 days
- February exposes 28 days in common years
- February exposes 29 days in leap years
- selected past times still fail validation

- [ ] **Step 2: Run the pickup-slot test**

Run:

```bash
npm --prefix App run test:file -- tests/customer-pickup-slot.test.ts
```

Expected: FAIL because the module still uses a rolling 14-day window.

- [ ] **Step 3: Implement month-length and leap-year logic**

Keep the three-column picker contract, but rebuild:

- month options as `1~12`
- day options from the selected month and year context
- time options as the existing half-hour intervals
- final validation against `now`

- [ ] **Step 4: Re-run the pickup-slot test**

Run:

```bash
npm --prefix App run test:file -- tests/customer-pickup-slot.test.ts
```

Expected: PASS.

### Task 10: Upgrade Checkout To Use Images And Phone History

**Files:**
- Modify: `App/miniprogram/pages/customer/checkout/checkout.ts`
- Modify: `App/miniprogram/pages/customer/checkout/checkout.wxml`
- Modify: `App/miniprogram/pages/customer/checkout/checkout.wxss`
- Test: `App/tests/customer-checkout-page.test.ts`
- Test: `App/tests/customer-checkout-state.test.ts`

- [ ] **Step 1: Extend checkout tests**

Assert that checkout now includes:

- product images
- phone-history trigger
- button-aligned footer

Also assert successful submit writes phone history.

- [ ] **Step 2: Run the checkout tests**

Run:

```bash
npm --prefix App run test:file -- tests/customer-checkout-page.test.ts tests/customer-checkout-state.test.ts
```

Expected: FAIL because images/history/footer changes are not present yet.

- [ ] **Step 3: Implement checkout upgrades**

Update checkout so it:

- renders cover images from the checkout snapshot
- opens a TDesign popup or action sheet for history-phone selection
- saves valid phones into history after submit
- nudges the submit button to the right via footer layout

- [ ] **Step 4: Re-run the checkout tests**

Run:

```bash
npm --prefix App run test:file -- tests/customer-checkout-page.test.ts tests/customer-checkout-state.test.ts
```

Expected: PASS.

### Task 11: Show Order Images And Better Status Tabs In Orders And Detail

**Files:**
- Modify: `App/miniprogram/components/customer-orders-scene/customer-orders-scene.ts`
- Modify: `App/miniprogram/components/customer-orders-scene/customer-orders-scene.wxml`
- Modify: `App/miniprogram/components/customer-orders-scene/customer-orders-scene.wxss`
- Modify: `App/miniprogram/pages/customer/order-detail/order-detail.ts`
- Modify: `App/miniprogram/pages/customer/order-detail/order-detail.wxml`
- Modify: `App/miniprogram/pages/customer/order-detail/order-detail.wxss`
- Modify: `App/miniprogram/utils/customer-order-repository.ts`
- Test: `App/tests/customer-orders-scene.test.ts`
- Test: `App/tests/customer-order-detail-page.test.ts`
- Test: `App/tests/customer-order-repository.test.ts`

- [ ] **Step 1: Extend tests for order images and single-line order id**

Add assertions for:

- order-card image slot
- improved tab structure hooks
- order-detail image slot
- one-line order id class or structure
- button-based note and cancel actions

- [ ] **Step 2: Run the order-related tests**

Run:

```bash
npm --prefix App run test:file -- tests/customer-orders-scene.test.ts tests/customer-order-detail-page.test.ts tests/customer-order-repository.test.ts
```

Expected: FAIL because the order snapshot/UI is still incomplete.

- [ ] **Step 3: Implement the order snapshot and UI upgrade**

Update repository creation so order items persist display snapshots, then update list/detail UI to show:

- cover image
- refined status tabs
- single-line order id
- proper TDesign action buttons

- [ ] **Step 4: Re-run the order-related tests**

Run:

```bash
npm --prefix App run test:file -- tests/customer-orders-scene.test.ts tests/customer-order-detail-page.test.ts tests/customer-order-repository.test.ts
```

Expected: PASS.

## Chunk 5: Customer Profile, Settings, And Scene Integration

### Task 12: Add A Real Customer Profile Scene

**Files:**
- Create: `App/miniprogram/components/customer-profile-scene/customer-profile-scene.ts`
- Create: `App/miniprogram/components/customer-profile-scene/customer-profile-scene.wxml`
- Create: `App/miniprogram/components/customer-profile-scene/customer-profile-scene.wxss`
- Modify: `App/miniprogram/components/role-page-scene/role-page-scene.ts`
- Modify: `App/miniprogram/components/role-page-scene/role-page-scene.wxml`
- Modify: `App/miniprogram/components/role-page-scene/role-page-scene.json`
- Modify: `App/miniprogram/utils/role-page-scenes.ts`
- Test: `App/tests/customer-profile-scene.test.ts`

- [ ] **Step 1: Write failing tests for customer-profile render mode**

Assert that:

- role-page-scene exposes a dedicated customer-profile render mode
- the profile scene contains avatar, login/logout, and settings entry

- [ ] **Step 2: Run the profile-scene test**

Run:

```bash
npm --prefix App run test:file -- tests/customer-profile-scene.test.ts
```

Expected: FAIL because customer profile still uses the placeholder scene.

- [ ] **Step 3: Implement the dedicated profile scene**

Use TDesign-only components to render:

- avatar / nickname / login-state card
- login button when logged out
- logout button when logged in
- settings navigation cell or button
- preview-return affordance when admin preview is active

- [ ] **Step 4: Re-run the profile-scene test**

Run:

```bash
npm --prefix App run test:file -- tests/customer-profile-scene.test.ts
```

Expected: PASS.

### Task 13: Add The Lightweight Customer Settings Page

**Files:**
- Create: `App/miniprogram/pages/customer/settings/settings.ts`
- Create: `App/miniprogram/pages/customer/settings/settings.wxml`
- Create: `App/miniprogram/pages/customer/settings/settings.wxss`
- Create: `App/miniprogram/pages/customer/settings/settings.json`
- Modify: `App/miniprogram/app.json`
- Test: `App/tests/customer-settings-page.test.ts`

- [ ] **Step 1: Write failing tests for settings route and sections**

Assert that:

- app route exists
- settings page contains login status, cache-clearing entries, and phone-history management entry points

- [ ] **Step 2: Run the settings-page test**

Run:

```bash
npm --prefix App run test:file -- tests/customer-settings-page.test.ts
```

Expected: FAIL because the page is not registered yet.

- [ ] **Step 3: Implement the lightweight settings page**

Use TDesign components to expose:

- current login status
- clear cart
- clear local orders
- clear phone history
- clear all local customer data if needed as a grouped action
- explanatory copy

- [ ] **Step 4: Re-run the settings-page test**

Run:

```bash
npm --prefix App run test:file -- tests/customer-settings-page.test.ts
```

Expected: PASS.

## Chunk 6: Final Regression And Manual Verification

### Task 14: Run Focused Automated Regression

**Files:**
- Test: `App/tests/customer-session-storage.test.ts`
- Test: `App/tests/customer-phone-history-storage.test.ts`
- Test: `App/tests/customer-action-gate.test.ts`
- Test: `App/tests/customer-cart-scene.test.ts`
- Test: `App/tests/customer-checkout-page.test.ts`
- Test: `App/tests/customer-pickup-slot.test.ts`
- Test: `App/tests/customer-orders-scene.test.ts`
- Test: `App/tests/customer-order-detail-page.test.ts`
- Test: `App/tests/customer-profile-scene.test.ts`
- Test: `App/tests/customer-settings-page.test.ts`

- [ ] **Step 1: Run the focused customer loop suite**

Run:

```bash
npm --prefix App run test:file -- tests/customer-session-storage.test.ts tests/customer-phone-history-storage.test.ts tests/customer-action-gate.test.ts tests/customer-cart-scene.test.ts tests/customer-checkout-page.test.ts tests/customer-pickup-slot.test.ts tests/customer-orders-scene.test.ts tests/customer-order-detail-page.test.ts tests/customer-profile-scene.test.ts tests/customer-settings-page.test.ts
```

Expected: PASS.

- [ ] **Step 2: Run the full automated suite**

Run:

```bash
npm --prefix App test
```

Expected: PASS for the full committed suite.

- [ ] **Step 3: Run TypeScript validation**

Run:

```bash
npm --prefix App exec -- tsc --noEmit -p tsconfig.json
```

Expected: PASS.

### Task 15: Manual Verification In WeChat DevTools `2.01.2510280`

**Files:**
- Manual only

- [ ] **Step 1: Verify the cart flow**

操作步骤：

```text
1. 以顾客身份进入商品详情页，未登录状态下点击“加入购物车”。
2. 完成微信登录后再次确认商品已进入购物车。
3. 进入购物车，观察商品是否显示封面图、规格、奶油类型。
4. 勾选/取消勾选单个商品，再点击“全选”。
5. 左滑某个商品，点击删除，再右滑另一项确认可收起。
6. 观察底部“合计”与“去结算”按钮在金额变化时是否保持稳定。
```

预期效果：

```text
- 未登录时先触发登录，再继续原动作。
- 购物车卡片显示首页封面图与快照信息。
- 选中态清晰、整体符合暖粉橙视觉。
- “全选”与单项勾选都能正确更新金额。
- 左滑删除自然，右滑可恢复。
- “去结算”按钮始终固定在右侧，“合计”和价格同一行。
```

- [ ] **Step 2: Verify checkout, phone history, and pickup time**

操作步骤：

```text
1. 从购物车点击“去结算”进入提交订单页。
2. 观察商品图是否正常显示。
3. 打开手机号历史下拉/弹层，选择一个历史手机号回填。
4. 打开取货时间选择器，分别切换到 1 月、4 月、2 月，检查日期数量。
5. 提交一个新订单。
6. 再次进入提交订单页，确认刚提交的手机号进入历史。
```

预期效果：

```text
- 提交订单页显示商品封面图。
- 历史手机号可直接回填。
- 1 月显示 31 天，4 月显示 30 天，2 月按年份正确处理平年/闰年。
- 提交成功后跳转订单页，并弹出付款提示。
- 新手机号会进入本地历史列表。
```

- [ ] **Step 3: Verify orders, note detail, profile, and settings**

操作步骤：

```text
1. 打开订单页，切换“待确认 / 待制作 / 待取货 / 已完成”状态 Tab。
2. 进入任一订单详情页，确认订单号是否保持单行、商品图是否显示。
3. 点击“编辑备注”，修改并保存备注。
4. 对可取消订单点击“取消订单”，确认锁定状态订单没有取消按钮。
5. 进入“我的”页，检查头像、昵称、登录按钮/退出按钮、设置入口。
6. 进入设置页，分别尝试清理购物车、手机号历史或本地订单，再返回相关页面确认结果。
```

预期效果：

```text
- 订单状态 Tab 样式更完整，切换稳定。
- 订单详情显示商品图，订单号不换行。
- 备注编辑和取消订单为规范的 TDesign 按钮布局。
- 锁定状态订单不允许取消。
- “我的”页展示本地登录信息并可退出。
- 设置页的清理动作对对应本地数据生效，但退出登录不会自动清空购物车和订单。
```
