import assert from 'node:assert/strict'
import test from 'node:test'

import type { CheckoutDraftRecord } from '../types/checkout'
import {
  canCustomerCancelOrder,
  createLocalCustomerOrderRepository,
} from '../miniprogram/utils/customer-order-repository'
import {
  createMemoryOrderStorage,
  loadOrderSnapshot,
  saveOrderSnapshot,
} from '../miniprogram/utils/customer-order-storage'
import type { OrderRecord } from '../types/order'

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
        specLabel: '单层 / 6 英寸 / 轻乳脂鲜奶油',
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
    note: input.note ?? '',
    hasNote: input.hasNote ?? false,
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
  assert.equal(order.items[0]?.specLabel, '单层 / 6 英寸 / 轻乳脂鲜奶油')
  assert.equal(storedOrders[0]?.id, order.id)
  assert.equal(storedOrders[0]?.items[0]?.creamId, 'fresh')
})

test('getOrderById returns the stored order detail by id', async () => {
  const storage = createMemoryOrderStorage()
  saveOrderSnapshot(storage, [createStoredOrder({ id: 'order-1' })])
  const repository = createLocalCustomerOrderRepository(storage)

  const order = await repository.getOrderById('order-1')

  assert.equal(order?.id, 'order-1')
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

test('canCustomerCancelOrder keeps ready-for-pickup and later statuses locked', () => {
  assert.equal(canCustomerCancelOrder('pending-payment'), true)
  assert.equal(canCustomerCancelOrder('ready-for-pickup'), false)
  assert.equal(canCustomerCancelOrder('completed'), false)
  assert.equal(canCustomerCancelOrder('cancelled'), false)
})
