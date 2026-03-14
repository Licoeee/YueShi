# Phase 3 Customer Home Detail Flow Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the customer cake browsing flow with a waterfall home feed, a preview-only half sheet, a dedicated full product detail page, and the minimum local cart persistence needed for add-to-cart and buy-now.

**Architecture:** Keep the existing role-page scene shell for customer tab pages, but replace the customer home and cart placeholders with dedicated business scene components. Use local mock cake data plus pure TypeScript helper modules for filtering, selection, gesture thresholds, and cart state so the hard logic stays unit-testable outside the mini-program runtime.

**Tech Stack:** WeChat Mini Program (WXML/WXSS/TS), TDesign Mini Program components, TypeScript strict mode, `tsx` + `node:test`, local `wx` storage.

---

## Chunk 1: Tooling And Domain Foundation

### Task 1: Stabilize The TypeScript Test Runner

**Files:**
- Create: `App/package.json`
- Create: `App/package-lock.json` (generated)
- Test: `App/tests/role-page-scene.test.ts`
- Test: `App/tests/welcome-layout.test.ts`

- [ ] **Step 1: Confirm the current bare-Node test path is still broken for imported `.ts` modules**

Run:

```bash
node --test App/tests/role-page-scene.test.ts
```

Expected: FAIL with module resolution errors for TypeScript imports under `App/miniprogram`.

- [ ] **Step 2: Add a local test harness manifest under `App/`**

```json
{
  "name": "yueshi-phase-tests",
  "private": true,
  "scripts": {
    "test": "tsx --test tests/*.test.ts",
    "test:file": "tsx --test"
  },
  "devDependencies": {
    "tsx": "^4.20.3",
    "typescript": "^5.8.2"
  }
}
```

- [ ] **Step 3: Install the test harness dependencies**

Run:

```bash
npm install --prefix App
```

Expected: `added ... packages` and a generated `App/package-lock.json`.

- [ ] **Step 4: Re-run a known structural test through the new harness**

Run:

```bash
npm --prefix App run test:file -- tests/welcome-layout.test.ts
```

Expected: PASS.

- [ ] **Step 5: Re-run the existing role scene regression test through the same harness**

Run:

```bash
npm --prefix App run test:file -- tests/role-page-scene.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit the harness before layering in new behavior**

```bash
git add App/package.json App/package-lock.json
git commit -m "test: add tsx runner for mini program tests"
```

### Task 2: Add Cake Detail Types, Mock Data, And Feed Helpers

**Files:**
- Modify: `App/types/product.d.ts`
- Create: `App/miniprogram/mock/customer-cakes.ts`
- Create: `App/miniprogram/utils/customer-cake-catalog.ts`
- Test: `App/tests/customer-cake-catalog.test.ts`

- [ ] **Step 1: Write the failing catalog tests before creating the helpers**

```ts
import assert from 'node:assert/strict'
import test from 'node:test'

import {
  buildCakeMasonryColumns,
  getCakeDetailById,
  resolveCakeFeed,
} from '../miniprogram/utils/customer-cake-catalog'

test('returns a cake detail record by product id', () => {
  const cake = getCakeDetailById('cake-cloud')
  assert.equal(cake.title, '云朵鲜奶生日蛋糕')
  assert.equal(cake.detailImages.length > 0, true)
})

test('filters by keyword and sorts by monthly sales', () => {
  const cakes = resolveCakeFeed({ keyword: '云朵', sortMode: 'sales-desc' })
  assert.equal(cakes.length, 1)
  assert.equal(cakes[0]?.id, 'cake-cloud')
})

test('splits cards into two waterfall columns using image height as the balancing weight', () => {
  const [left, right] = buildCakeMasonryColumns(resolveCakeFeed({ keyword: '', sortMode: 'sales-desc' }))
  assert.equal(left.length > 0, true)
  assert.equal(right.length > 0, true)
})
```

- [ ] **Step 2: Run the new catalog tests to verify the module does not exist yet**

Run:

```bash
npm --prefix App run test:file -- tests/customer-cake-catalog.test.ts
```

Expected: FAIL with `Cannot find module '../miniprogram/utils/customer-cake-catalog'`.

- [ ] **Step 3: Extend the product type model and create the local cake catalog**

```ts
export interface CakeLayerOption {
  id: 'single' | 'double' | 'triple'
  label: string
  layers: number
}

