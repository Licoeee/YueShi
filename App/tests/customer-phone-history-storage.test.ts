import assert from 'node:assert/strict'
import test from 'node:test'

import {
  clearPhoneHistorySnapshot,
  createMemoryCustomerPhoneHistoryStorage,
  loadPhoneHistorySnapshot,
  removePhoneFromHistory,
  savePhoneToHistory,
} from '../miniprogram/utils/customer-phone-history-storage'

test('savePhoneToHistory ignores invalid phone numbers', () => {
  const storage = createMemoryCustomerPhoneHistoryStorage()

  savePhoneToHistory(storage, '123')

  assert.deepEqual(loadPhoneHistorySnapshot(storage), [])
})

test('savePhoneToHistory keeps the newest valid phone first and deduplicates', () => {
  const storage = createMemoryCustomerPhoneHistoryStorage()

  savePhoneToHistory(storage, '13812345678')
  savePhoneToHistory(storage, '13987654321')
  savePhoneToHistory(storage, '13812345678')

  assert.deepEqual(loadPhoneHistorySnapshot(storage), ['13812345678', '13987654321'])
})

test('removePhoneFromHistory deletes a single phone record', () => {
  const storage = createMemoryCustomerPhoneHistoryStorage()

  savePhoneToHistory(storage, '13812345678')
  savePhoneToHistory(storage, '13987654321')
  removePhoneFromHistory(storage, '13812345678')

  assert.deepEqual(loadPhoneHistorySnapshot(storage), ['13987654321'])
})

test('clearPhoneHistorySnapshot removes all saved phones', () => {
  const storage = createMemoryCustomerPhoneHistoryStorage()

  savePhoneToHistory(storage, '13812345678')
  clearPhoneHistorySnapshot(storage)

  assert.deepEqual(loadPhoneHistorySnapshot(storage), [])
})
