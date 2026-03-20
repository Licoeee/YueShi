# Phase 3 Customer Order Management Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the customer order-management flow so users can view highlighted local orders, open a dedicated order detail page, edit notes, and cancel only eligible orders.

**Architecture:** Keep the orders tab as the list entry and move stateful order actions into a dedicated detail page. Extend the existing local order repository with fetch, note update, and cancellation methods, and route post-update side effects through a notifier seam so future cloud reminders can be attached without rewriting page logic.

**Tech Stack:** WeChat Mini Program (WXML/WXSS/TS), TDesign Mini Program components, TypeScript strict mode, `tsx` + `node:test`, local `wx` storage.

---

## Chunk 1: Repository And Domain Extensions

### Task 1: Extend The Customer Order Repository

**Files:**
- Modify: `App/miniprogram/utils/customer-order-repository.ts`
- Create: `App/miniprogram/utils/customer-order-notifier.ts`
- Create: `App/miniprogram/utils/customer-order-detail-state.ts`
- Test: `App/tests/customer-order-repository.test.ts`

- [ ] **Step 1: Write failing tests for order lookup, note update, and cancellation guard**

```ts
test('getOrderById returns the stored order detail by id', async () => {
  const repository = createLocalCustomerOrderRepository(storage)
  const order = await repository.getOrderById('order-1')
  assert.equal(order?.id, 'order-1')
})

test('updateOrderNote persists note content and note flags', async () => {
  const updated = await repository.updateOrderNote('order-1', '插一支数字蜡烛')
  assert.equal(updated.note, '插一支数字蜡烛')
  assert.equal(updated.hasNote, true)
})

test('cancelOrder rejects locked statuses', async () => {
  await assert.rejects(() => repository.cancelOrder('ready-order'))
})
```

- [ ] **Step 2: Run the repository test to confirm the new methods are missing**

Run:

```bash
npm --prefix App run test:file -- tests/customer-order-repository.test.ts
```

Expected: FAIL because `getOrderById`, `updateOrderNote`, `cancelOrder`, and notifier/detail-state helpers do not exist yet.

- [ ] **Step 3: Implement repository extension, notifier seam, and cancellation predicates**

```ts
export interface CustomerOrderNotifier {
  notifyOrderNoteChanged(input: { orderId: string; note: string }): Promise<void>
}

export function createLocalCustomerOrderNotifier(): CustomerOrderNotifier {
  return {
    async notifyOrderNoteChanged(): Promise<void> {
      return
    },
  }
}
```

```ts
export function canCustomerCancelOrder(status: OrderStatus): boolean {
  return status !== 'ready-for-pickup' && status !== 'completed' && status !== 'cancelled'
}
```

```ts
async updateOrderNote(orderId: string, note: string): Promise<OrderRecord> {
  // trim note, update note/hasNote/updatedAt, persist and return order
}

async cancelOrder(orderId: string): Promise<OrderRecord> {
  // guard by canCustomerCancelOrder, set status to cancelled, update updatedAt
}
```

- [ ] **Step 4: Re-run the repository tests**

Run:

```bash
npm --prefix App run test:file -- tests/customer-order-repository.test.ts
```

Expected: PASS.

## Chunk 2: Orders List And Detail Entry

### Task 2: Upgrade The Orders Scene Into A Navigable List

**Files:**
- Modify: `App/miniprogram/components/customer-orders-scene/customer-orders-scene.ts`
- Modify: `App/miniprogram/components/customer-orders-scene/customer-orders-scene.wxml`
- Modify: `App/miniprogram/components/customer-orders-scene/customer-orders-scene.wxss`
- Test: `App/tests/customer-orders-scene.test.ts`

- [ ] **Step 1: Write failing structural tests for tappable cards and note-highlighted styles**

```ts
test('orders scene exposes tappable cards that route to detail', () => {
  const wxml = readOrdersSceneFile('wxml')
  assert.match(wxml, /bindtap="handleOrderTap"/)
})

test('orders scene keeps a dedicated note-highlight card modifier', () => {
  const wxss = readOrdersSceneStyle()
  assert.match(wxss, /customer-orders-scene__card--noted/)
})
```

- [ ] **Step 2: Run the scene test and verify the new behavior is still absent**

Run:

```bash
npm --prefix App run test:file -- tests/customer-orders-scene.test.ts
```

Expected: FAIL because cards are not yet navigable or note-highlighted.

- [ ] **Step 3: Implement card navigation and note-highlight rendering**

```ts
handleOrderTap(event): void {
  const orderId = event.currentTarget.dataset.orderId
  wx.navigateTo({ url: `/pages/customer/order-detail/order-detail?orderId=${orderId}` })
}
```

```xml
<view
  wx:for="{{orders}}"
  wx:key="id"
  class="customer-orders-scene__card {{item.hasNote ? 'customer-orders-scene__card--noted' : ''}}"
  data-order-id="{{item.id}}"
  bindtap="handleOrderTap"
>
```

- [ ] **Step 4: Re-run the orders scene test**

Run:

```bash
npm --prefix App run test:file -- tests/customer-orders-scene.test.ts
```

Expected: PASS.

### Task 3: Add The Dedicated Order Detail Page

**Files:**
- Create: `App/miniprogram/pages/customer/order-detail/order-detail.ts`
- Create: `App/miniprogram/pages/customer/order-detail/order-detail.wxml`
- Create: `App/miniprogram/pages/customer/order-detail/order-detail.wxss`
- Create: `App/miniprogram/pages/customer/order-detail/order-detail.json`
- Modify: `App/miniprogram/app.json`
- Test: `App/tests/customer-order-detail-page.test.ts`

