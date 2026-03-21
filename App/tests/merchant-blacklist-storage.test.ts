import assert from 'node:assert/strict'
import test from 'node:test'

import {
  addOpenIdToMerchantBlacklist,
  createMemoryMerchantBlacklistStorage,
  isCustomerOpenIdBlacklisted,
  loadMerchantBlacklistSnapshot,
  removeOpenIdFromMerchantBlacklist,
} from '../miniprogram/utils/merchant-blacklist-storage'

function createNow(isoText: string): () => Date {
  return () => new Date(isoText)
}

test('addOpenIdToMerchantBlacklist stores unique openid entries', () => {
  const storage = createMemoryMerchantBlacklistStorage()

  addOpenIdToMerchantBlacklist(storage, 'openid-a', createNow('2026-03-20T01:00:00.000Z'))
  addOpenIdToMerchantBlacklist(storage, 'openid-a', createNow('2026-03-20T02:00:00.000Z'))
  addOpenIdToMerchantBlacklist(storage, 'openid-b', createNow('2026-03-20T03:00:00.000Z'))

  const entries = loadMerchantBlacklistSnapshot(storage)

  assert.deepEqual(
    entries.map((entry) => entry.openId),
    ['openid-a', 'openid-b'],
  )
})

test('removeOpenIdFromMerchantBlacklist deletes target entry', () => {
  const storage = createMemoryMerchantBlacklistStorage()

  addOpenIdToMerchantBlacklist(storage, 'openid-a', createNow('2026-03-20T01:00:00.000Z'))
  addOpenIdToMerchantBlacklist(storage, 'openid-b', createNow('2026-03-20T02:00:00.000Z'))

  removeOpenIdFromMerchantBlacklist(storage, 'openid-a')

  assert.deepEqual(
    loadMerchantBlacklistSnapshot(storage).map((entry) => entry.openId),
    ['openid-b'],
  )
})

test('isCustomerOpenIdBlacklisted checks blacklist membership by openid', () => {
  const storage = createMemoryMerchantBlacklistStorage()

  addOpenIdToMerchantBlacklist(storage, 'openid-locked', createNow('2026-03-20T01:00:00.000Z'))

  assert.equal(isCustomerOpenIdBlacklisted('openid-locked', storage), true)
  assert.equal(isCustomerOpenIdBlacklisted('openid-free', storage), false)
})