export interface CakeSizePlan {
  id: string
  label: string
  layers: number
  sizes: ProductSpecSize[]
  price: number
  isDefault: boolean
}

export interface CakeCreamOption {
  id: string
  label: string
  priceDelta: number
  isDefault: boolean
}

export interface CakeDetail extends ProductSummary {
  detailImages: ProductMedia[]
  layerOptions: CakeLayerOption[]
  sizePlans: CakeSizePlan[]
  creamOptions: CakeCreamOption[]
}
```

```ts
const CUSTOMER_CAKES: CakeDetail[] = [
  {
    id: 'cake-cloud',
    title: '云朵鲜奶生日蛋糕',
    // ...summary fields
    detailImages: [
      { url: 'https://example.invalid/cake-cloud-detail-1.jpg', alt: '云朵鲜奶生日蛋糕详情图 1', width: 1080, height: 1440 },
    ],
    layerOptions: [
      { id: 'single', label: '单层', layers: 1 },
      { id: 'double', label: '双层', layers: 2 },
    ],
    sizePlans: [
      { id: 'single-6', label: '6 英寸', layers: 1, sizes: ['6-inch'], price: 168, isDefault: true },
      { id: 'double-6-4', label: '6 + 4 英寸', layers: 2, sizes: ['6-inch', '6-inch'], price: 268, isDefault: false },
    ],
    creamOptions: [
      { id: 'fresh', label: '轻乳脂鲜奶油', priceDelta: 0, isDefault: true },
      { id: 'sea-salt', label: '海盐奶油', priceDelta: 18, isDefault: false },
    ],
  },
]
```

```ts
export function resolveCakeFeed(input: { keyword: string; sortMode: 'sales-desc' | 'price-asc' | 'price-desc' }): CakeDetail[] {
  const keyword = input.keyword.trim().toLowerCase()
  const filtered = CUSTOMER_CAKES.filter((cake) => {
    if (keyword.length === 0) {
      return true
    }
    return cake.title.toLowerCase().includes(keyword) || cake.id.toLowerCase().includes(keyword)
  })

  return filtered.toSorted((left, right) => {
    if (input.sortMode === 'sales-desc') {
      return right.monthlySales - left.monthlySales
    }
    if (input.sortMode === 'price-desc') {
      return right.basePrice - left.basePrice
    }
    return left.basePrice - right.basePrice
  })
}
```

- [ ] **Step 4: Re-run the catalog tests and verify all feed helpers pass**

Run:

```bash
npm --prefix App run test:file -- tests/customer-cake-catalog.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit the catalog foundation**

```bash
git add App/types/product.d.ts App/miniprogram/mock/customer-cakes.ts App/miniprogram/utils/customer-cake-catalog.ts App/tests/customer-cake-catalog.test.ts
git commit -m "feat: add customer cake catalog foundation"
```

### Task 3: Build Cart State And Local Storage Helpers

**Files:**
- Create: `App/types/cart.d.ts`
- Create: `App/miniprogram/utils/customer-cart-state.ts`
- Create: `App/miniprogram/utils/customer-cart-storage.ts`
- Test: `App/tests/customer-cart-storage.test.ts`

- [ ] **Step 1: Write the failing cart storage tests around add-to-cart and buy-now semantics**

```ts
import assert from 'node:assert/strict'
import test from 'node:test'

import {
  createMemoryCartStorage,
  loadCartSnapshot,
  saveCartSnapshot,
} from '../miniprogram/utils/customer-cart-storage'
import {
  createCartItem,
  markImmediatePurchase,
  upsertCartItem,
} from '../miniprogram/utils/customer-cart-state'

test('upsertCartItem merges identical selections instead of creating duplicates', () => {
  const first = createCartItem({ productId: 'cake-cloud', quantity: 1, layerId: 'single', sizePlanId: 'single-6', creamId: 'fresh' })
  const next = upsertCartItem([first], createCartItem({ productId: 'cake-cloud', quantity: 1, layerId: 'single', sizePlanId: 'single-6', creamId: 'fresh' }))
  assert.equal(next.length, 1)
  assert.equal(next[0]?.quantity, 2)
})

test('markImmediatePurchase keeps only the active item checked', () => {
  const items = [
    createCartItem({ productId: 'cake-cloud', quantity: 1, layerId: 'single', sizePlanId: 'single-6', creamId: 'fresh' }),
    createCartItem({ productId: 'cake-peach', quantity: 1, layerId: 'single', sizePlanId: 'single-8', creamId: 'sea-salt' }),
  ]
  const marked = markImmediatePurchase(items, items[1].id)
  assert.equal(marked[0]?.checked, false)
  assert.equal(marked[1]?.checked, true)
})

test('saveCartSnapshot persists and restores the serialized cart payload', () => {
  const storage = createMemoryCartStorage()
  saveCartSnapshot(storage, [])
  assert.deepEqual(loadCartSnapshot(storage), [])
})
```

