import assert from 'node:assert/strict'
import test from 'node:test'

import type { OrderRecord } from '../types/order'
import {
  createMemoryOrderStorage,
  loadOrderSnapshot,
  saveOrderSnapshot,
} from '../miniprogram/utils/customer-order-storage'

function createOrderRecord(id: string): OrderRecord {
  return {
    id,
    customerOpenId: 'openid-customer',
    merchantOpenId: 'openid-merchant',
    status: 'pending-payment',
    items: [
      {
        productId: 'cake-cloud',
        productName: '云朵鲜奶生日蛋糕',
        specId: 'cake-cloud-single-6',
        specLabel: '单层 / 6 英寸 / 轻乳脂鲜奶油',
        layerId: 'single',
        sizePlanId: 'cake-cloud-single-6',
        creamId: 'fresh',
        size: '6-inch',
        quantity: 1,
        unitPrice: 168,
        coverImage: '',
      },
    ],
    contact: {
      phone: '13812345678',
      phoneTail: '5678',
    },
    pickupSlot: {
      month: 3,
      day: 18,
      timeLabel: '10:30',
      isoText: '2026-03-18T02:30:00.000Z',
    },
    note: '',
    hasNote: false,
    totalAmount: 168,
    createdAt: '2026-03-14T02:30:00.000Z',
    updatedAt: '2026-03-14T02:30:00.000Z',
  }
}

test('saveOrderSnapshot persists and restores local customer orders', () => {
  const storage = createMemoryOrderStorage()
  const orders = [createOrderRecord('order-1')]

  saveOrderSnapshot(storage, orders)

  assert.deepEqual(loadOrderSnapshot(storage), orders)
})

test('loadOrderSnapshot falls back to an empty list for invalid stored payloads', () => {
  const storage = createMemoryOrderStorage()

  storage.setStorageSync('customer-orders-v1', '{broken json')

  assert.deepEqual(loadOrderSnapshot(storage), [])
})