- [ ] **Step 1: Write failing structural tests for the order-detail route and core sections**

```ts
test('registers the customer order detail route in app.json', () => {
  assert.match(readWorkspaceFile('App/miniprogram/app.json'), /pages\/customer\/order-detail\/order-detail/)
})

test('order detail page contains note editing and cancel-order sections', () => {
  const wxml = readWorkspaceFile('App/miniprogram/pages/customer/order-detail/order-detail.wxml')
  assert.match(wxml, /订单备注/)
  assert.match(wxml, /取消订单/)
})
```

- [ ] **Step 2: Run the detail-page test to confirm the files do not exist yet**

Run:

```bash
npm --prefix App run test:file -- tests/customer-order-detail-page.test.ts
```

Expected: FAIL because the route and page files are not present yet.

- [ ] **Step 3: Implement the order detail page shell and order loading by `orderId`**

```ts
onLoad(query) {
  const orderId = typeof query.orderId === 'string' ? query.orderId : ''
  const order = await repository.getOrderById(orderId)
  if (order === null) {
    wx.showToast({ title: '订单不存在', icon: 'none' })
    wx.redirectTo({ url: '/pages/customer/orders/orders' })
    return
  }
}
```

- [ ] **Step 4: Re-run the detail-page structural test**

Run:

```bash
npm --prefix App run test:file -- tests/customer-order-detail-page.test.ts
```

Expected: PASS.

## Chunk 3: Note Editing, Cancellation, And Verification

### Task 4: Implement Note Editing And Cancellation In The Detail Page

**Files:**
- Modify: `App/miniprogram/pages/customer/order-detail/order-detail.ts`
- Modify: `App/miniprogram/pages/customer/order-detail/order-detail.wxml`
- Modify: `App/miniprogram/pages/customer/order-detail/order-detail.wxss`
- Test: `App/tests/customer-order-detail-page.test.ts`
- Test: `App/tests/customer-order-repository.test.ts`

- [ ] **Step 1: Extend tests for edit-state UI, notifier usage, and cancel-button lock behavior**

```ts
test('order detail page hides the cancel action for locked statuses', () => {
  const source = readWorkspaceFile('App/miniprogram/pages/customer/order-detail/order-detail.ts')
  assert.match(source, /canCustomerCancelOrder/)
})

test('order detail page keeps a dedicated save-note action', () => {
  const wxml = readWorkspaceFile('App/miniprogram/pages/customer/order-detail/order-detail.wxml')
  assert.match(wxml, /保存备注/)
})
```

- [ ] **Step 2: Run the detail-page and repository tests to verify the action flow is still incomplete**

Run:

```bash
npm --prefix App run test:file -- tests/customer-order-detail-page.test.ts tests/customer-order-repository.test.ts
```

Expected: FAIL because the detail page does not yet implement edit/cancel behavior.

- [ ] **Step 3: Implement note editing, notifier invocation, and cancel confirmation**

```ts
async handleSaveNote() {
  const updated = await repository.updateOrderNote(this.data.order.id, this.data.noteDraft)
  await notifier.notifyOrderNoteChanged({ orderId: updated.id, note: updated.note })
  this.syncOrder(updated.id)
}

async handleConfirmCancel() {
  await repository.cancelOrder(this.data.order.id)
  this.syncOrder(this.data.order.id)
}
```

- [ ] **Step 4: Re-run the detail-page and repository tests**

Run:

```bash
npm --prefix App run test:file -- tests/customer-order-detail-page.test.ts tests/customer-order-repository.test.ts
```

Expected: PASS.

### Task 5: Run Regression Tests And Manual Verification

**Files:**
- Test: `App/tests/customer-orders-scene.test.ts`
- Test: `App/tests/customer-order-detail-page.test.ts`
- Test: `App/tests/customer-order-repository.test.ts`

- [ ] **Step 1: Run the focused order-management suite**

Run:

```bash
npm --prefix App run test:file -- tests/customer-orders-scene.test.ts tests/customer-order-detail-page.test.ts tests/customer-order-repository.test.ts
```

Expected: PASS.

- [ ] **Step 2: Run the full automated suite**

Run:

```bash
npm --prefix App run test
```

Expected: PASS for the full committed suite.

- [ ] **Step 3: Run a fresh TypeScript type check**

Run:

```bash
npm exec -- tsc --noEmit -p tsconfig.json
```

Working directory: `App`

Expected: PASS.

- [ ] **Step 4: Verify the order-management flow manually in微信开发者工具 `2.01.2510280`**

Run / 操作步骤:

```text
1. 从顾客订单列表进入任一待支付订单详情页。
2. 修改备注并保存，返回订单列表观察卡片是否出现备注高亮。
3. 再次进入该订单，确认备注内容已持久化。
4. 对可取消订单点击“取消订单”，确认弹窗后检查状态是否变为“已取消”。
5. 准备一个状态为“待取货”的订单，进入详情页确认不显示取消按钮。
```

Expected:

```text
- 订单卡片可点击进入详情。
- 有备注的订单卡片显示淡粉色高亮。
- 备注保存成功后列表和详情都能看到最新内容。
- 可取消订单确认后变为“已取消”。
- “待取货”“已完成”“已取消”订单不再显示取消按钮。
```
