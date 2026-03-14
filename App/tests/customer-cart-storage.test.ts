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
  const first = createCartItem({
    productId: 'cake-cloud',
    quantity: 1,
    layerId: 'single',
    sizePlanId: 'single-6',
    creamId: 'fresh',
  })
  const next = upsertCartItem([
    first,
  ], createCartItem({
    productId: 'cake-cloud',
    quantity: 1,
    layerId: 'single',
    sizePlanId: 'single-6',
    creamId: 'fresh',
  }))

  assert.equal(next.length, 1)
  assert.equal(next[0]?.quantity, 2)
})

test('markImmediatePurchase keeps only the active item checked', () => {
  const items = [
    createCartItem({
      productId: 'cake-cloud',
      quantity: 1,
      layerId: 'single',
      sizePlanId: 'single-6',
      creamId: 'fresh',
    }),
    createCartItem({
      productId: 'cake-peach',
      quantity: 1,
      layerId: 'single',
      sizePlanId: 'single-8',
      creamId: 'sea-salt',
    }),
  ]
  const marked = markImmediatePurchase(items, items[1].id)

  assert.equal(marked[0]?.checked, false)
  assert.equal(marked[1]?.checked, true)
})

test('saveCartSnapshot persists and restores the serialized cart payload', () => {
  const storage = createMemoryCartStorage()
  const items = [
    createCartItem({
      productId: 'cake-cloud',
      quantity: 2,
      layerId: 'single',
      sizePlanId: 'single-6',
      creamId: 'fresh',
    }),
  ]

  saveCartSnapshot(storage, items)

  assert.deepEqual(loadCartSnapshot(storage), items)
})
