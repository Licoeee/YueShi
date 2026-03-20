import type { CartItemRecord } from '../../types/cart'

export const CUSTOMER_CART_STORAGE_KEY = 'customer-cart-v1'

export interface CartStorageLike {
  getStorageSync(key: string): unknown
  setStorageSync(key: string, value: string): void
}

interface MemoryCartStorage extends CartStorageLike {
  snapshot: Record<string, string>
}

type UnknownRecord = Record<string, unknown>

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null
}

function resolveString(value: unknown): string {
  if (typeof value === 'string') {
    return value
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value)
  }

  return ''
}

function resolveNumber(value: unknown, fallback: number): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }

  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) {
      return parsed
    }
  }

  return fallback
}

function resolvePositiveInteger(value: unknown, fallback: number): number {
  const parsed = resolveNumber(value, fallback)
  if (parsed <= 0) {
    return fallback
  }

  return Math.floor(parsed)
}

function resolveSelection(value: unknown): CartItemRecord['selection'] {
  if (!isRecord(value)) {
    return {
      layerId: '',
      sizePlanId: '',
      creamId: '',
    }
  }

  return {
    layerId: resolveString(value.layerId),
    sizePlanId: resolveString(value.sizePlanId),
    creamId: resolveString(value.creamId),
  }
}

function resolveEntryMode(value: unknown): CartItemRecord['entryMode'] {
  return value === 'buy-now' ? 'buy-now' : 'cart'
}

function resolveItemId(source: UnknownRecord, productId: string, selection: CartItemRecord['selection']): string {
  const explicitId = resolveString(source.id)
  if (explicitId.length > 0) {
    return explicitId
  }

  if (productId.length === 0) {
    return ''
  }

  if (selection.layerId.length > 0 && selection.sizePlanId.length > 0 && selection.creamId.length > 0) {
    return [productId, selection.layerId, selection.sizePlanId, selection.creamId].join(':')
  }

  return productId
}

function normalizeCartItem(rawItem: unknown): CartItemRecord | null {
  if (!isRecord(rawItem)) {
    return null
  }

  const selection = resolveSelection(rawItem.selection)
  const productId = resolveString(rawItem.productId)
  const id = resolveItemId(rawItem, productId, selection)

  if (id.length === 0 || productId.length === 0) {
    return null
  }

  const quantity = resolvePositiveInteger(rawItem.quantity, 1)
  const unitPrice = resolveNumber(rawItem.unitPrice, 0)
  const fallbackTotalPrice = unitPrice * quantity

  return {
    id,
    productId,
    productName: resolveString(rawItem.productName) || productId,
    coverImage: resolveString(rawItem.coverImage),
    specLabel: resolveString(rawItem.specLabel),
    creamLabel: resolveString(rawItem.creamLabel),
    quantity,
    unitPrice,
    totalPrice: resolveNumber(rawItem.totalPrice, fallbackTotalPrice),
    checked: rawItem.checked === true,
    entryMode: resolveEntryMode(rawItem.entryMode),
    selection,
  }
}

function parseCartItems(rawValue: unknown): CartItemRecord[] {
  if (typeof rawValue !== 'string' || rawValue.length === 0) {
    return []
  }

  try {
    const parsed = JSON.parse(rawValue) as unknown
    if (!Array.isArray(parsed)) {
      return []
    }

    return parsed
      .map(normalizeCartItem)
      .filter((item): item is CartItemRecord => item !== null)
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