- [ ] **Step 2: Run the cart tests to confirm the modules are still missing**

Run:

```bash
npm --prefix App run test:file -- tests/customer-cart-storage.test.ts
```

Expected: FAIL with missing module errors for `customer-cart-state` and `customer-cart-storage`.

- [ ] **Step 3: Implement the cart types, pure state helpers, and storage wrapper**

```ts
export interface CartItemSelection {
  layerId: string
  sizePlanId: string
  creamId: string
}

export interface CartItemRecord {
  id: string
  productId: string
  productName: string
  coverImage: string
  quantity: number
  unitPrice: number
  totalPrice: number
  checked: boolean
  entryMode: 'cart' | 'buy-now'
  selection: CartItemSelection
}
```

```ts
export function upsertCartItem(items: CartItemRecord[], incoming: CartItemRecord): CartItemRecord[] {
  const matchIndex = items.findIndex((item) =>
    item.productId === incoming.productId &&
    item.selection.layerId === incoming.selection.layerId &&
    item.selection.sizePlanId === incoming.selection.sizePlanId &&
    item.selection.creamId === incoming.selection.creamId,
  )

  if (matchIndex < 0) {
    return [...items, incoming]
  }

  return items.map((item, index) =>
    index === matchIndex
      ? { ...item, quantity: item.quantity + incoming.quantity, totalPrice: (item.quantity + incoming.quantity) * item.unitPrice }
      : item,
  )
}

export function markImmediatePurchase(items: CartItemRecord[], targetId: string): CartItemRecord[] {
  return items.map((item) => ({
    ...item,
    checked: item.id === targetId,
    entryMode: item.id === targetId ? 'buy-now' : item.entryMode,
  }))
}
```

```ts
export const CUSTOMER_CART_STORAGE_KEY = 'customer-cart-v1'

export interface CartStorageLike {
  getStorageSync(key: string): unknown
  setStorageSync(key: string, value: unknown): void
}
```

- [ ] **Step 4: Re-run the cart tests and confirm add-to-cart / buy-now semantics are passing**

Run:

```bash
npm --prefix App run test:file -- tests/customer-cart-storage.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit the cart foundation before any UI consumes it**

```bash
git add App/types/cart.d.ts App/miniprogram/utils/customer-cart-state.ts App/miniprogram/utils/customer-cart-storage.ts App/tests/customer-cart-storage.test.ts
git commit -m "feat: add customer cart local state helpers"
```

## Chunk 2: Customer Home And Half-Sheet Preview

### Task 4: Extend `role-page-scene` To Host Real Customer Business Scenes

**Files:**
- Modify: `App/miniprogram/components/role-page-scene/role-page-scene.ts`
- Modify: `App/miniprogram/components/role-page-scene/role-page-scene.wxml`
- Modify: `App/miniprogram/components/role-page-scene/role-page-scene.json`
- Modify: `App/miniprogram/components/role-page-scene/role-page-scene.wxss`
- Test: `App/tests/role-page-scene.test.ts`

- [ ] **Step 1: Extend the existing role scene regression test to assert customer business scenes are mounted**

```ts
test('renders customer business scenes instead of placeholder cards for home and cart', () => {
  const source = readWorkspaceFile('App/miniprogram/components/role-page-scene/role-page-scene.wxml')

  assert.match(source, /<customer-home-scene/)
  assert.match(source, /<customer-cart-scene/)
})
```

- [ ] **Step 2: Run the updated scene test and verify the new tags are still absent**

Run:

```bash
npm --prefix App run test:file -- tests/role-page-scene.test.ts
```

Expected: FAIL because `role-page-scene.wxml` does not yet reference `customer-home-scene` or `customer-cart-scene`.

- [ ] **Step 3: Teach `role-page-scene` to branch between placeholder mode and customer business scene mode**

```ts
syncScene(): void {
  const nextScene = getRolePageScene(this.properties.scenePath)
  const renderMode =
    nextScene.path === '/pages/customer/home/home'
      ? 'customer-home'
      : nextScene.path === '/pages/customer/cart/cart'
        ? 'customer-cart'
        : 'placeholder'

  this.setData({
    scene: nextScene,
    renderMode,
  })
}
```

```xml
<customer-home-scene wx:if="{{renderMode === 'customer-home'}}"></customer-home-scene>
<customer-cart-scene wx:elif="{{renderMode === 'customer-cart'}}"></customer-cart-scene>
<view class="role-page__content app-shell" wx:else>
  <!-- existing placeholder scene rendering -->
