import type { CustomerOrderRecycleMeta, OrderRecord, OrderStatus } from '../../types/order'

export const CUSTOMER_ORDER_RECYCLE_WINDOW_DAYS = 7
const CUSTOMER_ORDER_RECYCLE_WINDOW_MS = CUSTOMER_ORDER_RECYCLE_WINDOW_DAYS * 24 * 60 * 60 * 1000

function parseIsoTimeToMs(rawValue: string): number | null {
  const parsed = Date.parse(rawValue)
  return Number.isFinite(parsed) ? parsed : null
}

function resolveRecycleMeta(order: OrderRecord): CustomerOrderRecycleMeta | null {
  const meta = order.customerRecycleMeta
  if (meta === undefined) {
    return null
  }

  if (typeof meta.deletedAt !== 'string' || meta.deletedAt.length === 0) {
    return null
  }

  if (typeof meta.recoverExpiresAt !== 'string' || meta.recoverExpiresAt.length === 0) {
    return null
  }

  return meta
}

export function canCustomerDeleteOrder(status: OrderStatus): boolean {
  return status === 'cancelled' || status === 'completed'
}

export function isOrderInCustomerRecycleBin(order: OrderRecord): boolean {
  return resolveRecycleMeta(order) !== null
}

export function getCustomerOrderRecycleDeadlineMs(order: OrderRecord): number | null {
  const meta = resolveRecycleMeta(order)
  if (meta === null) {
    return null
  }

  return parseIsoTimeToMs(meta.recoverExpiresAt)
}

export function getCustomerOrderRecycleDeletedAtMs(order: OrderRecord): number | null {
  const meta = resolveRecycleMeta(order)
  if (meta === null) {
    return null
  }

  return parseIsoTimeToMs(meta.deletedAt)
}

export function getCustomerOrderRecycleRemainingMs(order: OrderRecord, nowMs: number = Date.now()): number {
  const deadlineMs = getCustomerOrderRecycleDeadlineMs(order)
  if (deadlineMs === null) {
    return 0
  }

  return deadlineMs - nowMs
}

export function canCustomerRestoreDeletedOrder(order: OrderRecord, nowMs: number = Date.now()): boolean {
  if (!isOrderInCustomerRecycleBin(order)) {
    return false
  }

  return getCustomerOrderRecycleRemainingMs(order, nowMs) > 0
}

export function createCustomerOrderRecycleMeta(nowMs: number = Date.now()): CustomerOrderRecycleMeta {
  return {
    deletedAt: new Date(nowMs).toISOString(),
    recoverExpiresAt: new Date(nowMs + CUSTOMER_ORDER_RECYCLE_WINDOW_MS).toISOString(),
  }
}

export function markOrderAsCustomerDeleted(order: OrderRecord, nowMs: number = Date.now()): OrderRecord {
  return {
    ...order,
    customerRecycleMeta: createCustomerOrderRecycleMeta(nowMs),
    updatedAt: new Date(nowMs).toISOString(),
  }
}

export function clearOrderCustomerRecycleMeta(order: OrderRecord, nowMs: number = Date.now()): OrderRecord {
  const nextOrder: OrderRecord = {
    ...order,
    updatedAt: new Date(nowMs).toISOString(),
  }

  delete nextOrder.customerRecycleMeta
  return nextOrder
}

export function purgeExpiredDeletedCustomerOrders(
  orders: OrderRecord[],
  nowMs: number = Date.now(),
): OrderRecord[] {
  return orders.filter((order) => !isOrderInCustomerRecycleBin(order) || canCustomerRestoreDeletedOrder(order, nowMs))
}

export interface CustomerOrderVisibilitySplit {
  retainedOrders: OrderRecord[]
  activeOrders: OrderRecord[]
  recycleOrders: OrderRecord[]
}

export function splitCustomerOrdersByRecycleState(
  orders: OrderRecord[],
  nowMs: number = Date.now(),
): CustomerOrderVisibilitySplit {
  const retainedOrders = purgeExpiredDeletedCustomerOrders(orders, nowMs)
  return {
    retainedOrders,
    activeOrders: retainedOrders.filter((order) => !isOrderInCustomerRecycleBin(order)),
    recycleOrders: retainedOrders.filter((order) => isOrderInCustomerRecycleBin(order)),
  }
}

