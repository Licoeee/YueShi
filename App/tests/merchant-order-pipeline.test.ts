import assert from 'node:assert/strict'
import test from 'node:test'

import type { OrderRecord } from '../types/order'
import {
  buildMerchantOrderPipeline,
  filterMerchantOrdersByDate,
  toMerchantCalendarDateKey,
} from '../miniprogram/utils/merchant-order-pipeline'

function createOrderRecord(id: string, pickupIsoText: string, hasNote = false): OrderRecord {
  return {
    id,
    customerOpenId: `customer-${id}`,
    merchantOpenId: 'merchant-local',
    status: 'pending-payment',
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
      day: 20,
      timeLabel: '10:30',
      isoText: pickupIsoText,
    },
    note: hasNote ? '少糖' : '',
    hasNote,
    totalAmount: 168,
    createdAt: '2026-03-20T02:00:00.000Z',
    updatedAt: '2026-03-20T02:00:00.000Z',
  }
}

test('buildMerchantOrderPipeline sorts pickup time from near to far', () => {
  const orders = [
    createOrderRecord('order-late', '2026-03-23T02:30:00.000Z'),
    createOrderRecord('order-soon', '2026-03-20T02:30:00.000Z', true),
    createOrderRecord('order-middle', '2026-03-21T02:30:00.000Z'),
  ]

  const result = buildMerchantOrderPipeline(orders)

  assert.deepEqual(
    result.map((order) => order.id),
    ['order-soon', 'order-middle', 'order-late'],
  )
  assert.equal(result[0].hasNote, true)
})

test('filterMerchantOrdersByDate keeps only orders on selected date key', () => {
  const orders = buildMerchantOrderPipeline([
    createOrderRecord('order-a', '2026-03-20T02:30:00.000Z'),
    createOrderRecord('order-b', '2026-03-21T02:30:00.000Z'),
    createOrderRecord('order-c', '2026-03-21T08:30:00.000Z'),
  ])

  const result = filterMerchantOrdersByDate(orders, '2026-03-21')

  assert.deepEqual(
    result.map((order) => order.id),
    ['order-b', 'order-c'],
  )
})

test('filterMerchantOrdersByDate returns full list for empty or invalid key', () => {
  const orders = buildMerchantOrderPipeline([
    createOrderRecord('order-a', '2026-03-20T02:30:00.000Z'),
    createOrderRecord('order-b', '2026-03-21T02:30:00.000Z'),
  ])

  assert.equal(filterMerchantOrdersByDate(orders, '').length, 2)
  assert.equal(filterMerchantOrdersByDate(orders, '2026/03/21').length, 2)
})

test('toMerchantCalendarDateKey parses date values from string, date object, timestamp and array payload', () => {
  const date = new Date('2026-03-21T00:00:00.000Z')

  assert.equal(toMerchantCalendarDateKey('2026-03-21'), '2026-03-21')
  assert.equal(toMerchantCalendarDateKey(date), '2026-03-21')
  assert.equal(toMerchantCalendarDateKey(date.getTime()), '2026-03-21')
  assert.equal(toMerchantCalendarDateKey([date]), '2026-03-21')
  assert.equal(toMerchantCalendarDateKey({ value: date }), '2026-03-21')
})
