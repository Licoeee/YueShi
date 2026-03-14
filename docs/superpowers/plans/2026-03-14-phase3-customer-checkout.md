# Phase 3 Customer Checkout Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the local customer checkout loop so checked cart items or the active buy-now item can submit a validated order draft and land in the orders tab.

**Architecture:** Keep the existing cart-as-source model, but normalize checkout input through pure TypeScript helpers before any page logic runs. Introduce a repository seam for order creation so the checkout page talks to an interface while the default implementation persists locally with `wx` storage.

**Tech Stack:** WeChat Mini Program (WXML/WXSS/TS), TDesign Mini Program components, TypeScript strict mode, `tsx` + `node:test`, local `wx` storage.

---

## Chunk 1: Domain And Storage Foundation

### Task 1: Add Checkout Types And Extend Order Types

**Files:**
- Create: `App/types/checkout.d.ts`
- Modify: `App/types/order.d.ts`
- Test: `App/tests/customer-order-repository.test.ts`

- [ ] **Step 1: Write the failing repository-focused type consumer test**

```ts
import assert from 'node:assert/strict'
import test from 'node:test'

import { createLocalCustomerOrderRepository } from '../miniprogram/utils/customer-order-repository'
import type { CheckoutDraftRecord } from '../types/checkout'

test('repository output keeps checkout selection detail on each order item', async () => {
  const repository = createLocalCustomerOrderRepository()
  const order = await repository.createDraftOrder({} as CheckoutDraftRecord)
  assert.equal(typeof order.items[0]?.specLabel, 'string')
})
```

- [ ] **Step 2: Run the test to confirm checkout types and repository do not exist yet**

Run:

```bash
npm --prefix App run test:file -- tests/customer-order-repository.test.ts
```

Expected: FAIL with missing module/type errors for `checkout` and `customer-order-repository`.

- [ ] **Step 3: Add checkout-specific types and extend `OrderItem` selection fields**

```ts
export type CheckoutSource = 'cart' | 'buy-now'

export interface CheckoutItemRecord {
  id: string
  productId: string
  productName: string
  coverImage: string
  quantity: number
  unitPrice: number
  subtotal: number
  layerId: string
  sizePlanId: string
  creamId: string
  specLabel: string
}
```

```ts
export interface OrderItem {
  productId: string
  productName: string
  specId: string
  specLabel: string
  layerId: string
  sizePlanId: string
  creamId: string
  size: ProductSpecSize
  quantity: number
  unitPrice: number
  coverImage: string
}
```

- [ ] **Step 4: Re-run the repository test once the type layer compiles**

Run:

```bash
npm --prefix App run test:file -- tests/customer-order-repository.test.ts
```

Expected: still FAIL, but now only because the repository implementation is missing.

### Task 2: Add Checkout State Helpers And Local Order Persistence

**Files:**
- Create: `App/miniprogram/utils/customer-checkout-state.ts`
- Create: `App/miniprogram/utils/customer-order-storage.ts`
- Create: `App/miniprogram/utils/customer-order-repository.ts`
- Test: `App/tests/customer-checkout-state.test.ts`
- Test: `App/tests/customer-order-storage.test.ts`
- Test: `App/tests/customer-order-repository.test.ts`

- [ ] **Step 1: Write failing tests for checkout-source resolution, cart cleanup, and local order creation**

```ts
test('buildCheckoutState prefers checked cart items over unrelated unchecked items', () => {
  const checkout = buildCheckoutState([
    { id: 'a', checked: true, entryMode: 'cart' } as CartItemRecord,
    { id: 'b', checked: false, entryMode: 'cart' } as CartItemRecord,
  ])
  assert.equal(checkout.items.length, 1)
  assert.equal(checkout.source, 'cart')
})

test('buildCheckoutState falls back to the active buy-now item', () => {
  const checkout = buildCheckoutState([
    { id: 'buy', checked: true, entryMode: 'buy-now' } as CartItemRecord,
  ])
  assert.equal(checkout.source, 'buy-now')
})

test('repository prepends a new local order record to storage', async () => {
  const storage = createMemoryOrderStorage()
  const repository = createLocalCustomerOrderRepository(storage)
  const order = await repository.createDraftOrder(draft)
  assert.equal(loadOrderSnapshot(storage)[0]?.id, order.id)
})
```

