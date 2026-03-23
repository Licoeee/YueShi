import type {
  MerchantDefaultPriceConfigItem,
  MerchantDefaultPricingCustomInput,
  MerchantDefaultPricingSnapshot,
  MerchantPriceTier,
} from '../../types/merchant-default-pricing'
import type { MerchantCreamType, MerchantProductLayer } from '../../types/merchant-product'
import type { ProductSpecSize } from '../../types/product'

export const MERCHANT_DEFAULT_PRICING_STORAGE_KEY = 'merchant-default-pricing-v1'

const VALID_SPEC_SIZES: ProductSpecSize[] = ['6-inch', '8-inch', '10-inch', '12-inch', '14-inch', '16-inch']
const VALID_PRICE_TIERS: MerchantPriceTier[] = ['single', 'double', 'triple']

const TIER_SIZE_COUNTS: Record<MerchantPriceTier, number> = {
  single: 1,
  double: 2,
  triple: 3,
}

const SIZE_LABEL_MAP: Record<ProductSpecSize, string> = {
  '6-inch': '6寸',
  '8-inch': '8寸',
  '10-inch': '10寸',
  '12-inch': '12寸',
  '14-inch': '14寸',
  '16-inch': '16寸',
}

const CREAM_LABEL_MAP: Record<MerchantCreamType, string> = {
  'animal-cream-i': '动物奶油i',
  'dairy-cream': '乳脂奶油',
  'naked-cake': '裸蛋糕',
}

export interface MerchantDefaultPricingStorageLike {
  getStorageSync(key: string): unknown
  setStorageSync(key: string, value: unknown): void
}