</view>
```

- [ ] **Step 4: Re-run the scene regression test and ensure the placeholder paths still pass**

Run:

```bash
npm --prefix App run test:file -- tests/role-page-scene.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit the scene-host extension**

```bash
git add App/miniprogram/components/role-page-scene/role-page-scene.ts App/miniprogram/components/role-page-scene/role-page-scene.wxml App/miniprogram/components/role-page-scene/role-page-scene.json App/miniprogram/components/role-page-scene/role-page-scene.wxss App/tests/role-page-scene.test.ts
git commit -m "feat: mount customer business scenes in role host"
```

### Task 5: Add The Preview-Only Half-Sheet Component And Gesture Helper

**Files:**
- Create: `App/miniprogram/utils/customer-sheet-gesture.ts`
- Create: `App/miniprogram/components/customer-product-sheet/customer-product-sheet.ts`
- Create: `App/miniprogram/components/customer-product-sheet/customer-product-sheet.wxml`
- Create: `App/miniprogram/components/customer-product-sheet/customer-product-sheet.wxss`
- Create: `App/miniprogram/components/customer-product-sheet/customer-product-sheet.json`
- Test: `App/tests/customer-sheet-gesture.test.ts`

- [ ] **Step 1: Write the gesture tests before wiring the half sheet**

```ts
import assert from 'node:assert/strict'
import test from 'node:test'

import { shouldLiftToDetail } from '../miniprogram/utils/customer-sheet-gesture'

test('returns true when the user swipes up inside the detail area past the threshold', () => {
  assert.equal(shouldLiftToDetail({ startY: 480, endY: 372, threshold: 72 }), true)
})

test('returns false for short or downward swipes', () => {
  assert.equal(shouldLiftToDetail({ startY: 480, endY: 452, threshold: 72 }), false)
  assert.equal(shouldLiftToDetail({ startY: 372, endY: 420, threshold: 72 }), false)
})
```

- [ ] **Step 2: Run the gesture tests to verify the helper is still missing**

Run:

```bash
npm --prefix App run test:file -- tests/customer-sheet-gesture.test.ts
```

Expected: FAIL with `Cannot find module '../miniprogram/utils/customer-sheet-gesture'`.

- [ ] **Step 3: Implement the pure gesture helper and the preview-only half-sheet component**

```ts
export function shouldLiftToDetail(input: { startY: number; endY: number; threshold: number }): boolean {
  const deltaY = input.endY - input.startY
  return deltaY <= input.threshold * -1
}
```

```ts
Component({
  properties: {
    visible: { type: Boolean, value: false },
    cake: { type: Object, value: null },
  },
  methods: {
    handleTouchStart(event) {
      this.touchStartY = event.touches[0]?.clientY ?? 0
    },
    handleTouchEnd(event) {
      const endY = event.changedTouches[0]?.clientY ?? this.touchStartY
      if (shouldLiftToDetail({ startY: this.touchStartY, endY, threshold: 72 })) {
        this.triggerEvent('lift')
      }
    },
  },
})
```

```xml
<view class="customer-product-sheet" wx:if="{{visible}}" bindtouchstart="handleTouchStart" bindtouchend="handleTouchEnd">
  <view class="customer-product-sheet__handle"></view>
  <t-swiper></t-swiper>
  <text class="customer-product-sheet__hint">在详情区域内上滑查看更多</text>
</view>
```

