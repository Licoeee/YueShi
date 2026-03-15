import type { CustomerLocalSession } from '../../types/customer-session'
import {
  createGuestCustomerSession,
  normalizeCustomerSession,
} from './customer-session'

export const CUSTOMER_SESSION_STORAGE_KEY = 'customer-session-v1'

export interface CustomerSessionStorageLike {
  getStorageSync(key: string): unknown
  setStorageSync(key: string, value: string): void
  removeStorageSync?(key: string): void
}

interface MemoryCustomerSessionStorage extends CustomerSessionStorageLike {
  snapshot: Record<string, string>
}

function parseCustomerSession(rawValue: unknown): CustomerLocalSession {
  if (typeof rawValue !== 'string' || rawValue.length === 0) {
    return createGuestCustomerSession()
  }

  try {
    const parsed = JSON.parse(rawValue) as unknown
    return normalizeCustomerSession(parsed)
  } catch {
    return createGuestCustomerSession()
  }
}

export function createMemoryCustomerSessionStorage(): MemoryCustomerSessionStorage {
  const snapshot: Record<string, string> = {}

  return {
    snapshot,
    getStorageSync(key: string): unknown {
      return snapshot[key]
    },
    setStorageSync(key: string, value: string): void {
      snapshot[key] = value
    },
    removeStorageSync(key: string): void {
      delete snapshot[key]
    },
  }
}

export function loadCustomerSessionSnapshot(storage: CustomerSessionStorageLike): CustomerLocalSession {
  return parseCustomerSession(storage.getStorageSync(CUSTOMER_SESSION_STORAGE_KEY))
}

export function saveCustomerSessionSnapshot(
  storage: CustomerSessionStorageLike,
  session: CustomerLocalSession,
): void {
  storage.setStorageSync(CUSTOMER_SESSION_STORAGE_KEY, JSON.stringify(session))
}

export function clearCustomerSessionSnapshot(storage: CustomerSessionStorageLike): void {
  if (typeof storage.removeStorageSync === 'function') {
    storage.removeStorageSync(CUSTOMER_SESSION_STORAGE_KEY)
    return
  }

  storage.setStorageSync(CUSTOMER_SESSION_STORAGE_KEY, '')
}

function resolveDefaultStorage(): CustomerSessionStorageLike {
  const maybeStorage = (globalThis as { wx?: CustomerSessionStorageLike }).wx
  if (maybeStorage === undefined) {
    throw new Error('Mini program storage is unavailable in the current runtime')
  }

  return maybeStorage
}

export function loadStoredCustomerSession(
  storage: CustomerSessionStorageLike = resolveDefaultStorage(),
): CustomerLocalSession {
  return loadCustomerSessionSnapshot(storage)
}

export function saveStoredCustomerSession(
  session: CustomerLocalSession,
  storage: CustomerSessionStorageLike = resolveDefaultStorage(),
): void {
  saveCustomerSessionSnapshot(storage, session)
}

export function clearStoredCustomerSession(
  storage: CustomerSessionStorageLike = resolveDefaultStorage(),
): void {
  clearCustomerSessionSnapshot(storage)
}