- [ ] **Step 2: Run the new helper tests and verify the modules are absent**

Run:

```bash
npm --prefix App run test:file -- tests/customer-checkout-state.test.ts tests/customer-order-storage.test.ts tests/customer-order-repository.test.ts
```

Expected: FAIL with missing module errors.

- [ ] **Step 3: Implement the checkout-state helper, order storage wrapper, and local repository**

```ts
export function buildCheckoutState(items: CartItemRecord[]): CheckoutResolvedState {
  const checkedCartItems = items.filter((item) => item.checked && item.entryMode === 'cart')
  if (checkedCartItems.length > 0) {
    return { source: 'cart', items: checkedCartItems.map(mapCartToCheckout), totalAmount: sumSubtotal(checkedCartItems) }
  }

  const buyNowItem = items.find((item) => item.checked && item.entryMode === 'buy-now')
  if (buyNowItem !== undefined) {
    return { source: 'buy-now', items: [mapCartToCheckout(buyNowItem)], totalAmount: buyNowItem.totalPrice }
  }

  return { source: 'cart', items: [], totalAmount: 0 }
}
```

```ts
export interface CustomerOrderRepository {
  createDraftOrder(input: CheckoutDraftRecord): Promise<OrderRecord>
}
```

```ts
export function createLocalCustomerOrderRepository(storage = resolveDefaultOrderStorage()): CustomerOrderRepository {
  return {
    async createDraftOrder(input) {
      const now = new Date().toISOString()
      const order: OrderRecord = {
        id: `order-${Date.now()}`,
        customerOpenId: 'local-customer',
        merchantOpenId: 'local-merchant',
        status: 'pending-payment',
        items: input.items.map(toOrderItem),
        contact: {
          phone: input.contact.phone,
          phoneTail: input.contact.phone.slice(-4),
        },
        pickupSlot: input.pickupSlot,
        note: '',
        hasNote: false,
        totalAmount: input.totalAmount,
        createdAt: now,
        updatedAt: now,
      }
      saveOrderSnapshot(storage, [order, ...loadOrderSnapshot(storage)])
      return order
    },
  }
}
```

- [ ] **Step 4: Re-run the helper tests and confirm the pure modules pass**

Run:

```bash
npm --prefix App run test:file -- tests/customer-checkout-state.test.ts tests/customer-order-storage.test.ts tests/customer-order-repository.test.ts
```

Expected: PASS.

## Chunk 2: Pickup Time And Checkout Page

### Task 3: Build The Pickup Slot Helper

**Files:**
- Create: `App/miniprogram/utils/customer-pickup-slot.ts`
- Test: `App/tests/customer-pickup-slot.test.ts`

- [ ] **Step 1: Write failing tests for month/day/time generation and expired-slot rejection**

```ts
test('buildPickupPickerState returns month day and half-hour columns', () => {
  const state = buildPickupPickerState(new Date('2026-03-14T10:20:00+08:00'))
  assert.equal(state.monthOptions.length > 0, true)
  assert.equal(state.dayOptions.length > 0, true)
  assert.equal(state.timeOptions.some((item) => item.label.includes(':')), true)
})

test('rejects pickup values earlier than now', () => {
  const result = resolvePickupSlotFromIndexes({ monthIndex: 0, dayIndex: 0, timeIndex: 0 }, new Date('2026-03-14T23:50:00+08:00'))
  assert.equal(result, null)
})
```

- [ ] **Step 2: Run the pickup helper tests to verify the module is missing**

Run:

```bash
npm --prefix App run test:file -- tests/customer-pickup-slot.test.ts
```

Expected: FAIL with missing module errors.

- [ ] **Step 3: Implement picker option generation and slot resolution**

```ts
export function buildPickupPickerState(now: Date): PickupPickerState {
  // build limited month window, dynamic day column, and half-hour time options
}

export function resolvePickupSlotFromIndexes(indexes: PickupPickerIndexes, now: Date): PickupSlot | null {
  // return null if the computed slot is earlier than now
}
```