- [ ] **Step 4: Re-run the gesture tests**

Run:

```bash
npm --prefix App run test:file -- tests/customer-sheet-gesture.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit the half-sheet foundation**

```bash
git add App/miniprogram/utils/customer-sheet-gesture.ts App/miniprogram/components/customer-product-sheet App/tests/customer-sheet-gesture.test.ts
git commit -m "feat: add preview-only customer product sheet"
```

### Task 6: Build The Customer Home Business Scene

**Files:**
- Create: `App/miniprogram/components/customer-home-scene/customer-home-scene.ts`
- Create: `App/miniprogram/components/customer-home-scene/customer-home-scene.wxml`
- Create: `App/miniprogram/components/customer-home-scene/customer-home-scene.wxss`
- Create: `App/miniprogram/components/customer-home-scene/customer-home-scene.json`
- Test: `App/tests/customer-home-scene.test.ts`

- [ ] **Step 1: Write structural tests for the home scene**

```ts
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'

const workspaceRoot = process.cwd()
const wxml = fs.readFileSync(path.join(workspaceRoot, 'App/miniprogram/components/customer-home-scene/customer-home-scene.wxml'), 'utf8')

test('binds card taps to the product detail preview and omits the old add-cart icon', () => {
  assert.match(wxml, /bindtap="handleProductTap"/)
  assert.doesNotMatch(wxml, /cart-add/)
  assert.doesNotMatch(wxml, /加入购物车/)
})
```

- [ ] **Step 2: Run the structural test and verify the component does not exist yet**

Run:

```bash
npm --prefix App run test:file -- tests/customer-home-scene.test.ts
```

Expected: FAIL because the component files do not exist yet.

- [ ] **Step 3: Implement the home scene with search, sort, waterfall columns, and the half-sheet host**

```ts
Component({
  data: {
    keyword: '',
    sortMode: 'sales-desc',
    leftColumn: [],
    rightColumn: [],
    selectedCake: null,
    isSheetVisible: false,
  },
  lifetimes: {
    attached() {
      this.syncFeed()
    },
  },
  methods: {
    syncFeed() {
      const feed = resolveCakeFeed({ keyword: this.data.keyword, sortMode: this.data.sortMode })
      const [leftColumn, rightColumn] = buildCakeMasonryColumns(feed)
      this.setData({ leftColumn, rightColumn })
    },
    handleProductTap(event) {
      const productId = event.currentTarget.dataset.productId
      this.setData({
        selectedCake: getCakeDetailById(productId),
        isSheetVisible: true,
      })
    },
    handleSheetLift() {
      wx.navigateTo({
        url: `/pages/customer/product-detail/product-detail?productId=${this.data.selectedCake.id}`,
      })
    },
  },
})
```

```xml
<t-search value="{{keyword}}" bind:change="handleSearchChange"></t-search>
<view class="customer-home-scene__waterfall">
  <view wx:for="{{leftColumn}}" wx:key="id" data-product-id="{{item.id}}" bindtap="handleProductTap"></view>
  <view wx:for="{{rightColumn}}" wx:key="id" data-product-id="{{item.id}}" bindtap="handleProductTap"></view>
</view>
<customer-product-sheet visible="{{isSheetVisible}}" cake="{{selectedCake}}" bind:lift="handleSheetLift"></customer-product-sheet>
```

- [ ] **Step 4: Re-run the home scene structural test**

Run:

```bash
npm --prefix App run test:file -- tests/customer-home-scene.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit the customer home scene**

```bash
git add App/miniprogram/components/customer-home-scene App/tests/customer-home-scene.test.ts
git commit -m "feat: add customer home waterfall scene"
```

## Chunk 3: Full Detail Page And Cart Handoff

### Task 7: Implement Product Selection Logic And The Full Detail Page

