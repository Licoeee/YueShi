import type { MerchantBlacklistEntry } from '../../types/merchant-blacklist'

export const MERCHANT_BLACKLIST_STORAGE_KEY = 'merchant-blacklist-v1'

export interface MerchantBlacklistStorageLike {
  getStorageSync(key: string): unknown
  setStorageSync(key: string, value: string): void
}

interface MemoryMerchantBlacklistStorage extends MerchantBlacklistStorageLike {
  snapshot: Record<string, string>
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function parseEntry(rawValue: unknown): MerchantBlacklistEntry | null {
  if (!isRecord(rawValue)) {
    return null
  }

  const openId = rawValue.openId
  const createdAt = rawValue.createdAt
  if (typeof openId !== 'string' || typeof createdAt !== 'string') {
    return null
  }

  return {
    openId,
    createdAt,
  }
}

function parseSnapshot(rawValue: unknown): MerchantBlacklistEntry[] {
  if (typeof rawValue !== 'string' || rawValue.length === 0) {
    return []
  }

  try {
    const parsed = JSON.parse(rawValue) as unknown
    if (!Array.isArray(parsed)) {
      return []
    }

    return parsed.map((item) => parseEntry(item)).filter((item): item is MerchantBlacklistEntry => item !== null)
  } catch {
    return []
  }
}

function normalizeOpenId(openId: string): string {
  return openId.trim()
}

function resolveNow(createNow?: () => Date): Date {
  return typeof createNow === 'function' ? createNow() : new Date()
}

function tryResolveDefaultStorage(): MerchantBlacklistStorageLike | null {
  const maybeStorage = (globalThis as { wx?: MerchantBlacklistStorageLike }).wx
  return maybeStorage ?? null
}

export function createMemoryMerchantBlacklistStorage(): MemoryMerchantBlacklistStorage {
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

export function loadMerchantBlacklistSnapshot(
  storage: MerchantBlacklistStorageLike = tryResolveDefaultStorage() ?? createMemoryMerchantBlacklistStorage(),
): MerchantBlacklistEntry[] {
  return parseSnapshot(storage.getStorageSync(MERCHANT_BLACKLIST_STORAGE_KEY))
}

export function saveMerchantBlacklistSnapshot(
  storage: MerchantBlacklistStorageLike,
  entries: MerchantBlacklistEntry[],
): void {
  storage.setStorageSync(MERCHANT_BLACKLIST_STORAGE_KEY, JSON.stringify(entries))
}

export function addOpenIdToMerchantBlacklist(
  storage: MerchantBlacklistStorageLike,
  openId: string,
  createNow?: () => Date,
): MerchantBlacklistEntry[] {
  const normalizedOpenId = normalizeOpenId(openId)
  if (normalizedOpenId.length === 0) {
    return loadMerchantBlacklistSnapshot(storage)
  }

  const entries = loadMerchantBlacklistSnapshot(storage)
  if (entries.some((entry) => entry.openId === normalizedOpenId)) {
    return entries
  }

  const nextEntries = [
    ...entries,
    {
      openId: normalizedOpenId,
      createdAt: resolveNow(createNow).toISOString(),
    },
  ]
  saveMerchantBlacklistSnapshot(storage, nextEntries)

  return nextEntries
}

export function removeOpenIdFromMerchantBlacklist(
  storage: MerchantBlacklistStorageLike,
  openId: string,
): MerchantBlacklistEntry[] {
  const normalizedOpenId = normalizeOpenId(openId)
  const nextEntries = loadMerchantBlacklistSnapshot(storage).filter((entry) => entry.openId !== normalizedOpenId)
  saveMerchantBlacklistSnapshot(storage, nextEntries)

  return nextEntries
}

export function isCustomerOpenIdBlacklisted(
  openId: string,
  storage?: MerchantBlacklistStorageLike,
): boolean {
  const normalizedOpenId = normalizeOpenId(openId)
  if (normalizedOpenId.length === 0) {
    return false
  }

  const fallbackStorage = tryResolveDefaultStorage()
  if (storage === undefined && fallbackStorage === null) {
    return false
  }

  const entries = loadMerchantBlacklistSnapshot(storage ?? fallbackStorage ?? createMemoryMerchantBlacklistStorage())
  return entries.some((entry) => entry.openId === normalizedOpenId)
}