- [ ] **Step 4: Re-run the pickup helper tests**

Run:

```bash
npm --prefix App run test:file -- tests/customer-pickup-slot.test.ts
```

Expected: PASS.

### Task 4: Add The Checkout Page Structure And Validation

**Files:**
- Create: `App/miniprogram/pages/customer/checkout/checkout.ts`
- Create: `App/miniprogram/pages/customer/checkout/checkout.wxml`
- Create: `App/miniprogram/pages/customer/checkout/checkout.wxss`
- Create: `App/miniprogram/pages/customer/checkout/checkout.json`
- Modify: `App/miniprogram/app.json`
- Test: `App/tests/customer-checkout-page.test.ts`

- [ ] **Step 1: Write failing structural tests for the checkout route and required sections**

```ts
test('registers the dedicated checkout route in app.json', () => {
  assert.match(readWorkspaceFile('App/miniprogram/app.json'), /pages\/customer\/checkout\/checkout/)
})

test('checkout page contains contact, pickup, and submit sections', () => {
  const wxml = readWorkspaceFile('App/miniprogram/pages/customer/checkout/checkout.wxml')
  assert.match(wxml, /手机号/)
  assert.match(wxml, /取货时间/)
  assert.match(wxml, /提交订单/)
})
```

- [ ] **Step 2: Run the checkout page test and confirm the files do not exist yet**

Run:

```bash
npm --prefix App run test:file -- tests/customer-checkout-page.test.ts
```

Expected: FAIL because the checkout page is not registered yet.

- [ ] **Step 3: Implement the checkout page with resolved checkout state, phone validation, pickup picker, and submit action**

```ts
Page({
  data: {
    checkoutItems: [],
    totalAmount: 0,
    phone: '',
    phoneError: '',
    pickupSummary: '',
    submitDisabled: true,
  },
  onShow() {
    this.syncCheckout()
  },
  handlePhoneInput(event) {
    this.setData({ phone: event.detail.value, phoneError: '' })
  },
  async handleSubmit() {
    // validate phone and pickup slot, create draft order, show payment modal, navigate to orders
  },
})
```

```xml
<t-input label="手机号" value="{{phone}}" bind:change="handlePhoneInput"></t-input>
<picker-view bindchange="handlePickupChange"></picker-view>
<t-button disabled="{{submitDisabled}}" bindtap="handleSubmit">提交订单</t-button>
```

- [ ] **Step 4: Re-run the checkout page structural test**

Run:

```bash
npm --prefix App run test:file -- tests/customer-checkout-page.test.ts
```

Expected: PASS.

## Chunk 3: Entry Points, Cleanup, And Regression Coverage

### Task 5: Extend The Cart Scene With A Checkout Entry

**Files:**
- Modify: `App/miniprogram/components/customer-cart-scene/customer-cart-scene.ts`
- Modify: `App/miniprogram/components/customer-cart-scene/customer-cart-scene.wxml`
- Modify: `App/miniprogram/components/customer-cart-scene/customer-cart-scene.wxss`
- Test: `App/tests/customer-cart-scene.test.ts`

- [ ] **Step 1: Extend the cart scene structural test to require a checkout CTA and total summary**

```ts
test('cart scene exposes checkout summary and action', () => {
  const wxml = readWorkspaceFile('App/miniprogram/components/customer-cart-scene/customer-cart-scene.wxml')
  assert.match(wxml, /去结算/)
  assert.match(wxml, /合计/)
})
```

- [ ] **Step 2: Run the cart scene test and verify the CTA is not there yet**

Run:

```bash
npm --prefix App run test:file -- tests/customer-cart-scene.test.ts
```

Expected: FAIL because the current cart scene has no checkout action.

- [ ] **Step 3: Implement checkout summary, disabled state, and page navigation**

```ts
syncCart(): void {
  const cartItems = loadStoredCustomerCart()
  const checkoutState = buildCheckoutState(cartItems)
  this.setData({
    items: cartItems,
    checkedCount: checkoutState.items.length,
    checkedAmount: checkoutState.totalAmount,
    canCheckout: checkoutState.items.length > 0,
  })
}
```