**Files:**
- Create: `App/miniprogram/utils/customer-product-selection.ts`
- Create: `App/miniprogram/components/customer-product-detail/customer-product-detail.ts`
- Create: `App/miniprogram/components/customer-product-detail/customer-product-detail.wxml`
- Create: `App/miniprogram/components/customer-product-detail/customer-product-detail.wxss`
- Create: `App/miniprogram/components/customer-product-detail/customer-product-detail.json`
- Create: `App/miniprogram/pages/customer/product-detail/product-detail.ts`
- Create: `App/miniprogram/pages/customer/product-detail/product-detail.wxml`
- Create: `App/miniprogram/pages/customer/product-detail/product-detail.wxss`
- Create: `App/miniprogram/pages/customer/product-detail/product-detail.json`
- Modify: `App/miniprogram/app.json`
- Test: `App/tests/customer-product-selection.test.ts`
- Test: `App/tests/customer-product-detail-page.test.ts`

- [ ] **Step 1: Write failing tests for size-plan resolution and the full detail page structure**

```ts
import assert from 'node:assert/strict'
import test from 'node:test'

import {
  buildCartItemFromSelection,
  buildDefaultSelection,
  resolveSelectableSizePlans,
} from '../miniprogram/utils/customer-product-selection'
import { getCakeDetailById } from '../miniprogram/utils/customer-cake-catalog'

test('single-layer cakes only expose single-layer size plans by default', () => {
  const cake = getCakeDetailById('cake-cloud')
  const selection = buildDefaultSelection(cake)
  const plans = resolveSelectableSizePlans(cake, selection.layerId)
  assert.equal(plans.every((plan) => plan.layers === 1), true)
})

test('buildCartItemFromSelection creates a cart-ready payload with the chosen price', () => {
  const cake = getCakeDetailById('cake-cloud')
  const selection = buildDefaultSelection(cake)
  const item = buildCartItemFromSelection(cake, selection)
  assert.equal(item.productId, cake.id)
  assert.equal(item.totalPrice > 0, true)
})
```

```ts
test('full detail page keeps the four bottom actions and does not rely on the half-sheet footer', () => {
  const source = readWorkspaceFile('App/miniprogram/pages/customer/product-detail/product-detail.wxml')
  assert.match(source, /首页/)
  assert.match(source, /购物车/)
  assert.match(source, /加入购物车/)
  assert.match(source, /立即购买/)
})
```

- [ ] **Step 2: Run the new tests to confirm the selection helper and detail page do not exist yet**

Run:

```bash
npm --prefix App run test:file -- tests/customer-product-selection.test.ts tests/customer-product-detail-page.test.ts
```

Expected: FAIL because the helper module and detail page files are still missing.

- [ ] **Step 3: Implement the selection helper and the dedicated detail page**

```ts
export function buildDefaultSelection(cake: CakeDetail): ProductSelectionState {
  const defaultLayer = cake.layerOptions[0]
  const defaultPlan = cake.sizePlans.find((plan) => plan.layers === defaultLayer.layers && plan.isDefault) ?? cake.sizePlans[0]
  const defaultCream = cake.creamOptions.find((option) => option.isDefault) ?? cake.creamOptions[0]

  return {
    layerId: defaultLayer.id,
    sizePlanId: defaultPlan.id,
    creamId: defaultCream.id,
    quantity: 1,
  }
}
```

```ts
Page({
  data: {
    cake: null,
    selection: null,
    imageViewerVisible: false,
    imageViewerImages: [],
  },
  onLoad(query) {
    const cake = getCakeDetailById(String(query.productId ?? ''))
    const selection = buildDefaultSelection(cake)
    this.setData({
      cake,
      selection,
      imageViewerImages: cake.detailImages.map((image) => image.url),
    })
  },
})
```

```xml
<customer-product-detail
  cake="{{cake}}"
  selection="{{selection}}"
  bind:addtocart="handleAddToCart"
  bind:buynow="handleBuyNow"
  bind:gohome="handleGoHome"
  bind:gocart="handleGoCart"
></customer-product-detail>
```

- [ ] **Step 4: Wire the detail page actions into the cart storage helpers**

```ts
handleAddToCart() {
  const item = buildCartItemFromSelection(this.data.cake, this.data.selection)
  addItemToLocalCart(item)
  wx.showToast({ title: '已加入购物车', icon: 'success' })
}

handleBuyNow() {
  const item = buildCartItemFromSelection(this.data.cake, this.data.selection)
  addItemToLocalCart(item)
  markLocalCartItemAsImmediatePurchase(item)
  wx.redirectTo({ url: '/pages/customer/cart/cart' })
}
```

