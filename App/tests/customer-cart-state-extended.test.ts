import assert from 'node:assert/strict'
import test from 'node:test'

import {
  areAllCartItemsChecked,
  createCartItem,
  removeCartItem,
  toggleAllCartItemsChecked,
} from '../miniprogram/utils/customer-cart-state'

test('toggleAllCartItemsChecked marks every cart item as checked', () => {
  const items = toggleAllCartItemsChecked([
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
  ], true)

  assert.equal(items.every((item) => item.checked), true)
  assert.equal(areAllCartItemsChecked(items), true)
})

test('toggleAllCartItemsChecked clears every checked cart item', () => {
  const items = toggleAllCartItemsChecked([
    createCartItem({
      productId: 'cake-cloud',
      quantity: 1,
      layerId: 'single',
      sizePlanId: 'single-6',
      creamId: 'fresh',
      checked: true,
    }),
    createCartItem({
      productId: 'cake-peach',
      quantity: 1,
      layerId: 'single',
      sizePlanId: 'single-8',
      creamId: 'animal',
      checked: true,
    }),
  ], false)

  assert.equal(items.every((item) => item.checked === false), true)
  assert.equal(areAllCartItemsChecked(items), false)
})

test('removeCartItem deletes a single cart record by id', () => {
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

  const nextItems = removeCartItem(items, items[0].id)

  assert.equal(nextItems.length, 1)
  assert.equal(nextItems[0]?.productId, 'cake-peach')
})
