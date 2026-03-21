import assert from 'node:assert/strict'
import test from 'node:test'

import type { OrderRecord, OrderStatus } from '../types/order'
import { createMemoryOrderStorage, loadOrderSnapshot, saveOrderSnapshot } from '../miniprogram/utils/customer-order-storage'

function createStoredOrder(input: {
  id: string
  status?: OrderStatus
  updatedAt?: string
}): OrderRecord {
  return {
    id: input.id,
    customerOpenId: 'openid-customer',
    merchantOpenId: 'openid-merchant',
    status: input.status ?? 'pending-payment',
    items: [
      {
        productId: 'cake-cloud',
        productName: '云朵鲜奶生日蛋糕',
        specId: 'cake-cloud-single-6',
        specLabel: '单层 / 6 英寸',
        layerId: 'single',
        sizePlanId: 'cake-cloud-single-6',
        creamId: 'fresh',
        creamLabel: '乳脂奶油',
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
    updatedAt: input.updatedAt ?? '2026-03-14T02:30:00.000Z',
  }
}

test('merchant order management updates status through a dedicated helper', async () => {
  const helpers = await import('../miniprogram/utils/merchant-order-management')
  const storage = createMemoryOrderStorage()
  saveOrderSnapshot(storage, [createStoredOrder({ id: 'order-1', status: 'pending-payment' })])

  const updated = helpers.updateMerchantOrderStatus(storage, 'order-1', 'in-production', () => new Date('2026-03-20T01:00:00.000Z'))
  const snapshot = loadOrderSnapshot(storage)

  assert.equal(updated.status, 'in-production')
  assert.equal(snapshot[0]?.status, 'in-production')
  assert.equal(snapshot[0]?.updatedAt, '2026-03-20T01:00:00.000Z')
})

test('merchant order management blocks invalid status transitions', async () => {
  const helpers = await import('../miniprogram/utils/merchant-order-management')
  const storage = createMemoryOrderStorage()
  saveOrderSnapshot(storage, [createStoredOrder({ id: 'order-2', status: 'ready-for-pickup' })])

  assert.throws(() => helpers.updateMerchantOrderStatus(storage, 'order-2', 'in-production'))
})

test('merchant order management moves completed orders into merchant recycle bin', async () => {
  const helpers = await import('../miniprogram/utils/merchant-order-management')
  const storage = createMemoryOrderStorage()
  saveOrderSnapshot(storage, [
    createStoredOrder({ id: 'completed-order', status: 'completed' }),
    createStoredOrder({ id: 'pending-order', status: 'pending-payment' }),
  ])

  const deleted = helpers.moveCompletedOrderToMerchantRecycle(
    storage,
    'completed-order',
    'manual',
    () => new Date('2026-03-21T00:00:00.000Z'),
  )
  const snapshot = loadOrderSnapshot(storage)

  assert.equal(deleted.id, 'completed-order')
  assert.equal(snapshot.some((order) => order.id === 'completed-order'), true)
  assert.equal(
    snapshot.find((order) => order.id === 'completed-order')?.merchantRecycleMeta?.source,
    'manual',
  )
  assert.throws(() => helpers.moveCompletedOrderToMerchantRecycle(storage, 'pending-order', 'manual'))
})

test('merchant order management stores auto cleanup days in dedicated storage key', async () => {
  const helpers = await import('../miniprogram/utils/merchant-order-management')
  const storage = createMemoryOrderStorage()

  helpers.saveMerchantOrderAutoCleanupDays(storage, 7)

  assert.equal(helpers.loadMerchantOrderAutoCleanupDays(storage), 7)
})

test('merchant order management moves expired completed orders into recycle bin by configured days', async () => {
  const helpers = await import('../miniprogram/utils/merchant-order-management')
  const oldCompleted = createStoredOrder({
    id: 'completed-old',
    status: 'completed',
    updatedAt: '2026-03-01T02:30:00.000Z',
  })
  const freshCompleted = createStoredOrder({
    id: 'completed-fresh',
    status: 'completed',
    updatedAt: '2026-03-19T02:30:00.000Z',
  })
  const active = createStoredOrder({
    id: 'ready-order',
    status: 'ready-for-pickup',
    updatedAt: '2026-03-01T02:30:00.000Z',
  })

  const retained = helpers.moveExpiredCompletedOrdersToMerchantRecycle(
    [oldCompleted, freshCompleted, active],
    7,
    new Date('2026-03-21T00:00:00.000Z'),
  )

  assert.equal(retained.some((order) => order.id === 'completed-old'), true)
  assert.equal(
    retained.find((order) => order.id === 'completed-old')?.merchantRecycleMeta?.source,
    'auto-cleanup',
  )
  assert.equal(retained.find((order) => order.id === 'completed-fresh')?.merchantRecycleMeta, undefined)
  assert.equal(retained.find((order) => order.id === 'ready-order')?.merchantRecycleMeta, undefined)
})

test('merchant order management reuses recycle chain for instant clear and restore', async () => {
  const helpers = await import('../miniprogram/utils/merchant-order-management')
  const storage = createMemoryOrderStorage()
  saveOrderSnapshot(storage, [
    createStoredOrder({ id: 'completed-a', status: 'completed' }),
    createStoredOrder({ id: 'completed-b', status: 'completed' }),
    createStoredOrder({ id: 'ready-order', status: 'ready-for-pickup' }),
  ])

  const clearedOrders = helpers.moveCompletedOrdersToMerchantRecycle(
    storage,
    'instant-clear',
    () => new Date('2026-03-21T01:00:00.000Z'),
  )

  assert.equal(clearedOrders.length, 2)
  assert.equal(clearedOrders.every((order) => order.merchantRecycleMeta?.source === 'instant-clear'), true)

  const restored = helpers.restoreMerchantRecycledOrder(
    storage,
    'completed-a',
    () => new Date('2026-03-21T02:00:00.000Z'),
  )

  assert.equal(restored.merchantRecycleMeta, undefined)
})
