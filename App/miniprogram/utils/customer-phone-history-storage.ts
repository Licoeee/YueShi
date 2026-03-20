import type { CustomerPhoneHistory } from '../../types/customer-session'

export const CUSTOMER_PHONE_HISTORY_STORAGE_KEY = 'customer-phone-history-v1'
const PHONE_HISTORY_LIMIT = 6

export interface CustomerPhoneHistoryStorageLike {
  getStorageSync(key: string): unknown
  setStorageSync(key: string, value: string): void
  removeStorageSync?(key: string): void
}

interface MemoryCustomerPhoneHistoryStorage extends CustomerPhoneHistoryStorageLike {
  snapshot: Record<string, string>
}

function isValidPhone(phone: string): boolean {
  return /^1[3-9]\d{9}$/.test(phone)
}

function parsePhoneHistory(rawValue: unknown): CustomerPhoneHistory {
  if (typeof rawValue !== 'string' || rawValue.length === 0) {
    return []
  }

  try {
    const parsed = JSON.parse(rawValue) as unknown
    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === 'string' && isValidPhone(item))
      : []
  } catch {
    return []
  }
}

function normalizePhone(phone: string): string {
  return phone.trim()
}

export function createMemoryCustomerPhoneHistoryStorage(): MemoryCustomerPhoneHistoryStorage {
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

export function loadPhoneHistorySnapshot(storage: CustomerPhoneHistoryStorageLike): CustomerPhoneHistory {
  return parsePhoneHistory(storage.getStorageSync(CUSTOMER_PHONE_HISTORY_STORAGE_KEY))
}

function savePhoneHistorySnapshot(storage: CustomerPhoneHistoryStorageLike, phones: CustomerPhoneHistory): void {
  storage.setStorageSync(CUSTOMER_PHONE_HISTORY_STORAGE_KEY, JSON.stringify(phones))
}

export function savePhoneToHistory(storage: CustomerPhoneHistoryStorageLike, phone: string): CustomerPhoneHistory {
  const normalizedPhone = normalizePhone(phone)
  if (!isValidPhone(normalizedPhone)) {
    return loadPhoneHistorySnapshot(storage)
  }

  const nextPhones = [
    normalizedPhone,
    ...loadPhoneHistorySnapshot(storage).filter((item) => item !== normalizedPhone),
  ].slice(0, PHONE_HISTORY_LIMIT)
  savePhoneHistorySnapshot(storage, nextPhones)
  return nextPhones
}

export function removePhoneFromHistory(storage: CustomerPhoneHistoryStorageLike, phone: string): CustomerPhoneHistory {
  const normalizedPhone = normalizePhone(phone)
  const nextPhones = loadPhoneHistorySnapshot(storage).filter((item) => item !== normalizedPhone)
  savePhoneHistorySnapshot(storage, nextPhones)
  return nextPhones
}

export function clearPhoneHistorySnapshot(storage: CustomerPhoneHistoryStorageLike): void {
  if (typeof storage.removeStorageSync === 'function') {
    storage.removeStorageSync(CUSTOMER_PHONE_HISTORY_STORAGE_KEY)
    return
  }

  storage.setStorageSync(CUSTOMER_PHONE_HISTORY_STORAGE_KEY, '')
}

function resolveDefaultStorage(): CustomerPhoneHistoryStorageLike {
  const maybeStorage = (globalThis as { wx?: CustomerPhoneHistoryStorageLike }).wx
  if (maybeStorage === undefined) {
    throw new Error('Mini program storage is unavailable in the current runtime')
  }

  return maybeStorage
}

export function loadStoredPhoneHistory(
  storage: CustomerPhoneHistoryStorageLike = resolveDefaultStorage(),
): CustomerPhoneHistory {
  return loadPhoneHistorySnapshot(storage)
}

export function clearStoredPhoneHistory(
  storage: CustomerPhoneHistoryStorageLike = resolveDefaultStorage(),
): void {
  clearPhoneHistorySnapshot(storage)
}
