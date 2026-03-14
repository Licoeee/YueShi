import assert from 'node:assert/strict'
import test from 'node:test'

import {
  applySelectionToCart,
  buildCartItemFromSelection,
  buildDefaultSelection,
  resolveSelectableSizePlans,
  updateSelectionLayer,
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

test('changing the selected layer rebinds the size plan to a matching layer option', () => {
  const cake = getCakeDetailById('cake-cloud')
  const selection = updateSelectionLayer(cake, buildDefaultSelection(cake), 'double')
  const plans = resolveSelectableSizePlans(cake, selection.layerId)

  assert.equal(selection.layerId, 'double')
  assert.equal(plans.some((plan) => plan.id === selection.sizePlanId), true)
})

test('applySelectionToCart marks only the active item as checked for buy-now', () => {
  const selectedCake = getCakeDetailById('cake-cloud')
  const existingCake = getCakeDetailById('cake-peach')
  const existingItem = buildCartItemFromSelection(existingCake, buildDefaultSelection(existingCake))
  const result = applySelectionToCart([existingItem], selectedCake, buildDefaultSelection(selectedCake), 'buy-now')
  const activeItem = result.items.find((item) => item.productId === selectedCake.id)
  const inactiveItem = result.items.find((item) => item.productId === existingCake.id)

  assert.equal(result.activeItemId, activeItem?.id)
  assert.equal(activeItem?.checked, true)
  assert.equal(inactiveItem?.checked, false)
})
