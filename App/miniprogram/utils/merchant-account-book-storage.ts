import type {
  MerchantAccountBookDraftInput,
  MerchantAccountBookRecord,
} from '../../types/merchant-account-book'

export const MERCHANT_ACCOUNT_BOOK_STORAGE_KEY = 'merchant-account-book-v1'

export interface MerchantAccountBookStorageLike {
  getStorageSync(key: string): unknown
  setStorageSync(key: string, value: string): void
}

interface MemoryMerchantAccountBookStorage extends MerchantAccountBookStorageLike {
  snapshot: Record<string, string>
}

interface ExpiryState {
  daysLeft: number
  isNearExpiry: boolean
  isExpired: boolean
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function parseCostPrice(rawValue: unknown): number {
  if (typeof rawValue !== 'number' || !Number.isFinite(rawValue) || rawValue <= 0) {
    return 0
  }

  return Math.round(rawValue)
}

function parseRecord(rawValue: unknown): MerchantAccountBookRecord | null {
  if (!isRecord(rawValue)) {
    return null
  }

  const id = rawValue.id
  const itemName = rawValue.itemName
  const photoUrl = rawValue.photoUrl
  const costPrice = rawValue.costPrice
  const expiryDate = rawValue.expiryDate
  const createdAt = rawValue.createdAt
  const updatedAt = rawValue.updatedAt
  const reminderSubscribed = rawValue.reminderSubscribed
  const lastReminderDate = rawValue.lastReminderDate

  if (
    typeof id !== 'string' ||
    typeof itemName !== 'string' ||
    typeof photoUrl !== 'string' ||
    typeof costPrice !== 'number' ||
    typeof expiryDate !== 'string' ||
    typeof createdAt !== 'string' ||
    typeof updatedAt !== 'string' ||
    typeof reminderSubscribed !== 'boolean' ||
    typeof lastReminderDate !== 'string'
  ) {
    return null
  }

  return {
    id,
    itemName,
    photoUrl,
    costPrice: parseCostPrice(costPrice),
    expiryDate,
    reminderSubscribed,
    lastReminderDate,
    createdAt,
    updatedAt,
  }
}

function parseSnapshot(rawValue: unknown): MerchantAccountBookRecord[] {
  if (typeof rawValue !== 'string' || rawValue.length === 0) {
    return []
  }

  try {
    const parsed = JSON.parse(rawValue) as unknown
    if (!Array.isArray(parsed)) {
      return []
    }

    return parsed.map((item) => parseRecord(item)).filter((item): item is MerchantAccountBookRecord => item !== null)
  } catch {
    return []
  }
}

function formatDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function resolveDefaultStorage(): MerchantAccountBookStorageLike {
  const maybeStorage = (globalThis as { wx?: MerchantAccountBookStorageLike }).wx
  if (maybeStorage === undefined) {
    throw new Error('Mini program storage is unavailable in the current runtime')
  }

  return maybeStorage
}

function resolveNow(createNow?: () => Date): Date {
  return typeof createNow === 'function' ? createNow() : new Date()
}

function requireRecord(
  records: MerchantAccountBookRecord[],
  recordId: string,
): { record: MerchantAccountBookRecord; index: number } {
  const index = records.findIndex((record) => record.id === recordId)
  if (index < 0) {
    throw new Error(`Account book record "${recordId}" does not exist`)
  }

  return {
    record: records[index],
    index,
  }
}

function replaceRecordAt(
  records: MerchantAccountBookRecord[],
  index: number,
  nextRecord: MerchantAccountBookRecord,
): MerchantAccountBookRecord[] {
  return records.map((record, recordIndex) => (recordIndex === index ? nextRecord : record))
}

export function createMemoryMerchantAccountBookStorage(): MemoryMerchantAccountBookStorage {
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

export function loadMerchantAccountBookSnapshot(storage: MerchantAccountBookStorageLike): MerchantAccountBookRecord[] {
  return parseSnapshot(storage.getStorageSync(MERCHANT_ACCOUNT_BOOK_STORAGE_KEY))
}

export function saveMerchantAccountBookSnapshot(
  storage: MerchantAccountBookStorageLike,
  records: MerchantAccountBookRecord[],
): void {
  storage.setStorageSync(MERCHANT_ACCOUNT_BOOK_STORAGE_KEY, JSON.stringify(records))
}

export function loadStoredMerchantAccountBookRecords(
  storage: MerchantAccountBookStorageLike = resolveDefaultStorage(),
): MerchantAccountBookRecord[] {
  return loadMerchantAccountBookSnapshot(storage)
}

export function createMerchantAccountBookRecord(
  storage: MerchantAccountBookStorageLike,
  input: MerchantAccountBookDraftInput,
  createNow?: () => Date,
): MerchantAccountBookRecord {
  const now = resolveNow(createNow)
  const nowText = now.toISOString()
  const nextRecord: MerchantAccountBookRecord = {
    id: `merchant-account-${now.getTime()}`,
    itemName: input.itemName.trim(),
    photoUrl: input.photoUrl.trim(),
    costPrice: parseCostPrice(input.costPrice),
    expiryDate: input.expiryDate.trim(),
    reminderSubscribed: false,
    lastReminderDate: '',
    createdAt: nowText,
    updatedAt: nowText,
  }

  const records = loadStoredMerchantAccountBookRecords(storage)
  saveMerchantAccountBookSnapshot(storage, [nextRecord, ...records])

  return nextRecord
}

export function updateMerchantAccountBookRecord(
  storage: MerchantAccountBookStorageLike,
  recordId: string,
  patch: Partial<MerchantAccountBookDraftInput>,
  createNow?: () => Date,
): MerchantAccountBookRecord {
  const now = resolveNow(createNow)
  const records = loadStoredMerchantAccountBookRecords(storage)
  const { record, index } = requireRecord(records, recordId)
  const nextRecord: MerchantAccountBookRecord = {
    ...record,
    itemName: typeof patch.itemName === 'string' ? patch.itemName.trim() : record.itemName,
    photoUrl: typeof patch.photoUrl === 'string' ? patch.photoUrl.trim() : record.photoUrl,
    costPrice: typeof patch.costPrice === 'number' ? parseCostPrice(patch.costPrice) : record.costPrice,
    expiryDate: typeof patch.expiryDate === 'string' ? patch.expiryDate.trim() : record.expiryDate,
    updatedAt: now.toISOString(),
  }

  saveMerchantAccountBookSnapshot(storage, replaceRecordAt(records, index, nextRecord))
  return nextRecord
}

export function deleteMerchantAccountBookRecord(storage: MerchantAccountBookStorageLike, recordId: string): void {
  const records = loadStoredMerchantAccountBookRecords(storage)
  saveMerchantAccountBookSnapshot(
    storage,
    records.filter((record) => record.id !== recordId),
  )
}

export function resolveAccountBookExpiryState(expiryDate: string, now: Date = new Date()): ExpiryState {
  const targetDate = new Date(`${expiryDate}T00:00:00`)
  if (Number.isNaN(targetDate.getTime())) {
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

export function collectDueExpiryReminders(
  records: MerchantAccountBookRecord[],
  now: Date = new Date(),
): MerchantAccountBookRecord[] {
  const todayKey = formatDateKey(now)

  return records.filter((record) => {
    if (!record.reminderSubscribed || record.lastReminderDate === todayKey) {
      return false
    }

    const expiryState = resolveAccountBookExpiryState(record.expiryDate, now)
    return expiryState.isNearExpiry && !expiryState.isExpired
  })
}

export function markMerchantAccountBookReminderSubscribed(
  storage: MerchantAccountBookStorageLike,
  recordIds: string[],
  createNow?: () => Date,
): MerchantAccountBookRecord[] {
  const now = resolveNow(createNow)
  const nowText = now.toISOString()
  const targetIds = new Set(recordIds)
  const records = loadStoredMerchantAccountBookRecords(storage)
  const nextRecords = records.map((record) =>
    targetIds.has(record.id)
      ? {
          ...record,
          reminderSubscribed: true,
          updatedAt: nowText,
        }
      : record,
  )

  saveMerchantAccountBookSnapshot(storage, nextRecords)
  return nextRecords
}

export function markMerchantAccountBookReminderNotified(
  storage: MerchantAccountBookStorageLike,
  recordIds: string[],
  createNow?: () => Date,
): MerchantAccountBookRecord[] {
  const now = resolveNow(createNow)
  const nowText = now.toISOString()
  const todayKey = formatDateKey(now)
  const targetIds = new Set(recordIds)
  const records = loadStoredMerchantAccountBookRecords(storage)
  const nextRecords = records.map((record) =>
    targetIds.has(record.id)
      ? {
          ...record,
          lastReminderDate: todayKey,
          updatedAt: nowText,
        }
      : record,
  )

  saveMerchantAccountBookSnapshot(storage, nextRecords)
  return nextRecords
}