```xml
<view class="customer-cart-scene__summary">
  <text>合计 ¥ {{checkedAmount}}</text>
  <t-button disabled="{{!canCheckout}}" bindtap="handleCheckout">去结算</t-button>
</view>
```

- [ ] **Step 4: Re-run the cart scene test**

Run:

```bash
npm --prefix App run test:file -- tests/customer-cart-scene.test.ts
```

Expected: PASS.

### Task 6: Change Buy-Now To Jump Directly Into Checkout

**Files:**
- Modify: `App/miniprogram/pages/customer/product-detail/product-detail.ts`
- Test: `App/tests/customer-product-detail-page.test.ts`

- [ ] **Step 1: Extend the detail page test to require checkout navigation on buy-now**

```ts
test('product detail buy-now flow targets checkout instead of cart', () => {
  const source = readWorkspaceFile('App/miniprogram/pages/customer/product-detail/product-detail.ts')
  assert.match(source, /pages\/customer\/checkout\/checkout/)
})
```

- [ ] **Step 2: Run the detail page test and verify the page still redirects to cart**

Run:

```bash
npm --prefix App run test:file -- tests/customer-product-detail-page.test.ts
```

Expected: FAIL because `handleBuyNow` still targets `/pages/customer/cart/cart`.

- [ ] **Step 3: Redirect buy-now to checkout after persisting the active immediate-purchase item**

```ts
handleBuyNow() {
  const cartSnapshot = loadStoredCustomerCart()
  const result = applySelectionToCart(cartSnapshot, cake, selection, 'buy-now')
  saveStoredCustomerCart(result.items)
  wx.redirectTo({ url: '/pages/customer/checkout/checkout' })
}
```

- [ ] **Step 4: Re-run the detail page test**

Run:

```bash
npm --prefix App run test:file -- tests/customer-product-detail-page.test.ts
```

Expected: PASS.

### Task 7: Run Regression Tests And Manual Verification

**Files:**
- Test: `App/tests/customer-checkout-state.test.ts`
- Test: `App/tests/customer-order-storage.test.ts`
- Test: `App/tests/customer-order-repository.test.ts`
- Test: `App/tests/customer-pickup-slot.test.ts`
- Test: `App/tests/customer-checkout-page.test.ts`
- Test: `App/tests/customer-cart-scene.test.ts`
- Test: `App/tests/customer-product-detail-page.test.ts`

- [ ] **Step 1: Run the focused automated suite**

Run:

```bash
npm --prefix App run test:file -- tests/customer-checkout-state.test.ts tests/customer-order-storage.test.ts tests/customer-order-repository.test.ts tests/customer-pickup-slot.test.ts tests/customer-checkout-page.test.ts tests/customer-cart-scene.test.ts tests/customer-product-detail-page.test.ts
```

Expected: PASS.

- [ ] **Step 2: Run the full automated suite**

Run:

```bash
npm --prefix App run test
```

Expected: PASS for the full committed suite.

- [ ] **Step 3: Verify the checkout flow manually in微信开发者工具 `2.01.2510280`**

Run / 操作步骤:

```text
1. 进入顾客商品详情页，选择一个蛋糕规格，点击“立即购买”。
2. 确认页面直接进入结算页，而不是先回购物车。
3. 输入错误手机号，尝试提交。
4. 改成正确手机号，选择一个有效取货时间并提交。
5. 在支付提示弹窗中确认提示文案。
6. 跳转到顾客订单页后，再回到购物车确认本次提交条目已被清理。
7. 返回购物车，勾选若干商品后点击“去结算”，再次完成一次提单。
```

Expected:

```text
- buy-now 直接进入结算页。
- 非法手机号不能提交，并出现明确提示。
- 结算页必须要求选择有效取货时间。
- 提交后出现“请在付款时备注手机号后四位，以便商家对账”提示。
- 新订单创建成功并能在订单页看到。
- 已提交的购物车条目不会残留导致重复下单。
```
