import type { MerchantOrderRecycleSource, OrderRecord, OrderStatus } from '../../types/order'
import { isOrderInCustomerRecycleBin } from './customer-order-recycle'
import { loadOrderSnapshot, saveOrderSnapshot, type OrderStorageLike } from './customer-order-storage'

export const MERCHANT_ORDER_AUTO_CLEANUP_KEY = 'merchant-order-auto-cleanup-days-v1'

export type MerchantOrderAutoCleanupDays = 0 | 3 | 7 | 15 | 30

const VALID_AUTO_CLEANUP_DAYS: MerchantOrderAutoCleanupDays[] = [0, 3, 7, 15, 30]
const MS_PER_DAY = 24 * 60 * 60 * 1000

const VALID_MERCHANT_STATUS_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  'pending-payment': ['in-production'],
  paid: ['in-production'],
  'in-production': ['ready-for-pickup'],
  'ready-for-pickup': ['completed'],
  completed: [],
  cancelled: [],
}

function resolveDefaultStorage(): OrderStorageLike {
  const maybeStorage = (globalThis as { wx?: OrderStorageLike }).wx
  if (maybeStorage === undefined) {
    throw new Error('Mini program storage is unavailable in the current runtime')
  }

  return maybeStorage
}

function resolveNow(createNow?: () => Date): Date {
  return typeof createNow === 'function' ? createNow() : new Date()
}

function normalizeCleanupDays(rawValue: unknown): MerchantOrderAutoCleanupDays {
  if (typeof rawValue === 'number' && VALID_AUTO_CLEANUP_DAYS.includes(rawValue as MerchantOrderAutoCleanupDays)) {
    return rawValue as MerchantOrderAutoCleanupDays
  }

  if (typeof rawValue === 'string' && rawValue.length > 0) {
    const parsed = Number(rawValue)
    if (VALID_AUTO_CLEANUP_DAYS.includes(parsed as MerchantOrderAutoCleanupDays)) {
      return parsed as MerchantOrderAutoCleanupDays
    }
  }

  return 0
}

function findOrderIndex(orders: OrderRecord[], orderId: string): number {
  return orders.findIndex((order) => order.id === orderId)
}

function getRequiredOrder(orders: OrderRecord[], orderId: string): { order: OrderRecord; index: number } {
  const orderIndex = findOrderIndex(orders, orderId)
  if (orderIndex < 0) {
    throw new Error(`Order "${orderId}" does not exist`)
  }

  return {
    order: orders[orderIndex],
    index: orderIndex,
  }
}

function replaceOrderAtIndex(orders: OrderRecord[], orderIndex: number, nextOrder: OrderRecord): OrderRecord[] {
  return orders.map((order, index) => (index === orderIndex ? nextOrder : order))
}

function isMerchantOrderRecycleSource(rawValue: unknown): rawValue is MerchantOrderRecycleSource {
  return rawValue === 'manual' || rawValue === 'auto-cleanup' || rawValue === 'instant-clear'
}

export function isOrderInMerchantRecycleBin(order: OrderRecord): boolean {
  return order.merchantRecycleMeta !== undefined && isMerchantOrderRecycleSource(order.merchantRecycleMeta.source)
}

function createMerchantRecycleMeta(
  source: MerchantOrderRecycleSource,
  now: Date,
): NonNullable<OrderRecord['merchantRecycleMeta']> {
  return {
    deletedAt: now.toISOString(),
    source,
  }
}

function markOrderAsMerchantRecycled(
  order: OrderRecord,
  source: MerchantOrderRecycleSource,
  now: Date,
): OrderRecord {
  return {
    ...order,
    merchantRecycleMeta: createMerchantRecycleMeta(source, now),
    updatedAt: now.toISOString(),
  }
}

function clearMerchantRecycleMeta(order: OrderRecord, now: Date): OrderRecord {
  const nextOrder: OrderRecord = {
    ...order,
    updatedAt: now.toISOString(),
  }

  delete nextOrder.merchantRecycleMeta
  return nextOrder
}

function ensureValidTransition(currentStatus: OrderStatus, nextStatus: OrderStatus): void {
  if (VALID_MERCHANT_STATUS_TRANSITIONS[currentStatus]?.includes(nextStatus)) {
    return
  }

  throw new Error(`Order status cannot transition from "${currentStatus}" to "${nextStatus}"`)
}

function isExpiredCompletedOrder(
  order: OrderRecord,
  cleanupDays: MerchantOrderAutoCleanupDays,
  now: Date,
): boolean {
  if (cleanupDays === 0 || order.status !== 'completed' || isOrderInCustomerRecycleBin(order) || isOrderInMerchantRecycleBin(order)) {
    return false
  }

  const updatedAtMs = Date.parse(order.updatedAt)
  if (!Number.isFinite(updatedAtMs)) {
    return false
  }

  return now.getTime() - updatedAtMs >= cleanupDays * MS_PER_DAY
}

export function loadMerchantOrderAutoCleanupDays(
  storage: OrderStorageLike = resolveDefaultStorage(),
): MerchantOrderAutoCleanupDays {
  return normalizeCleanupDays(storage.getStorageSync(MERCHANT_ORDER_AUTO_CLEANUP_KEY))
}

export function saveMerchantOrderAutoCleanupDays(
  storage: OrderStorageLike,
  cleanupDays: MerchantOrderAutoCleanupDays,
): MerchantOrderAutoCleanupDays {
  const normalizedDays = normalizeCleanupDays(cleanupDays)
  storage.setStorageSync(MERCHANT_ORDER_AUTO_CLEANUP_KEY, String(normalizedDays))
  return normalizedDays
}

