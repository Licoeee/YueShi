import assert from 'node:assert/strict'
import test from 'node:test'

import {
  CUSTOMER_CART_STORAGE_KEY,
  createMemoryCartStorage,
  loadCartSnapshot,
  saveCartSnapshot,
} from '../miniprogram/utils/customer-cart-storage'
import {
  createCartItem,
  markImmediatePurchase,
  toggleCartItemChecked,
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
      creamId: 'animal',
    }),
  ]
  const marked = markImmediatePurchase(items, items[1].id)

  assert.equal(marked[0]?.checked, false)
  assert.equal(marked[1]?.checked, true)
})

test('toggleCartItemChecked turns cart selection back into normal cart mode', () => {
  const items = markImmediatePurchase([
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
      creamId: 'animal',
    }),
  ], 'cake-peach:single:single-8:animal')

  const toggled = toggleCartItemChecked(items, items[0].id)

  assert.equal(toggled[0]?.checked, true)
  assert.equal(toggled[0]?.entryMode, 'cart')
  assert.equal(toggled[1]?.entryMode, 'cart')
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

test('loadCartSnapshot normalizes legacy numeric cart ids into strings', () => {
  const storage = createMemoryCartStorage()

  storage.setStorageSync(
    CUSTOMER_CART_STORAGE_KEY,
    JSON.stringify([
      {
        id: 1001,
        productId: 'cake-cloud',
        productName: '云朵蛋糕',
        coverImage: '',
        specLabel: '单层 / 6寸',
        creamLabel: '乳脂奶油',
        quantity: 1,
        unitPrice: 168,
        totalPrice: 168,
        checked: true,
        entryMode: 'cart',
        selection: {
          layerId: 'single',
          sizePlanId: 'single-6',
          creamId: 'fresh',
        },
      },
    ]),
  )

  const snapshot = loadCartSnapshot(storage)

  assert.equal(snapshot.length, 1)
  assert.equal(typeof snapshot[0]?.id, 'string')
  assert.equal(snapshot[0]?.id, '1001')
})
