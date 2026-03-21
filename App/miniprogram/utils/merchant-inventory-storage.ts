import type {
  MerchantExpirySubscriptionPreference,
  MerchantInventoryDraftInput,
  MerchantInventoryRecord,
} from '../../types/merchant-inventory'

export const MERCHANT_INVENTORY_STORAGE_KEY = 'merchant-inventory-v1'
export const MERCHANT_EXPIRY_SUBSCRIBE_PREF_KEY = 'merchant-expiry-subscribe-pref-v1'

export interface MerchantInventoryStorageLike {
  getStorageSync(key: string): unknown
  setStorageSync(key: string, value: string): void
}

interface MemoryMerchantInventoryStorage extends MerchantInventoryStorageLike {
  snapshot: Record<string, string>
}

interface InventoryExpiryState {
  daysLeft: number
  isNearExpiry: boolean
  isExpired: boolean
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function normalizeCostPrice(rawValue: unknown): number {
  if (typeof rawValue !== 'number' || !Number.isFinite(rawValue) || rawValue <= 0) {
    return 0
  }

  return Math.round(rawValue)
}

function normalizeShelfLifeDays(rawValue: unknown): number {
  if (typeof rawValue !== 'number' || !Number.isInteger(rawValue) || rawValue <= 0) {
    return 1
  }

  return rawValue
}

function normalizeDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function parseDateKey(dateText: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateText)) {
    return null
  }

  const [yearText, monthText, dayText] = dateText.split('-')
  const year = Number(yearText)
  const month = Number(monthText)
  const day = Number(dayText)
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) {
    return null
  }

  const date = new Date(year, month - 1, day)
  if (Number.isNaN(date.getTime())) {
    return null
  }

  if (date.getFullYear() !== year || date.getMonth() + 1 !== month || date.getDate() !== day) {
    return null
  }

  return date
}

function computeExpiryDate(productionDate: string, shelfLifeDays: number): string {
  const startDate = parseDateKey(productionDate)
  if (startDate === null) {
    return ''
  }

  const expiry = new Date(startDate)
  expiry.setDate(expiry.getDate() + shelfLifeDays)

  return normalizeDateKey(expiry)
}

function parseInventoryRecord(rawValue: unknown): MerchantInventoryRecord | null {
  if (!isRecord(rawValue)) {
    return null
  }

  const id = rawValue.id
  const itemName = rawValue.itemName
  const photoUrl = rawValue.photoUrl
  const costPrice = rawValue.costPrice
  const productionDate = rawValue.productionDate
  const shelfLifeDays = rawValue.shelfLifeDays
  const expiryDate = rawValue.expiryDate
  const lastReminderDate = rawValue.lastReminderDate
  const createdAt = rawValue.createdAt
  const updatedAt = rawValue.updatedAt

  if (
    typeof id !== 'string' ||
    typeof itemName !== 'string' ||
    typeof photoUrl !== 'string' ||
    typeof costPrice !== 'number' ||
    typeof productionDate !== 'string' ||
    typeof shelfLifeDays !== 'number' ||
    typeof expiryDate !== 'string' ||
    typeof createdAt !== 'string' ||
    typeof updatedAt !== 'string'
  ) {
    return null
  }

  return {
    id,
    itemName,
    photoUrl,
    costPrice: normalizeCostPrice(costPrice),
    productionDate,
    shelfLifeDays: normalizeShelfLifeDays(shelfLifeDays),
    expiryDate,
    lastReminderDate: typeof lastReminderDate === 'string' ? lastReminderDate : '',
    createdAt,
    updatedAt,
  }
}

function parseSnapshot(rawValue: unknown): MerchantInventoryRecord[] {
  if (typeof rawValue !== 'string' || rawValue.length === 0) {
    return []
  }

  try {
    const parsed = JSON.parse(rawValue) as unknown
    if (!Array.isArray(parsed)) {
      return []
    }

    return parsed
      .map((item) => parseInventoryRecord(item))
      .filter((item): item is MerchantInventoryRecord => item !== null)
  } catch {
    return []
  }
}

function resolveDefaultStorage(): MerchantInventoryStorageLike {
  const maybeStorage = (globalThis as { wx?: MerchantInventoryStorageLike }).wx
  if (maybeStorage === undefined) {
    throw new Error('Mini program storage is unavailable in the current runtime')
  }

  return maybeStorage
}

function resolveNow(createNow?: () => Date): Date {
  return typeof createNow === 'function' ? createNow() : new Date()
}

function normalizePreference(rawValue: unknown): MerchantExpirySubscriptionPreference {
  if (rawValue === 'accepted' || rawValue === 'rejected' || rawValue === 'unknown') {
    return rawValue
  }

  return 'unknown'
}

