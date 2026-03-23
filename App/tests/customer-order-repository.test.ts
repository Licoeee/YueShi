import assert from 'node:assert/strict'
import test from 'node:test'

import type { CheckoutDraftRecord } from '../types/checkout'
import {
  CUSTOMER_ORDER_BLACKLIST_ERROR_CODE,
  canCustomerCancelOrder,
  createLocalCustomerOrderRepository,
} from '../miniprogram/utils/customer-order-repository'
import {
  createMemoryOrderStorage,
  loadOrderSnapshot,
  saveOrderSnapshot,
} from '../miniprogram/utils/customer-order-storage'
import type { OrderRecord } from '../types/order'
import {
  addOpenIdToMerchantBlacklist,
  createMemoryMerchantBlacklistStorage,
} from '../miniprogram/utils/merchant-blacklist-storage'

function createCheckoutDraft(): CheckoutDraftRecord {
  return {
    source: 'cart',
    items: [
      {
        id: 'cake-cloud:single:cake-cloud-single-6:fresh',
        productId: 'cake-cloud',
        productName: '云朵鲜奶生日蛋糕',
        coverImage: '',
        quantity: 2,
        unitPrice: 168,
        subtotal: 336,
        layerId: 'single',
        sizePlanId: 'cake-cloud-single-6',
        creamId: 'fresh',
        specLabel: '单层 / 6 英寸',
        creamLabel: '乳脂奶油',
      },
    ],
    contact: {
      phone: '13812345678',
    },
    pickupSlot: {
      month: 3,
      day: 18,
      timeLabel: '10:30',
      isoText: '2026-03-18T02:30:00.000Z',
    },
    totalAmount: 336,
  }
}

function createStoredOrder(input: {
  id: string
  status?: OrderRecord['status']
  note?: string
  hasNote?: boolean
  customerRecycleMeta?: OrderRecord['customerRecycleMeta']
  merchantRecycleMeta?: OrderRecord['merchantRecycleMeta']
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
    note: input.note ?? '',
    hasNote: input.hasNote ?? false,
    customerRecycleMeta: input.customerRecycleMeta,
    merchantRecycleMeta: input.merchantRecycleMeta,
    totalAmount: 168,
    createdAt: '2026-03-14T02:30:00.000Z',
    updatedAt: '2026-03-14T02:30:00.000Z',
  }
}

test('createDraftOrder prepends the new order and derives phone tail and selection detail', async () => {
  const storage = createMemoryOrderStorage()
  const repository = createLocalCustomerOrderRepository(storage)

  const order = await repository.createDraftOrder(createCheckoutDraft())
  const storedOrders = loadOrderSnapshot(storage)

  assert.equal(order.status, 'pending-payment')
  assert.equal(order.contact.phoneTail, '5678')
  assert.equal(order.items[0]?.specLabel, '单层 / 6 英寸')
  assert.equal(order.items[0]?.creamLabel, '乳脂奶油')
  assert.equal(storedOrders[0]?.id, order.id)
  assert.equal(storedOrders[0]?.items[0]?.creamId, 'fresh')
})

test('createDraftOrder blocks customers in merchant blacklist', async () => {
  const storage = createMemoryOrderStorage()
  const blacklistStorage = createMemoryMerchantBlacklistStorage()
  addOpenIdToMerchantBlacklist(blacklistStorage, 'local-customer')

  const runtimeGlobal = globalThis as { wx?: unknown }
  const previousWx = runtimeGlobal.wx
  runtimeGlobal.wx = blacklistStorage

  try {
    const repository = createLocalCustomerOrderRepository(storage)
    await assert.rejects(() => repository.createDraftOrder(createCheckoutDraft()), (error: unknown) => {
      return error instanceof Error && error.message === CUSTOMER_ORDER_BLACKLIST_ERROR_CODE
    })
  } finally {
    runtimeGlobal.wx = previousWx
  }
})

test('getOrderById returns the stored order detail by id', async () => {
  const storage = createMemoryOrderStorage()
  saveOrderSnapshot(storage, [createStoredOrder({ id: 'order-1' })])
  const repository = createLocalCustomerOrderRepository(storage)

  const order = await repository.getOrderById('order-1')

  assert.equal(order?.id, 'order-1')
})

test('getOrderById hides orders moved into merchant recycle bin', async () => {
  const storage = createMemoryOrderStorage()
  saveOrderSnapshot(storage, [
    createStoredOrder({
      id: 'merchant-recycled-order',
      status: 'completed',
      merchantRecycleMeta: {
        deletedAt: '2026-03-21T00:00:00.000Z',
        source: 'manual',
      },
    }),
  ])
  const repository = createLocalCustomerOrderRepository(storage)

  const order = await repository.getOrderById('merchant-recycled-order')

  assert.equal(order, null)
})

