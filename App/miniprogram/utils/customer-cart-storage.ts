import type { CartItemRecord } from '../../types/cart'

export const CUSTOMER_CART_STORAGE_KEY = 'customer-cart-v1'

export interface CartStorageLike {
  getStorageSync(key: string): unknown
  setStorageSync(key: string, value: string): void
}

interface MemoryCartStorage extends CartStorageLike {
  snapshot: Record<string, string>
}

function parseCartItems(rawValue: unknown): CartItemRecord[] {
  if (typeof rawValue !== 'string' || rawValue.length === 0) {
    return []
  }

  try {
    const parsed = JSON.parse(rawValue) as unknown
    return Array.isArray(parsed) ? (parsed as CartItemRecord[]) : []
  } catch {
    return []
  }
}

export function createMemoryCartStorage(): MemoryCartStorage {
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

export function loadCartSnapshot(storage: CartStorageLike): CartItemRecord[] {
  return parseCartItems(storage.getStorageSync(CUSTOMER_CART_STORAGE_KEY))
}

export function saveCartSnapshot(storage: CartStorageLike, items: CartItemRecord[]): void {
  storage.setStorageSync(CUSTOMER_CART_STORAGE_KEY, JSON.stringify(items))
}

function resolveDefaultStorage(): CartStorageLike {
  const maybeStorage = (globalThis as { wx?: CartStorageLike }).wx
  if (maybeStorage === undefined) {
    throw new Error('Mini program storage is unavailable in the current runtime')
  }

  return maybeStorage
}

export function loadStoredCustomerCart(storage: CartStorageLike = resolveDefaultStorage()): CartItemRecord[] {
  return loadCartSnapshot(storage)
}

export function saveStoredCustomerCart(items: CartItemRecord[], storage: CartStorageLike = resolveDefaultStorage()): void {
  saveCartSnapshot(storage, items)
}