export function createMemoryMerchantInventoryStorage(): MemoryMerchantInventoryStorage {
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

export function loadMerchantInventorySnapshot(storage: MerchantInventoryStorageLike): MerchantInventoryRecord[] {
  return parseSnapshot(storage.getStorageSync(MERCHANT_INVENTORY_STORAGE_KEY))
}

export function saveMerchantInventorySnapshot(
  storage: MerchantInventoryStorageLike,
  records: MerchantInventoryRecord[],
): void {
  storage.setStorageSync(MERCHANT_INVENTORY_STORAGE_KEY, JSON.stringify(records))
}

export function loadStoredMerchantInventoryRecords(
  storage: MerchantInventoryStorageLike = resolveDefaultStorage(),
): MerchantInventoryRecord[] {
  return loadMerchantInventorySnapshot(storage)
}

export function createMerchantInventoryRecord(
  storage: MerchantInventoryStorageLike,
  input: MerchantInventoryDraftInput,
  createNow?: () => Date,
): MerchantInventoryRecord {
  const now = resolveNow(createNow)
  const nowText = now.toISOString()
  const shelfLifeDays = normalizeShelfLifeDays(input.shelfLifeDays)

  const nextRecord: MerchantInventoryRecord = {
    id: `inventory-${now.getTime()}`,
    itemName: input.itemName.trim(),
    photoUrl: input.photoUrl.trim(),
    costPrice: normalizeCostPrice(input.costPrice),
    productionDate: input.productionDate,
    shelfLifeDays,
    expiryDate: computeExpiryDate(input.productionDate, shelfLifeDays),
    lastReminderDate: '',
    createdAt: nowText,
    updatedAt: nowText,
  }

  const records = loadStoredMerchantInventoryRecords(storage)
  saveMerchantInventorySnapshot(storage, [nextRecord, ...records])

  return nextRecord
}

export function deleteMerchantInventoryRecord(storage: MerchantInventoryStorageLike, recordId: string): void {
  const records = loadStoredMerchantInventoryRecords(storage)
  saveMerchantInventorySnapshot(
    storage,
    records.filter((record) => record.id !== recordId),
  )
}

export function resolveInventoryExpiryState(expiryDate: string, now: Date = new Date()): InventoryExpiryState {
  const targetDate = parseDateKey(expiryDate)
  if (targetDate === null) {
    return {
      daysLeft: -1,
      isNearExpiry: false,
      isExpired: true,
    }
  }

  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const diffMs = targetDate.getTime() - today.getTime()
  const daysLeft = Math.ceil(diffMs / (24 * 60 * 60 * 1000))

  return {
    daysLeft,
    isNearExpiry: daysLeft >= 0 && daysLeft <= 10,
    isExpired: daysLeft < 0,
  }
}

export function collectDueInventoryExpiryReminders(
  records: MerchantInventoryRecord[],
  now: Date = new Date(),
): MerchantInventoryRecord[] {
  const todayKey = normalizeDateKey(now)

  return records.filter((record) => {
    if (record.lastReminderDate === todayKey) {
      return false
    }

    const expiryState = resolveInventoryExpiryState(record.expiryDate, now)

    return expiryState.isNearExpiry && !expiryState.isExpired
  })
}

export function markMerchantInventoryReminderNotified(
  storage: MerchantInventoryStorageLike,
  recordIds: string[],
  createNow?: () => Date,
): MerchantInventoryRecord[] {
  const now = resolveNow(createNow)
  const nowText = now.toISOString()
  const todayKey = normalizeDateKey(now)
  const targetIds = new Set(recordIds)
  const records = loadStoredMerchantInventoryRecords(storage)

  const nextRecords = records.map((record) =>
    targetIds.has(record.id)
      ? {
          ...record,
          lastReminderDate: todayKey,
          updatedAt: nowText,
        }
      : record,
  )

  saveMerchantInventorySnapshot(storage, nextRecords)

  return nextRecords
}

export function loadMerchantExpirySubscriptionPreference(
  storage: MerchantInventoryStorageLike = resolveDefaultStorage(),
): MerchantExpirySubscriptionPreference {
  return normalizePreference(storage.getStorageSync(MERCHANT_EXPIRY_SUBSCRIBE_PREF_KEY))
}

export function saveMerchantExpirySubscriptionPreference(
  storage: MerchantInventoryStorageLike,
  preference: MerchantExpirySubscriptionPreference,
): MerchantExpirySubscriptionPreference {
  storage.setStorageSync(MERCHANT_EXPIRY_SUBSCRIBE_PREF_KEY, preference)

  return preference
}

export function resolveInventoryExpiryDate(productionDate: string, shelfLifeDays: number): string {
  return computeExpiryDate(productionDate, shelfLifeDays)
}