test('updateOrderNote persists note content and note flags', async () => {
  const storage = createMemoryOrderStorage()
  saveOrderSnapshot(storage, [createStoredOrder({ id: 'order-1' })])
  const repository = createLocalCustomerOrderRepository(storage)

  const updated = await repository.updateOrderNote('order-1', '插一支数字蜡烛')

  assert.equal(updated.note, '插一支数字蜡烛')
  assert.equal(updated.hasNote, true)
  assert.equal(loadOrderSnapshot(storage)[0]?.note, '插一支数字蜡烛')
})

test('cancelOrder rejects locked statuses', async () => {
  const storage = createMemoryOrderStorage()
  saveOrderSnapshot(storage, [createStoredOrder({ id: 'ready-order', status: 'ready-for-pickup' })])
  const repository = createLocalCustomerOrderRepository(storage)

  await assert.rejects(() => repository.cancelOrder('ready-order'))
})

test('cancelOrder marks cancellable orders as cancelled', async () => {
  const storage = createMemoryOrderStorage()
  saveOrderSnapshot(storage, [createStoredOrder({ id: 'open-order', status: 'pending-payment' })])
  const repository = createLocalCustomerOrderRepository(storage)

  const updated = await repository.cancelOrder('open-order')

  assert.equal(updated.status, 'cancelled')
  assert.equal(loadOrderSnapshot(storage)[0]?.status, 'cancelled')
})

test('deleteOrder only allows cancelled or completed orders', async () => {
  const storage = createMemoryOrderStorage()
  saveOrderSnapshot(storage, [createStoredOrder({ id: 'pending-order', status: 'pending-payment' })])
  const repository = createLocalCustomerOrderRepository(storage)

  await assert.rejects(() => repository.deleteOrder('pending-order'))
})

test('deleteOrder marks cancelled/completed orders into customer recycle bin', async () => {
  const storage = createMemoryOrderStorage()
  saveOrderSnapshot(storage, [
    createStoredOrder({ id: 'completed-order', status: 'completed' }),
    createStoredOrder({ id: 'cancelled-order', status: 'cancelled' }),
  ])
  const repository = createLocalCustomerOrderRepository(storage)

  const deletedCompleted = await repository.deleteOrder('completed-order')
  const deletedCancelled = await repository.deleteOrder('cancelled-order')
  const snapshot = loadOrderSnapshot(storage)
  const completedOrder = snapshot.find((order) => order.id === 'completed-order')
  const cancelledOrder = snapshot.find((order) => order.id === 'cancelled-order')

  assert.equal(deletedCompleted.customerRecycleMeta !== undefined, true)
  assert.equal(deletedCancelled.customerRecycleMeta !== undefined, true)
  assert.equal(completedOrder?.customerRecycleMeta !== undefined, true)
  assert.equal(cancelledOrder?.customerRecycleMeta !== undefined, true)
})

test('restoreDeletedOrder puts order back to active list by clearing recycle meta', async () => {
  const storage = createMemoryOrderStorage()
  saveOrderSnapshot(storage, [
    createStoredOrder({
      id: 'deleted-order',
      status: 'completed',
      customerRecycleMeta: {
        deletedAt: '2026-03-20T02:30:00.000Z',
        recoverExpiresAt: '2026-03-27T02:30:00.000Z',
      },
    }),
  ])
  const repository = createLocalCustomerOrderRepository(storage)

  const restored = await repository.restoreDeletedOrder('deleted-order')

  assert.equal(restored.customerRecycleMeta, undefined)
  assert.equal(loadOrderSnapshot(storage)[0]?.customerRecycleMeta, undefined)
})

test('expired deleted orders are cleaned from local snapshot before reads', async () => {
  const storage = createMemoryOrderStorage()
  saveOrderSnapshot(storage, [
    createStoredOrder({
      id: 'expired-deleted-order',
      status: 'completed',
      customerRecycleMeta: {
        deletedAt: '2026-03-01T02:30:00.000Z',
        recoverExpiresAt: '2026-03-08T02:30:00.000Z',
      },
    }),
    createStoredOrder({ id: 'active-order', status: 'pending-payment' }),
  ])
  const repository = createLocalCustomerOrderRepository(storage)

  const order = await repository.getOrderById('expired-deleted-order')
  const snapshot = loadOrderSnapshot(storage)

  assert.equal(order, null)
  assert.equal(snapshot.some((item) => item.id === 'expired-deleted-order'), false)
  assert.equal(snapshot.some((item) => item.id === 'active-order'), true)
})

test('canCustomerCancelOrder keeps ready-for-pickup and later statuses locked', () => {
  assert.equal(canCustomerCancelOrder('pending-payment'), true)
  assert.equal(canCustomerCancelOrder('ready-for-pickup'), false)
  assert.equal(canCustomerCancelOrder('completed'), false)
  assert.equal(canCustomerCancelOrder('cancelled'), false)
})