interface MemoryMerchantDefaultPricingStorage extends MerchantDefaultPricingStorageLike {
  snapshot: Record<string, unknown>
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function normalizePrice(price: number): number {
  if (!Number.isFinite(price) || price < 0) {
    return 0
  }

  return Math.round(price)
}

function normalizeTier(rawValue: unknown): MerchantPriceTier {
  if (rawValue === 'double' || rawValue === 'triple') {
    return rawValue
  }

  return 'single'
}

function normalizeCreamType(rawValue: unknown): MerchantCreamType {
  if (rawValue === 'animal-cream-i' || rawValue === 'naked-cake') {
    return rawValue
  }

  return 'dairy-cream'
}

function normalizeSizes(rawValue: unknown, tier: MerchantPriceTier): ProductSpecSize[] {
  const validSizes = Array.isArray(rawValue)
    ? rawValue.filter((item): item is ProductSpecSize => VALID_SPEC_SIZES.includes(item as ProductSpecSize))
    : []
  const dedupedSizes = Array.from(new Set(validSizes))
  const expectedSizeCount = TIER_SIZE_COUNTS[tier]

  if (dedupedSizes.length === expectedSizeCount) {
    return dedupedSizes
  }

  return buildFallbackSizes(tier)
}

function buildFallbackSizes(tier: MerchantPriceTier): ProductSpecSize[] {
  if (tier === 'triple') {
    return ['12-inch', '10-inch', '6-inch']
  }

  if (tier === 'double') {
    return ['10-inch', '6-inch']
  }

  return ['6-inch']
}

function buildMerchantDefaultPricingItemId(tier: MerchantPriceTier, sizes: ProductSpecSize[], creamType: MerchantCreamType): string {
  return [tier, ...sizes, creamType].join('-')
}

function buildMerchantDefaultPricingLabel(sizes: ProductSpecSize[], creamType: MerchantCreamType): string {
  return `${sizes.map((size) => SIZE_LABEL_MAP[size]).join('+')}${CREAM_LABEL_MAP[creamType]}`
}

function createPricingItem(
  tier: MerchantPriceTier,
  sizes: ProductSpecSize[],
  creamType: MerchantCreamType,
  builtIn: boolean,
  basePrice: number = 0,
): MerchantDefaultPriceConfigItem {
  const normalizedSizes = normalizeSizes(sizes, tier)

  return {
    id: buildMerchantDefaultPricingItemId(tier, normalizedSizes, creamType),
    tier,
    sizes: normalizedSizes,
    creamType,
    label: buildMerchantDefaultPricingLabel(normalizedSizes, creamType),
    basePrice: normalizePrice(basePrice),
    builtIn,
  }
}

export function createSeedMerchantDefaultPricingSnapshot(): MerchantDefaultPricingSnapshot {
  const singleSizes: ProductSpecSize[] = ['6-inch', '8-inch', '10-inch', '12-inch', '14-inch', '16-inch']
  const seedSingles = singleSizes.flatMap((size) => [
    createPricingItem('single', [size], 'dairy-cream', true),
    createPricingItem('single', [size], 'animal-cream-i', true),
  ])
  const seedDoubles = [
    createPricingItem('double', ['10-inch', '6-inch'], 'dairy-cream', true),
    createPricingItem('double', ['10-inch', '6-inch'], 'animal-cream-i', true),
    createPricingItem('double', ['12-inch', '8-inch'], 'dairy-cream', true),
    createPricingItem('double', ['12-inch', '8-inch'], 'animal-cream-i', true),
    createPricingItem('double', ['14-inch', '10-inch'], 'dairy-cream', true),
    createPricingItem('double', ['10-inch', '10-inch'], 'animal-cream-i', true),
  ]
  const seedTriples = [
    createPricingItem('triple', ['12-inch', '10-inch', '6-inch'], 'dairy-cream', true),
    createPricingItem('triple', ['12-inch', '10-inch', '6-inch'], 'animal-cream-i', true),
    createPricingItem('triple', ['14-inch', '12-inch', '8-inch'], 'dairy-cream', true),
    createPricingItem('triple', ['14-inch', '12-inch', '8-inch'], 'animal-cream-i', true),
    createPricingItem('triple', ['16-inch', '12-inch', '8-inch'], 'dairy-cream', true),
    createPricingItem('triple', ['16-inch', '12-inch', '8-inch'], 'animal-cream-i', true),
  ]

  return {
    single: seedSingles,
    double: seedDoubles,
    triple: seedTriples,
  }
}

export function cloneMerchantDefaultPricingSnapshot(
  snapshot: MerchantDefaultPricingSnapshot,
): MerchantDefaultPricingSnapshot {
  return {
    single: snapshot.single.map((item) => ({ ...item, sizes: [...item.sizes] })),
    double: snapshot.double.map((item) => ({ ...item, sizes: [...item.sizes] })),
    triple: snapshot.triple.map((item) => ({ ...item, sizes: [...item.sizes] })),
  }
}

function parsePricingItem(rawValue: unknown): MerchantDefaultPriceConfigItem | null {
  if (!isRecord(rawValue)) {
    return null
  }

  const tier = normalizeTier(rawValue.tier)
  const creamType = normalizeCreamType(rawValue.creamType)
  const sizes = normalizeSizes(rawValue.sizes, tier)
  const basePrice = typeof rawValue.basePrice === 'number' ? rawValue.basePrice : 0
  const builtIn = rawValue.builtIn === true
  const itemId =
    typeof rawValue.id === 'string' && rawValue.id.trim().length > 0
      ? rawValue.id.trim()
      : buildMerchantDefaultPricingItemId(tier, sizes, creamType)

  return {
    id: itemId,
    tier,
    sizes,
    creamType,
    label: buildMerchantDefaultPricingLabel(sizes, creamType),
    basePrice: normalizePrice(basePrice),
    builtIn,
  }
}

function parseSnapshot(rawValue: unknown): MerchantDefaultPricingSnapshot | null {
  if (typeof rawValue !== 'string' || rawValue.length === 0) {
    return null
  }

  try {
    const parsed = JSON.parse(rawValue) as unknown
    if (!isRecord(parsed)) {
      return null
    }

    return {
      single: normalizeTierItems(parsed.single, 'single'),
      double: normalizeTierItems(parsed.double, 'double'),
      triple: normalizeTierItems(parsed.triple, 'triple'),
    }
  } catch {
    return null
  }
}

function normalizeTierItems(rawValue: unknown, tier: MerchantPriceTier): MerchantDefaultPriceConfigItem[] {
  if (!Array.isArray(rawValue)) {
    return []
  }

  const items = rawValue
    .map((item) => parsePricingItem(item))
    .filter((item): item is MerchantDefaultPriceConfigItem => item !== null && item.tier === tier)

  return Array.from(new Map(items.map((item) => [item.id, item])).values())
}

function resolveDefaultStorage(): MerchantDefaultPricingStorageLike {
  const maybeStorage = (globalThis as { wx?: MerchantDefaultPricingStorageLike }).wx
  if (maybeStorage === undefined) {
    throw new Error('Mini program storage is unavailable in the current runtime')
  }

  return maybeStorage
}

export function createMemoryMerchantDefaultPricingStorage(): MemoryMerchantDefaultPricingStorage {
  const snapshot: Record<string, unknown> = {}

  return {
    snapshot,
    getStorageSync(key: string): unknown {
      return snapshot[key]
    },
    setStorageSync(key: string, value: unknown): void {
      snapshot[key] = value
    },
  }
}

export function saveMerchantDefaultPricingSnapshot(
  storage: MerchantDefaultPricingStorageLike,
  snapshot: MerchantDefaultPricingSnapshot,
): void {
  storage.setStorageSync(MERCHANT_DEFAULT_PRICING_STORAGE_KEY, JSON.stringify(snapshot))
}

export function loadStoredMerchantDefaultPricing(
  storage: MerchantDefaultPricingStorageLike = resolveDefaultStorage(),
): MerchantDefaultPricingSnapshot {
  const parsedSnapshot = parseSnapshot(storage.getStorageSync(MERCHANT_DEFAULT_PRICING_STORAGE_KEY))
  if (parsedSnapshot !== null) {
    return parsedSnapshot
  }

  const seededSnapshot = createSeedMerchantDefaultPricingSnapshot()
  saveMerchantDefaultPricingSnapshot(storage, seededSnapshot)
  return seededSnapshot
}

export function flattenMerchantDefaultPricingSnapshot(
  snapshot: MerchantDefaultPricingSnapshot,
): MerchantDefaultPriceConfigItem[] {
  return [...snapshot.single, ...snapshot.double, ...snapshot.triple]
}

export function resolveMerchantDefaultPriceByConfigId(
  snapshot: MerchantDefaultPricingSnapshot,
  configId: string,
): number {
  const matchedItem = flattenMerchantDefaultPricingSnapshot(snapshot).find((item) => item.id === configId)
  return matchedItem === undefined ? 0 : matchedItem.basePrice
}

export function resolveMerchantPriceTierFromLayer(layer: MerchantProductLayer): MerchantPriceTier {
  if (layer === '3-layer') {
    return 'triple'
  }

  if (layer === '2-layer') {
    return 'double'
  }

  return 'single'
}

export function isDefaultPricingItemCompatible(
  item: MerchantDefaultPriceConfigItem,
  selectedSpecSizes: ProductSpecSize[],
  selectedCreamTypes: MerchantCreamType[],
): boolean {
  if (!selectedCreamTypes.includes(item.creamType)) {
    return false
  }

  return item.sizes.every((size) => selectedSpecSizes.includes(size))
}

export function updateMerchantDefaultPricingItemPrice(
  storage: MerchantDefaultPricingStorageLike,
  itemId: string,
  basePrice: number,
): MerchantDefaultPricingSnapshot {
  const nextSnapshot = applyMerchantDefaultPricingItemPrice(loadStoredMerchantDefaultPricing(storage), itemId, basePrice)
  saveMerchantDefaultPricingSnapshot(storage, nextSnapshot)
  return nextSnapshot
}

export function applyMerchantDefaultPricingItemPrice(
  snapshot: MerchantDefaultPricingSnapshot,
  itemId: string,
  basePrice: number,
): MerchantDefaultPricingSnapshot {
  const normalizedPrice = normalizePrice(basePrice)
  return {
    single: snapshot.single.map((item) => (item.id === itemId ? { ...item, basePrice: normalizedPrice } : item)),
    double: snapshot.double.map((item) => (item.id === itemId ? { ...item, basePrice: normalizedPrice } : item)),
    triple: snapshot.triple.map((item) => (item.id === itemId ? { ...item, basePrice: normalizedPrice } : item)),
  }
}

export function addMerchantDefaultPricingCustomItemToSnapshot(
  snapshot: MerchantDefaultPricingSnapshot,
  input: MerchantDefaultPricingCustomInput,
): { snapshot: MerchantDefaultPricingSnapshot; item: MerchantDefaultPriceConfigItem } {
  const tier = VALID_PRICE_TIERS.includes(input.tier) ? input.tier : 'single'
  const normalizedSizes = normalizeSizes(input.sizes, tier)
  const creamType = normalizeCreamType(input.creamType)
  const nextItem = createPricingItem(tier, normalizedSizes, creamType, false)
  const tierItems = [...snapshot[tier]]
  const existingItem = tierItems.find((item) => item.id === nextItem.id)

  if (existingItem !== undefined) {
    return {
      snapshot,
      item: existingItem,
    }
  }

  return {
    snapshot: {
      ...snapshot,
      [tier]: [...tierItems, nextItem],
    },
    item: nextItem,
  }
}

export function addMerchantDefaultPricingCustomItem(
  storage: MerchantDefaultPricingStorageLike,
  input: MerchantDefaultPricingCustomInput,
): MerchantDefaultPriceConfigItem {
  const result = addMerchantDefaultPricingCustomItemToSnapshot(loadStoredMerchantDefaultPricing(storage), input)
  saveMerchantDefaultPricingSnapshot(storage, result.snapshot)
  return result.item
}

export function removeMerchantDefaultPricingItemFromSnapshot(
  snapshot: MerchantDefaultPricingSnapshot,
  itemId: string,
): MerchantDefaultPricingSnapshot {
  return {
    single: snapshot.single.filter((item) => item.id !== itemId),
    double: snapshot.double.filter((item) => item.id !== itemId),
    triple: snapshot.triple.filter((item) => item.id !== itemId),
  }
}

export function deleteMerchantDefaultPricingItem(
  storage: MerchantDefaultPricingStorageLike,
  itemId: string,
): MerchantDefaultPricingSnapshot {
  const nextSnapshot = removeMerchantDefaultPricingItemFromSnapshot(loadStoredMerchantDefaultPricing(storage), itemId)
  saveMerchantDefaultPricingSnapshot(storage, nextSnapshot)
  return nextSnapshot
}