export function updateMerchantOrderStatus(
  storage: OrderStorageLike,
  orderId: string,
  nextStatus: OrderStatus,
  createNow?: () => Date,
): OrderRecord {
  const orders = loadOrderSnapshot(storage)
  const { order, index } = getRequiredOrder(orders, orderId)
  if (isOrderInCustomerRecycleBin(order) || isOrderInMerchantRecycleBin(order)) {
    throw new Error(`Order "${orderId}" is unavailable in merchant active orders`)
  }

  ensureValidTransition(order.status, nextStatus)

  const nextOrder: OrderRecord = {
    ...order,
    status: nextStatus,
    updatedAt: resolveNow(createNow).toISOString(),
  }

  saveOrderSnapshot(storage, replaceOrderAtIndex(orders, index, nextOrder))
  return nextOrder
}

export function moveCompletedOrderToMerchantRecycle(
  storage: OrderStorageLike,
  orderId: string,
  source: MerchantOrderRecycleSource = 'manual',
  createNow?: () => Date,
): OrderRecord {
  const orders = loadOrderSnapshot(storage)
  const { order, index } = getRequiredOrder(orders, orderId)
  if (isOrderInCustomerRecycleBin(order)) {
    throw new Error(`Order "${orderId}" is in customer recycle bin`)
  }

  if (isOrderInMerchantRecycleBin(order)) {
    return order
  }

  if (order.status !== 'completed') {
    throw new Error(`Order "${orderId}" is not completed`)
  }

  const nextOrder = markOrderAsMerchantRecycled(order, source, resolveNow(createNow))
  saveOrderSnapshot(storage, replaceOrderAtIndex(orders, index, nextOrder))
  return nextOrder
}

export function moveCompletedOrdersToMerchantRecycle(
  storage: OrderStorageLike,
  source: MerchantOrderRecycleSource = 'instant-clear',
  createNow?: () => Date,
): OrderRecord[] {
  const now = resolveNow(createNow)
  const orders = loadOrderSnapshot(storage)
  const movedOrders: OrderRecord[] = []

  const nextOrders = orders.map((order) => {
    if (order.status !== 'completed' || isOrderInCustomerRecycleBin(order) || isOrderInMerchantRecycleBin(order)) {
      return order
    }

    const nextOrder = markOrderAsMerchantRecycled(order, source, now)
    movedOrders.push(nextOrder)
    return nextOrder
  })

  if (movedOrders.length > 0) {
    saveOrderSnapshot(storage, nextOrders)
  }

  return movedOrders
}

export function moveExpiredCompletedOrdersToMerchantRecycle(
  orders: OrderRecord[],
  cleanupDays: MerchantOrderAutoCleanupDays,
  now: Date = new Date(),
): OrderRecord[] {
  const normalizedDays = normalizeCleanupDays(cleanupDays)
  if (normalizedDays === 0) {
    return [...orders]
  }

  return orders.map((order) =>
    isExpiredCompletedOrder(order, normalizedDays, now) ? markOrderAsMerchantRecycled(order, 'auto-cleanup', now) : order,
  )
}

export function restoreMerchantRecycledOrder(
  storage: OrderStorageLike,
  orderId: string,
  createNow?: () => Date,
): OrderRecord {
  const orders = loadOrderSnapshot(storage)
  const { order, index } = getRequiredOrder(orders, orderId)
  if (!isOrderInMerchantRecycleBin(order)) {
    throw new Error(`Order "${orderId}" is not in merchant recycle bin`)
  }

  const nextOrder = clearMerchantRecycleMeta(order, resolveNow(createNow))
  saveOrderSnapshot(storage, replaceOrderAtIndex(orders, index, nextOrder))
  return nextOrder
}

export function clearMerchantRecycleOrders(
  storage: OrderStorageLike,
  orderIds?: string[],
): OrderRecord[] {
  const orders = loadOrderSnapshot(storage)
  const targetIds = orderIds === undefined ? null : new Set(orderIds)
  const removedOrders = orders.filter(
    (order) => isOrderInMerchantRecycleBin(order) && (targetIds === null || targetIds.has(order.id)),
  )

  if (removedOrders.length === 0) {
    return []
  }

  const nextOrders = orders.filter(
    (order) => !isOrderInMerchantRecycleBin(order) || (targetIds !== null && !targetIds.has(order.id)),
  )
  saveOrderSnapshot(storage, nextOrders)
  return removedOrders
}

export interface MerchantOrderRecycleSplit {
  retainedOrders: OrderRecord[]
  activeOrders: OrderRecord[]
  recycleOrders: OrderRecord[]
}

export function splitMerchantOrdersByRecycleState(orders: OrderRecord[]): MerchantOrderRecycleSplit {
  return {
    retainedOrders: [...orders],
    activeOrders: orders.filter((order) => !isOrderInMerchantRecycleBin(order)),
    recycleOrders: orders.filter((order) => isOrderInMerchantRecycleBin(order)),
  }
}

export function deleteCompletedMerchantOrder(
  storage: OrderStorageLike,
  orderId: string,
  createNow?: () => Date,
): OrderRecord {
  return moveCompletedOrderToMerchantRecycle(storage, orderId, 'manual', createNow)
}

export function purgeExpiredCompletedMerchantOrders(
  orders: OrderRecord[],
  cleanupDays: MerchantOrderAutoCleanupDays,
  now: Date = new Date(),
): OrderRecord[] {
  return moveExpiredCompletedOrdersToMerchantRecycle(orders, cleanupDays, now)
}
