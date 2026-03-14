import type { OrderRecord } from '../../types/order'

export const CUSTOMER_ORDER_STORAGE_KEY = 'customer-orders-v1'

export interface OrderStorageLike {
  getStorageSync(key: string): unknown
  setStorageSync(key: string, value: string): void
}

interface MemoryOrderStorage extends OrderStorageLike {
  snapshot: Record<string, string>
}

function parseOrderSnapshot(rawValue: unknown): OrderRecord[] {
  if (typeof rawValue !== 'string' || rawValue.length === 0) {
    return []
  }

  try {
    const parsed = JSON.parse(rawValue) as unknown
    return Array.isArray(parsed) ? (parsed as OrderRecord[]) : []
  } catch {
    return []
  }
}

export function createMemoryOrderStorage(): MemoryOrderStorage {
  const snapshot: Record<string, string> = {}

  return {
    snapshot,
    getStorageSync(key: string): unknown {
      return snapshot[key]
    },
    setStorageSync(key: string, value: string): void {
      snapshot[key] = value
    },
  }
}

export function loadOrderSnapshot(storage: OrderStorageLike): OrderRecord[] {
  return parseOrderSnapshot(storage.getStorageSync(CUSTOMER_ORDER_STORAGE_KEY))
}

export function saveOrderSnapshot(storage: OrderStorageLike, items: OrderRecord[]): void {
  storage.setStorageSync(CUSTOMER_ORDER_STORAGE_KEY, JSON.stringify(items))
}

function resolveDefaultStorage(): OrderStorageLike {
  const maybeStorage = (globalThis as { wx?: OrderStorageLike }).wx
  if (maybeStorage === undefined) {
    throw new Error('Mini program storage is unavailable in the current runtime')
  }

  return maybeStorage
}

export function loadStoredCustomerOrders(storage: OrderStorageLike = resolveDefaultStorage()): OrderRecord[] {
  return loadOrderSnapshot(storage)
}

export function saveStoredCustomerOrders(
  items: OrderRecord[],
  storage: OrderStorageLike = resolveDefaultStorage(),
): void {
  saveOrderSnapshot(storage, items)
}
