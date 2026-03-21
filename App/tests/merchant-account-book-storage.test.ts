import assert from 'node:assert/strict'
import test from 'node:test'

import type { MerchantAccountBookRecord } from '../types/merchant-account-book'
import {
  collectDueExpiryReminders,
  createMemoryMerchantAccountBookStorage,
  createMerchantAccountBookRecord,
  loadMerchantAccountBookSnapshot,
  loadStoredMerchantAccountBookRecords,
  markMerchantAccountBookReminderNotified,
  markMerchantAccountBookReminderSubscribed,
  resolveAccountBookExpiryState,
} from '../miniprogram/utils/merchant-account-book-storage'

function createNow(isoText: string): () => Date {
  return () => new Date(isoText)
}

function createRecordSeed(id: string, expiryDate: string): MerchantAccountBookRecord {
  return {
    id,
    itemName: `散货-${id}`,
    photoUrl: '',
    costPrice: 18,
    expiryDate,
    reminderSubscribed: false,
    lastReminderDate: '',
    createdAt: '2026-03-20T00:00:00.000Z',
    updatedAt: '2026-03-20T00:00:00.000Z',
  }
}

test('createMerchantAccountBookRecord persists item name photo cost and expiry date', () => {
  const storage = createMemoryMerchantAccountBookStorage()

  const created = createMerchantAccountBookRecord(
    storage,
    {
      itemName: '预制曲奇',
      photoUrl: '/tmp/cookie.jpg',
      costPrice: 15,
      expiryDate: '2026-03-31',
    },
    createNow('2026-03-20T02:30:00.000Z'),
  )

  assert.equal(created.itemName, '预制曲奇')
  assert.equal(created.photoUrl, '/tmp/cookie.jpg')
  assert.equal(created.costPrice, 15)
  assert.equal(created.expiryDate, '2026-03-31')
  assert.equal(loadMerchantAccountBookSnapshot(storage).length, 1)
})

test('resolveAccountBookExpiryState marks records as near-expiry when 10 days left', () => {
  const state = resolveAccountBookExpiryState('2026-03-30', new Date('2026-03-20T00:00:00.000Z'))

  assert.equal(state.daysLeft, 10)
  assert.equal(state.isNearExpiry, true)
  assert.equal(state.isExpired, false)
})

test('collectDueExpiryReminders returns only subscribed records within 10 days and not reminded today', () => {
  const storage = createMemoryMerchantAccountBookStorage()
  const records: MerchantAccountBookRecord[] = [
    {
      ...createRecordSeed('a', '2026-03-28'),
      reminderSubscribed: true,
      lastReminderDate: '',
    },
    {
      ...createRecordSeed('b', '2026-04-10'),
      reminderSubscribed: true,
      lastReminderDate: '',
    },
    {
      ...createRecordSeed('c', '2026-03-28'),
      reminderSubscribed: true,
      lastReminderDate: '2026-03-20',
    },
  ]

  storage.setStorageSync('merchant-account-book-v1', JSON.stringify(records))
  const dueRecords = collectDueExpiryReminders(
    loadStoredMerchantAccountBookRecords(storage),
    new Date('2026-03-20T08:00:00.000Z'),
  )

  assert.deepEqual(
    dueRecords.map((record) => record.id),
    ['a'],
  )
})

test('markMerchantAccountBookReminderSubscribed and notified update reminder fields', () => {
  const storage = createMemoryMerchantAccountBookStorage()
  const records: MerchantAccountBookRecord[] = [createRecordSeed('x', '2026-03-28')]
  storage.setStorageSync('merchant-account-book-v1', JSON.stringify(records))

  markMerchantAccountBookReminderSubscribed(storage, ['x'], createNow('2026-03-20T09:00:00.000Z'))
  markMerchantAccountBookReminderNotified(storage, ['x'], createNow('2026-03-20T09:05:00.000Z'))

  const [updated] = loadMerchantAccountBookSnapshot(storage)
  assert.equal(updated?.reminderSubscribed, true)
  assert.equal(updated?.lastReminderDate, '2026-03-20')
})

