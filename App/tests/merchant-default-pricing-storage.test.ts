import assert from 'node:assert/strict'
import test from 'node:test'

import {
  addMerchantDefaultPricingCustomItem,
  createMemoryMerchantDefaultPricingStorage,
  deleteMerchantDefaultPricingItem,
  loadStoredMerchantDefaultPricing,
  updateMerchantDefaultPricingItemPrice,
} from '../miniprogram/utils/merchant-default-pricing-storage'

test('merchant default pricing storage seeds single double triple groups and supports custom add edit delete', () => {
  const storage = createMemoryMerchantDefaultPricingStorage()
  const seededSnapshot = loadStoredMerchantDefaultPricing(storage)

  assert.equal(seededSnapshot.single.length > 0, true)
  assert.equal(seededSnapshot.double.length > 0, true)
  assert.equal(seededSnapshot.triple.length > 0, true)

  const customItem = addMerchantDefaultPricingCustomItem(storage, {
    tier: 'single',
    sizes: ['16-inch'],
    creamType: 'animal-cream-i',
  })

  updateMerchantDefaultPricingItemPrice(storage, customItem.id, 288)

  let updatedSnapshot = loadStoredMerchantDefaultPricing(storage)
  let updatedItem = updatedSnapshot.single.find((item) => item.id === customItem.id)
  assert.equal(updatedItem?.basePrice, 288)

  deleteMerchantDefaultPricingItem(storage, customItem.id)

  updatedSnapshot = loadStoredMerchantDefaultPricing(storage)
  updatedItem = updatedSnapshot.single.find((item) => item.id === customItem.id)
  assert.equal(updatedItem, undefined)
})
