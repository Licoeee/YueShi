import assert from 'node:assert/strict'
import test from 'node:test'

import { createCartItem } from '../miniprogram/utils/customer-cart-state'
import { buildCheckoutState, removeSubmittedCartItems } from '../miniprogram/utils/customer-checkout-state'

test('buildCheckoutState keeps only checked cart items when normal cart checkout exists', () => {
  const state = buildCheckoutState([
    createCartItem({
      productId: 'cake-cloud',
      productName: '云朵鲜奶生日蛋糕',
      quantity: 2,
      layerId: 'single',
      sizePlanId: 'cake-cloud-single-6',
      creamId: 'fresh',
      unitPrice: 168,
      checked: true,
      entryMode: 'cart',
    }),
    createCartItem({
      productId: 'cake-peach',
      productName: '蜜桃日落双层蛋糕',
      quantity: 1,
      layerId: 'single',
      sizePlanId: 'cake-peach-single-6',
      creamId: 'peach',
      unitPrice: 238,
      checked: false,
      entryMode: 'cart',
    }),
  ])

  assert.equal(state.source, 'cart')
  assert.equal(state.items.length, 1)
  assert.equal(state.items[0]?.quantity, 2)
  assert.equal(state.items[0]?.specLabel, '单层 / 6 英寸 / 轻乳脂鲜奶油')
  assert.equal(state.totalAmount, 336)
})

test('buildCheckoutState falls back to the active buy-now item when cart items are not checked', () => {
  const state = buildCheckoutState([
    createCartItem({
      productId: 'cake-peach',
      productName: '蜜桃日落双层蛋糕',
      quantity: 1,
      layerId: 'double',
      sizePlanId: 'cake-peach-double-84',
      creamId: 'peach',
      unitPrice: 358,
      checked: true,
      entryMode: 'buy-now',
    }),
  ])

  assert.equal(state.source, 'buy-now')
  assert.equal(state.items.length, 1)
  assert.equal(state.items[0]?.specLabel, '双层 / 8 + 4 英寸 / 桃乌龙奶油')
  assert.equal(state.totalAmount, 358)
})

test('removeSubmittedCartItems drops the submitted items from the local cart snapshot', () => {
  const cartItems = [
    createCartItem({
      productId: 'cake-cloud',
      productName: '云朵鲜奶生日蛋糕',
      quantity: 1,
      layerId: 'single',
      sizePlanId: 'cake-cloud-single-6',
      creamId: 'fresh',
      unitPrice: 168,
      checked: true,
      entryMode: 'cart',
    }),
    createCartItem({
      productId: 'cake-mist',
      productName: '暖雾香草蛋糕',
      quantity: 1,
      layerId: 'single',
      sizePlanId: 'cake-mist-single-6',
      creamId: 'vanilla',
      unitPrice: 158,
      checked: false,
      entryMode: 'cart',
    }),
  ]
  const checkoutState = buildCheckoutState(cartItems)

  const remaining = removeSubmittedCartItems(cartItems, checkoutState.items)

  assert.equal(remaining.length, 1)
  assert.equal(remaining[0]?.productId, 'cake-mist')
})