- [ ] **Step 5: Re-run the selection and detail page tests**

Run:

```bash
npm --prefix App run test:file -- tests/customer-product-selection.test.ts tests/customer-product-detail-page.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit the full detail page**

```bash
git add App/miniprogram/utils/customer-product-selection.ts App/miniprogram/components/customer-product-detail App/miniprogram/pages/customer/product-detail App/miniprogram/app.json App/tests/customer-product-selection.test.ts App/tests/customer-product-detail-page.test.ts
git commit -m "feat: add customer product detail page"
```

### Task 8: Build The Minimal Customer Cart Scene And Run Regression Checks

**Files:**
- Create: `App/miniprogram/components/customer-cart-scene/customer-cart-scene.ts`
- Create: `App/miniprogram/components/customer-cart-scene/customer-cart-scene.wxml`
- Create: `App/miniprogram/components/customer-cart-scene/customer-cart-scene.wxss`
- Create: `App/miniprogram/components/customer-cart-scene/customer-cart-scene.json`
- Test: `App/tests/customer-cart-scene.test.ts`

- [ ] **Step 1: Write the cart scene structural tests**

```ts
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'

const workspaceRoot = process.cwd()
const wxml = fs.readFileSync(path.join(workspaceRoot, 'App/miniprogram/components/customer-cart-scene/customer-cart-scene.wxml'), 'utf8')

test('renders checked cart items and an empty-state fallback', () => {
  assert.match(wxml, /checked/)
  assert.match(wxml, /空购物车|暂无蛋糕/)
})
```

- [ ] **Step 2: Run the cart scene test and verify the component is still missing**

Run:

```bash
npm --prefix App run test:file -- tests/customer-cart-scene.test.ts
```

Expected: FAIL because `customer-cart-scene` does not exist yet.

- [ ] **Step 3: Implement the minimal cart scene that reads local cart storage on attach/show**

```ts
Component({
  data: {
    items: [],
    checkedCount: 0,
  },
  lifetimes: {
    attached() {
      this.syncCart()
    },
  },
  methods: {
    syncCart() {
      const items = loadCartSnapshot(wx)
      this.setData({
        items,
        checkedCount: items.filter((item) => item.checked).length,
      })
    },
  },
})
```

- [ ] **Step 4: Re-run the cart scene test and the critical cross-flow regression tests**

Run:

```bash
npm --prefix App run test:file -- tests/customer-cart-scene.test.ts tests/customer-home-scene.test.ts tests/customer-product-selection.test.ts tests/role-page-scene.test.ts
```

Expected: PASS.

- [ ] **Step 5: Run the full automated test suite before manual verification**

Run:

```bash
npm --prefix App run test
```

Expected: PASS for all committed tests.

- [ ] **Step 6: Verify the flow manually in微信开发者工具 `2.01.2510280`**

Run / 操作步骤:

```text
1. 打开顾客首页并确认瀑布流按双列展示。
2. 点击任一蛋糕卡片，观察半屏详情层是否自底部上弹，首页背景是否变暗但仍可见。
3. 在半屏详情区域内上滑，确认进入独立详情页。
4. 在独立详情页选择层数、尺寸/尺寸搭配、奶油类型。
5. 点击“加入购物车”，确认页面不跳转。
6. 再次进入独立详情页，点击“立即购买”，确认跳转到购物车页。
7. 在购物车页确认当前商品已存在且为勾选状态。
```

Expected:

```text
- 首页没有卡片右下角快捷加购图标。
- 半屏详情层只展示，不出现底部四操作位。
- 独立详情页固定展示首页、购物车、加入购物车、立即购买四操作位。
- “加入购物车”不跳转，“立即购买”跳购物车且当前商品已勾选。
```

- [ ] **Step 7: Commit the cart handoff slice**

```bash
git add App/miniprogram/components/customer-cart-scene App/tests/customer-cart-scene.test.ts
git commit -m "feat: connect customer cart handoff flow"
```

- [ ] **Step 8: Stop before cloud sync and hand off the next-phase seam clearly**

```text
本计划只实现本地购物车持久化。
第三阶段后续任务再扩展 customer-cart-storage.ts，使其在不改动页面组件契约的前提下接入云端同步。
```
