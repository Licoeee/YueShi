import type {
  MerchantCreamType,
  MerchantEnabledConfigIdsByTier,
  MerchantProductConfigAdjustmentMap,
  MerchantProductBatchEditInput,
  MerchantProductDraftInput,
  MerchantProductLayer,
  MerchantProductPriceAdjustmentMap,
  MerchantProductRecord,
  MerchantProductRecycleMeta,
} from '../../types/merchant-product'
import type {
  MerchantDefaultPriceConfigItem,
  MerchantDefaultPricingSnapshot,
  MerchantPriceTier,
} from '../../types/merchant-default-pricing'
import type { ProductSpecSize } from '../../types/product'
import {
  createSeedMerchantDefaultPricingSnapshot,
  flattenMerchantDefaultPricingSnapshot,
  isDefaultPricingItemCompatible,
  loadStoredMerchantDefaultPricing,
  resolveMerchantDefaultPriceByConfigId,
  resolveMerchantPriceTierFromLayer,
} from './merchant-default-pricing-storage'
import { CUSTOMER_CAKES } from '../mock/customer-cakes'

export const MERCHANT_PRODUCT_STORAGE_KEY = 'merchant-products-v1'
export const MERCHANT_PRODUCT_ID_COUNTER_KEY = 'merchant-product-id-counter-v1'
const RECYCLE_RETENTION_MS = 7 * 24 * 60 * 60 * 1000
const VALID_SPEC_SIZES: ProductSpecSize[] = ['6-inch', '8-inch', '10-inch', '12-inch', '14-inch', '16-inch']
const VALID_LAYERS: MerchantProductLayer[] = ['1-layer', '2-layer', '3-layer']
const VALID_CREAM_TYPES: MerchantCreamType[] = ['animal-cream-i', 'dairy-cream', 'naked-cake']
const PRODUCT_ID_PREFIX = 'A'
const DEFAULT_LAYER: MerchantProductLayer = '1-layer'
const DEFAULT_CREAM_TYPE: MerchantCreamType = 'dairy-cream'

export interface MerchantProductStorageLike {
  getStorageSync(key: string): unknown
  setStorageSync(key: string, value: unknown): void
}

interface MemoryMerchantProductStorage extends MerchantProductStorageLike {
  snapshot: Record<string, unknown>
}

interface MerchantProductSplitState {
  retainedProducts: MerchantProductRecord[]
  activeProducts: MerchantProductRecord[]
  recycleProducts: MerchantProductRecord[]
}

interface ProductIdMigrationResult {
  products: MerchantProductRecord[]
  changed: boolean
  maxSequence: number
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function normalizePrice(price: number): number {
  if (!Number.isFinite(price) || price <= 0) {
    return 0
  }

  return Math.round(price)
}

function normalizeNonNegativePrice(price: number): number {
  if (!Number.isFinite(price) || price < 0) {
    return 0
  }

  return Math.round(price)
}

function normalizeSpecSizes(rawValue: unknown): ProductSpecSize[] {
  if (!Array.isArray(rawValue)) {
    return ['6-inch']
  }

  const sizes = rawValue.filter((item): item is ProductSpecSize => VALID_SPEC_SIZES.includes(item as ProductSpecSize))
  const dedupedSizes = Array.from(new Set(sizes))

  return dedupedSizes.length > 0 ? dedupedSizes : ['6-inch']
}

function normalizeLayers(rawValue: unknown): MerchantProductLayer[] {
  if (!Array.isArray(rawValue)) {
    return [DEFAULT_LAYER]
  }

  const layers = rawValue.filter((item): item is MerchantProductLayer => VALID_LAYERS.includes(item as MerchantProductLayer))
  const dedupedLayers = Array.from(new Set(layers))

  return dedupedLayers.length > 0 ? dedupedLayers : [DEFAULT_LAYER]
}

function normalizeCreamType(rawValue: unknown): MerchantCreamType {
  if (VALID_CREAM_TYPES.includes(rawValue as MerchantCreamType)) {
    return rawValue as MerchantCreamType
  }

  return DEFAULT_CREAM_TYPE
}

function normalizeCreamTypes(rawValue: unknown, fallbackCreamType?: unknown): MerchantCreamType[] {
  const creamTypes = Array.isArray(rawValue)
    ? rawValue.filter((item): item is MerchantCreamType => VALID_CREAM_TYPES.includes(item as MerchantCreamType))
    : []
  const dedupedCreamTypes = Array.from(new Set(creamTypes))

  if (dedupedCreamTypes.length > 0) {
    return dedupedCreamTypes
  }

  return [normalizeCreamType(fallbackCreamType)]
}

function createEmptyEnabledConfigIdsByTier(): MerchantEnabledConfigIdsByTier {
  return {
    single: [],
    double: [],
    triple: [],
  }
}

function normalizeConfigIdList(rawValue: unknown): string[] {
  if (!Array.isArray(rawValue)) {
    return []
  }

  return Array.from(
    new Set(
      rawValue
        .filter((item): item is string => typeof item === 'string')
        .map((item) => item.trim())
        .filter((item) => item.length > 0),
    ),
  )
}

function normalizeEnabledConfigIdsByTier(rawValue: unknown): MerchantEnabledConfigIdsByTier {
  if (!isRecord(rawValue)) {
    return createEmptyEnabledConfigIdsByTier()
  }

  return {
    single: normalizeConfigIdList(rawValue.single),
    double: normalizeConfigIdList(rawValue.double),
    triple: normalizeConfigIdList(rawValue.triple),
  }
}

function hasEnabledConfigIdsByTier(enabledConfigIdsByTier: MerchantEnabledConfigIdsByTier): boolean {
  return (
    enabledConfigIdsByTier.single.length > 0 ||
    enabledConfigIdsByTier.double.length > 0 ||
    enabledConfigIdsByTier.triple.length > 0
  )
}

function normalizePriceAdjustmentMap<T extends string>(
  rawValue: unknown,
  validKeys: readonly T[],
): MerchantProductPriceAdjustmentMap<T> {
  if (!isRecord(rawValue)) {
    return {}
  }

  return validKeys.reduce<MerchantProductPriceAdjustmentMap<T>>((result, key) => {
    const rawAdjustment = rawValue[key]
    if (typeof rawAdjustment !== 'number') {
      return result
    }

    result[key] = normalizeNonNegativePrice(rawAdjustment)
    return result
  }, {})
}

function normalizeConfigAdjustmentMap(rawValue: unknown): MerchantProductConfigAdjustmentMap {
  if (!isRecord(rawValue)) {
    return {}
  }

  return Object.entries(rawValue).reduce<MerchantProductConfigAdjustmentMap>((result, [key, value]) => {
    if (typeof value !== 'number' || key.trim().length === 0) {
      return result
    }

    result[key] = normalizeNonNegativePrice(value)
    return result
  }, {})
}

function filterConfigAdjustmentsByEnabledIds(
  adjustments: MerchantProductConfigAdjustmentMap,
  enabledConfigIdsByTier: MerchantEnabledConfigIdsByTier,
): MerchantProductConfigAdjustmentMap {
  if (!hasEnabledConfigIdsByTier(enabledConfigIdsByTier)) {
    return adjustments
  }

  const enabledIds = new Set([
    ...enabledConfigIdsByTier.single,
    ...enabledConfigIdsByTier.double,
    ...enabledConfigIdsByTier.triple,
  ])

  return Object.entries(adjustments).reduce<MerchantProductConfigAdjustmentMap>((result, [configId, adjustment]) => {
    if (enabledIds.has(configId)) {
      result[configId] = adjustment
    }
    return result
  }, {})
}

function normalizeImageUrls(rawValue: unknown, fallbackCoverImage?: unknown): string[] {
  if (Array.isArray(rawValue)) {
    const imageUrls = rawValue
      .filter((item): item is string => typeof item === 'string')
      .map((item) => item.trim())
      .filter((item) => item.length > 0)

    const dedupedImageUrls = Array.from(new Set(imageUrls))
    if (dedupedImageUrls.length > 0) {
      return dedupedImageUrls
    }
  }

  if (typeof fallbackCoverImage === 'string' && fallbackCoverImage.trim().length > 0) {
    return [fallbackCoverImage.trim()]
  }

  return []
}

function resolvePrimaryCreamType(creamTypes: MerchantCreamType[], fallbackCreamType?: unknown): MerchantCreamType {
  return creamTypes[0] ?? normalizeCreamType(fallbackCreamType)
}

function resolveCoverImage(imageUrls: string[], fallbackCoverImage?: unknown): string {
  if (imageUrls.length > 0) {
    return imageUrls[0]
  }

  return typeof fallbackCoverImage === 'string' ? fallbackCoverImage.trim() : ''
}

function resolvePriceAdjustment<T extends string>(
  adjustments: MerchantProductPriceAdjustmentMap<T>,
  key: T,
): number {
  const rawValue = adjustments[key]
  return typeof rawValue === 'number' ? normalizeNonNegativePrice(rawValue) : 0
}

function resolveConfigPriceAdjustment(
  adjustments: MerchantProductConfigAdjustmentMap,
  configId: string,
): number {
  const rawValue = adjustments[configId]
  return typeof rawValue === 'number' ? normalizeNonNegativePrice(rawValue) : 0
}

function parseRecycleMeta(rawValue: unknown): MerchantProductRecycleMeta | undefined {
  if (!isRecord(rawValue)) {
    return undefined
  }

  const deletedAt = rawValue.deletedAt
  const recoverExpiresAt = rawValue.recoverExpiresAt

  if (typeof deletedAt !== 'string' || typeof recoverExpiresAt !== 'string') {
    return undefined
  }

  return {
    deletedAt,
    recoverExpiresAt,
  }
}

function parseMerchantProduct(rawValue: unknown): MerchantProductRecord | null {
  if (!isRecord(rawValue)) {
    return null
  }

  const id = rawValue.id
  const title = rawValue.title
  const description = rawValue.description
  const createdAt = rawValue.createdAt
  const updatedAt = rawValue.updatedAt
  const basePrice = rawValue.basePrice

  if (
    typeof id !== 'string' ||
    typeof title !== 'string' ||
    typeof description !== 'string' ||
    typeof createdAt !== 'string' ||
    typeof updatedAt !== 'string' ||
    typeof basePrice !== 'number'
  ) {
    return null
  }

  const imageUrls = normalizeImageUrls(rawValue.imageUrls, rawValue.coverImage)
  const layers = normalizeLayers(rawValue.layers)
  const creamTypes = normalizeCreamTypes(rawValue.creamTypes, rawValue.creamType)
  const enabledConfigIdsByTier = normalizeEnabledConfigIdsByTier(rawValue.enabledConfigIdsByTier)
  const priceAdjustmentsByConfigId = normalizeConfigAdjustmentMap(rawValue.priceAdjustmentsByConfigId)
  const sizePriceAdjustments = normalizePriceAdjustmentMap(rawValue.sizePriceAdjustments, VALID_SPEC_SIZES)
  const layerPriceAdjustments = normalizePriceAdjustmentMap(rawValue.layerPriceAdjustments, VALID_LAYERS)
  const creamPriceAdjustments = normalizePriceAdjustmentMap(rawValue.creamPriceAdjustments, VALID_CREAM_TYPES)

  return {
    id,
    title,
    description,
    createdAt,
    updatedAt,
    basePrice: normalizePrice(basePrice),
    specSizes: normalizeSpecSizes(rawValue.specSizes),
    layers,
    creamTypes,
    creamType: resolvePrimaryCreamType(creamTypes, rawValue.creamType),
    enabledConfigIdsByTier,
    priceAdjustmentsByConfigId,
    sizePriceAdjustments,
    layerPriceAdjustments,
    creamPriceAdjustments,
    imageUrls,
    coverImage: resolveCoverImage(imageUrls, rawValue.coverImage),
    recycleMeta: parseRecycleMeta(rawValue.recycleMeta),
  }
}

function parseMerchantProductSnapshot(rawValue: unknown): MerchantProductRecord[] {
  if (typeof rawValue !== 'string' || rawValue.length === 0) {
    return []
  }

  try {
    const parsed = JSON.parse(rawValue) as unknown
    if (!Array.isArray(parsed)) {
      return []
    }

    return parsed
      .map((item) => parseMerchantProduct(item))
      .filter((item): item is MerchantProductRecord => item !== null)
  } catch {
    return []
  }
}

function formatProductId(sequence: number): string {
  return `${PRODUCT_ID_PREFIX}${String(sequence).padStart(3, '0')}`
}

function parseProductSequence(productId: string): number | null {
  const matched = /^A(\d+)$/.exec(productId)
  if (matched === null) {
    return null
  }

  const sequence = Number(matched[1])
  if (!Number.isInteger(sequence) || sequence <= 0) {
    return null
  }

  return sequence
}

function resolveMaxProductSequence(products: MerchantProductRecord[]): number {
  return products.reduce((maxSequence, product) => {
    const sequence = parseProductSequence(product.id)
    if (sequence === null) {
      return maxSequence
    }

    return Math.max(maxSequence, sequence)
  }, 0)
}

function resolveCreamTypeFromCake(cakeId: string): MerchantCreamType {
  return cakeId.length % 2 === 0 ? 'animal-cream-i' : 'dairy-cream'
}

function buildSeedProducts(now: Date): MerchantProductRecord[] {
  const nowText = now.toISOString()

  return CUSTOMER_CAKES.map((cake, index) => ({
    id: formatProductId(index + 1),
    title: cake.title,
    description: cake.description,
    basePrice: normalizePrice(cake.basePrice),
    specSizes: normalizeSpecSizes(cake.specs.map((spec) => spec.size)),
    layers: [DEFAULT_LAYER],
    creamTypes: [resolveCreamTypeFromCake(cake.id)],
    creamType: resolveCreamTypeFromCake(cake.id),
    enabledConfigIdsByTier: createEmptyEnabledConfigIdsByTier(),
    priceAdjustmentsByConfigId: {},
    sizePriceAdjustments: {},
    layerPriceAdjustments: {},
    creamPriceAdjustments: {},
    imageUrls: [cake.coverImage],
    coverImage: cake.coverImage,
    createdAt: nowText,
    updatedAt: nowText,
  }))
}

function resolveCompatiblePricingItems(
  product: Pick<MerchantProductRecord, 'specSizes' | 'layers' | 'creamTypes'>,
  pricingSnapshot: MerchantDefaultPricingSnapshot,
): MerchantDefaultPriceConfigItem[] {
  const allowedTiers = new Set(product.layers.map((layer) => resolveMerchantPriceTierFromLayer(layer)))

  return flattenMerchantDefaultPricingSnapshot(pricingSnapshot).filter((item) => {
    if (!allowedTiers.has(item.tier)) {
      return false
    }

    return isDefaultPricingItemCompatible(item, product.specSizes, product.creamTypes)
  })
}

export function resolveMerchantProductEnabledConfigIdsByTier(
  product: Pick<MerchantProductRecord, 'specSizes' | 'layers' | 'creamTypes' | 'priceAdjustmentsByConfigId' | 'enabledConfigIdsByTier'>,
  pricingSnapshot: MerchantDefaultPricingSnapshot = createSeedMerchantDefaultPricingSnapshot(),
): MerchantEnabledConfigIdsByTier {
  const compatibleItems = resolveCompatiblePricingItems(product, pricingSnapshot)
  const compatibleIdSet = new Set(compatibleItems.map((item) => item.id))
  const explicitEnabledConfigIds = filterEnabledConfigIdsByCompatibleItems(
    normalizeEnabledConfigIdsByTier(product.enabledConfigIdsByTier),
    product,
    pricingSnapshot,
  )

  if (hasEnabledConfigIdsByTier(explicitEnabledConfigIds)) {
    return explicitEnabledConfigIds
  }

  const configAdjustmentIds = Object.keys(product.priceAdjustmentsByConfigId).filter((configId) => compatibleIdSet.has(configId))
  if (configAdjustmentIds.length > 0) {
    return buildEnabledConfigIdsByTierFromIds(configAdjustmentIds, pricingSnapshot)
  }

  return buildEnabledConfigIdsByTierFromIds(
    compatibleItems.map((item) => item.id),
    pricingSnapshot,
  )
}

export function resolveMerchantProductEnabledPricingItems(
  product: Pick<MerchantProductRecord, 'specSizes' | 'layers' | 'creamTypes' | 'priceAdjustmentsByConfigId' | 'enabledConfigIdsByTier'>,
  pricingSnapshot: MerchantDefaultPricingSnapshot = createSeedMerchantDefaultPricingSnapshot(),
): MerchantDefaultPriceConfigItem[] {
  const enabledConfigIdsByTier = resolveMerchantProductEnabledConfigIdsByTier(product, pricingSnapshot)
  const enabledIds = new Set([
    ...enabledConfigIdsByTier.single,
    ...enabledConfigIdsByTier.double,
    ...enabledConfigIdsByTier.triple,
  ])

  return resolveCompatiblePricingItems(product, pricingSnapshot).filter((item) => enabledIds.has(item.id))
}

function buildEnabledConfigIdsByTierFromIds(
  configIds: string[],
  pricingSnapshot: MerchantDefaultPricingSnapshot,
): MerchantEnabledConfigIdsByTier {
  const result = createEmptyEnabledConfigIdsByTier()
  const pricingItemMap = new Map(flattenMerchantDefaultPricingSnapshot(pricingSnapshot).map((item) => [item.id, item]))

  configIds.forEach((configId) => {
    const item = pricingItemMap.get(configId)
    if (item === undefined) {
      return
    }

    const targetList = result[item.tier]
    if (!targetList.includes(item.id)) {
      targetList.push(item.id)
    }
  })

  return result
}

function filterEnabledConfigIdsByCompatibleItems(
  enabledConfigIdsByTier: MerchantEnabledConfigIdsByTier,
  product: Pick<MerchantProductRecord, 'specSizes' | 'layers' | 'creamTypes'>,
  pricingSnapshot: MerchantDefaultPricingSnapshot,
): MerchantEnabledConfigIdsByTier {
  const compatibleIds = new Set(resolveCompatiblePricingItems(product, pricingSnapshot).map((item) => item.id))

  return {
    single: enabledConfigIdsByTier.single.filter((configId) => compatibleIds.has(configId)),
    double: enabledConfigIdsByTier.double.filter((configId) => compatibleIds.has(configId)),
    triple: enabledConfigIdsByTier.triple.filter((configId) => compatibleIds.has(configId)),
  }
}

function resolveSelectionsFromEnabledConfigIds(
  enabledConfigIdsByTier: MerchantEnabledConfigIdsByTier,
  pricingSnapshot: MerchantDefaultPricingSnapshot,
  fallbackSpecSizes: ProductSpecSize[],
  fallbackLayers: MerchantProductLayer[],
  fallbackCreamTypes: MerchantCreamType[],
  fallbackCreamType?: unknown,
): {
  specSizes: ProductSpecSize[]
  layers: MerchantProductLayer[]
  creamTypes: MerchantCreamType[]
  creamType: MerchantCreamType
} {
  if (!hasEnabledConfigIdsByTier(enabledConfigIdsByTier)) {
    const creamTypes = fallbackCreamTypes.length > 0 ? fallbackCreamTypes : [normalizeCreamType(fallbackCreamType)]
    return {
      specSizes: fallbackSpecSizes,
      layers: fallbackLayers,
      creamTypes,
      creamType: resolvePrimaryCreamType(creamTypes, fallbackCreamType),
    }
  }

  const selectedConfigIds = [
    ...enabledConfigIdsByTier.single,
    ...enabledConfigIdsByTier.double,
    ...enabledConfigIdsByTier.triple,
  ]
  const pricingItemMap = new Map(flattenMerchantDefaultPricingSnapshot(pricingSnapshot).map((item) => [item.id, item]))
  const matchedItems = selectedConfigIds
    .map((configId) => pricingItemMap.get(configId))
    .filter((item): item is MerchantDefaultPriceConfigItem => item !== undefined)

  const specSizeSet = new Set<ProductSpecSize>()
  const layerSet = new Set<MerchantProductLayer>()
  const creamTypeSet = new Set<MerchantCreamType>()

  matchedItems.forEach((item) => {
    item.sizes.forEach((size) => specSizeSet.add(size))
    layerSet.add(resolveLayerFromPriceTier(item.tier))
    creamTypeSet.add(item.creamType)
  })

  const specSizes = VALID_SPEC_SIZES.filter((size) => specSizeSet.has(size))
  const layers = VALID_LAYERS.filter((layer) => layerSet.has(layer))
  const creamTypes = VALID_CREAM_TYPES.filter((creamType) => creamTypeSet.has(creamType))

  return {
    specSizes: specSizes.length > 0 ? specSizes : fallbackSpecSizes,
    layers: layers.length > 0 ? layers : fallbackLayers,
    creamTypes: creamTypes.length > 0 ? creamTypes : fallbackCreamTypes,
    creamType: resolvePrimaryCreamType(
      creamTypes.length > 0 ? creamTypes : fallbackCreamTypes,
      fallbackCreamType,
    ),
  }
}

function resolveLayerFromPriceTier(tier: MerchantPriceTier): MerchantProductLayer {
  if (tier === 'triple') {
    return '3-layer'
  }

  if (tier === 'double') {
    return '2-layer'
  }

  return '1-layer'
}

function resolveLegacyConfigAdjustment(
  product: MerchantProductRecord,
  configItem: MerchantDefaultPriceConfigItem,
): number {
  const layerValue: MerchantProductLayer =
    configItem.tier === 'triple' ? '3-layer' : configItem.tier === 'double' ? '2-layer' : '1-layer'
  const sizeAdjustment = configItem.sizes.reduce((total, size) => total + resolvePriceAdjustment(product.sizePriceAdjustments, size), 0)

  return (
    normalizePrice(product.basePrice) +
    sizeAdjustment +
    resolvePriceAdjustment(product.layerPriceAdjustments, layerValue) +
    resolvePriceAdjustment(product.creamPriceAdjustments, configItem.creamType)
  )
}

function resolveMerchantProductConfigSurcharge(
  product: MerchantProductRecord,
  configId: string,
  pricingSnapshot: MerchantDefaultPricingSnapshot,
): number {
  const configAdjustments = product.priceAdjustmentsByConfigId ?? {}

  if (Object.prototype.hasOwnProperty.call(configAdjustments, configId)) {
    return resolveConfigPriceAdjustment(configAdjustments, configId)
  }

  const configItem = flattenMerchantDefaultPricingSnapshot(pricingSnapshot).find((item) => item.id === configId)
  if (configItem === undefined) {
    return 0
  }

  return resolveLegacyConfigAdjustment(product, configItem)
}

function recalculateBasePrice(
  product: MerchantProductRecord,
  pricingSnapshot: MerchantDefaultPricingSnapshot,
): number {
  const enabledPricingItems = resolveMerchantProductEnabledPricingItems(product, pricingSnapshot)
  if (enabledPricingItems.length === 0) {
    return normalizePrice(product.basePrice)
  }

  const minPrice = enabledPricingItems.reduce((currentMin, item) => {
    const price = resolveMerchantDefaultPriceByConfigId(pricingSnapshot, item.id) +
      resolveMerchantProductConfigSurcharge(product, item.id, pricingSnapshot)
    return Math.min(currentMin, price)
  }, Number.POSITIVE_INFINITY)

  return Number.isFinite(minPrice) ? normalizePrice(minPrice) : normalizePrice(product.basePrice)
}

function isRecycleExpired(recycleMeta: MerchantProductRecycleMeta, now: Date): boolean {
  const expireTime = new Date(recycleMeta.recoverExpiresAt).getTime()
  if (Number.isNaN(expireTime)) {
    return true
  }

  return now.getTime() > expireTime
}

function buildRecycleMeta(now: Date): MerchantProductRecycleMeta {
  return {
    deletedAt: now.toISOString(),
    recoverExpiresAt: new Date(now.getTime() + RECYCLE_RETENTION_MS).toISOString(),
  }
}

function resolveDefaultStorage(): MerchantProductStorageLike {
  const maybeStorage = (globalThis as { wx?: MerchantProductStorageLike }).wx
  if (maybeStorage === undefined) {
    throw new Error('Mini program storage is unavailable in the current runtime')
  }

  return maybeStorage
}

function resolveNow(createNow?: () => Date): Date {
  return typeof createNow === 'function' ? createNow() : new Date()
}

function parseCounterValue(rawValue: unknown): number {
  if (typeof rawValue === 'number' && Number.isInteger(rawValue) && rawValue > 0) {
    return rawValue
  }

  if (typeof rawValue === 'string' && rawValue.length > 0) {
    const parsed = Number(rawValue)
    if (Number.isInteger(parsed) && parsed > 0) {
      return parsed
    }
  }

  return 0
}

function loadProductIdCounter(storage: MerchantProductStorageLike): number {
  return parseCounterValue(storage.getStorageSync(MERCHANT_PRODUCT_ID_COUNTER_KEY))
}

function saveProductIdCounter(storage: MerchantProductStorageLike, counter: number): void {
  storage.setStorageSync(MERCHANT_PRODUCT_ID_COUNTER_KEY, counter)
}

function ensureProductIdCounter(storage: MerchantProductStorageLike, targetCounter: number): void {
  const currentCounter = loadProductIdCounter(storage)
  if (currentCounter >= targetCounter) {
    return
  }

  saveProductIdCounter(storage, targetCounter)
}

function normalizeProductIds(products: MerchantProductRecord[], storage: MerchantProductStorageLike): ProductIdMigrationResult {
  const currentMaxSequence = resolveMaxProductSequence(products)
  let nextSequence = Math.max(currentMaxSequence, loadProductIdCounter(storage))
  let hasChanged = false

  const normalizedProducts = products.map((product) => {
    if (parseProductSequence(product.id) !== null) {
      return product
    }

    hasChanged = true
    nextSequence += 1

    return {
      ...product,
      id: formatProductId(nextSequence),
      updatedAt: new Date().toISOString(),
    }
  })

  return {
    products: normalizedProducts,
    changed: hasChanged,
    maxSequence: Math.max(resolveMaxProductSequence(normalizedProducts), nextSequence),
  }
}

function loadProductsWithSeed(
  storage: MerchantProductStorageLike,
  createNow?: () => Date,
): MerchantProductRecord[] {
  const snapshot = loadMerchantProductSnapshot(storage)
  if (snapshot.length > 0) {
    return snapshot
  }

  const seededProducts = buildSeedProducts(resolveNow(createNow))
  saveMerchantProductSnapshot(storage, seededProducts)
  ensureProductIdCounter(storage, seededProducts.length)

  return seededProducts
}

function persistRetainedProducts(
  storage: MerchantProductStorageLike,
  products: MerchantProductRecord[],
  now: Date,
): MerchantProductRecord[] {
  const splitState = splitMerchantProductsByRecycleState(products, now)
  if (splitState.retainedProducts.length !== products.length) {
    saveMerchantProductSnapshot(storage, splitState.retainedProducts)
  }

  return splitState.retainedProducts
}

function replaceProductAt(
  products: MerchantProductRecord[],
  index: number,
  nextProduct: MerchantProductRecord,
): MerchantProductRecord[] {
  return products.map((item, itemIndex) => (itemIndex === index ? nextProduct : item))
}

function findProductIndex(products: MerchantProductRecord[], productId: string): number {
  return products.findIndex((product) => product.id === productId)
}

function requireProduct(
  products: MerchantProductRecord[],
  productId: string,
): { product: MerchantProductRecord; index: number } {
  const index = findProductIndex(products, productId)
  if (index < 0) {
    throw new Error(`Product "${productId}" does not exist`)
  }

  return {
    product: products[index],
    index,
  }
}

function resolveNextProductId(storage: MerchantProductStorageLike, products: MerchantProductRecord[]): string {
  const maxSequence = resolveMaxProductSequence(products)
  const counter = loadProductIdCounter(storage)
  const nextSequence = Math.max(maxSequence, counter) + 1

  saveProductIdCounter(storage, nextSequence)

  return formatProductId(nextSequence)
}

function resolvePatchedCreamTypes(
  product: MerchantProductRecord,
  patch: Partial<MerchantProductDraftInput>,
): MerchantCreamType[] {
  if (patch.creamTypes !== undefined) {
    return normalizeCreamTypes(patch.creamTypes, patch.creamType)
  }

  if (patch.creamType !== undefined) {
    return normalizeCreamTypes([], patch.creamType)
  }

  return product.creamTypes
}

function resolvePatchedLayers(
  product: MerchantProductRecord,
  patch: Partial<MerchantProductDraftInput>,
): MerchantProductLayer[] {
  if (patch.layers !== undefined) {
    return normalizeLayers(patch.layers)
  }

  return product.layers
}

function resolvePatchedImageUrls(
  product: MerchantProductRecord,
  patch: Partial<MerchantProductDraftInput>,
): string[] {
  if (patch.imageUrls !== undefined) {
    return normalizeImageUrls(patch.imageUrls, patch.coverImage ?? product.coverImage)
  }

  if (typeof patch.coverImage === 'string') {
    const nextCoverImage = patch.coverImage.trim()
    if (nextCoverImage.length === 0) {
      return []
    }

    const remainingImageUrls = product.imageUrls.filter((imageUrl) => imageUrl !== nextCoverImage)
    return [nextCoverImage, ...remainingImageUrls]
  }

  return product.imageUrls
}

function resolvePatchedEnabledConfigIdsByTier(
  product: MerchantProductRecord,
  patch: Partial<MerchantProductDraftInput>,
  pricingSnapshot: MerchantDefaultPricingSnapshot,
  nextSpecSizes: ProductSpecSize[],
  nextLayers: MerchantProductLayer[],
  nextCreamTypes: MerchantCreamType[],
): MerchantEnabledConfigIdsByTier {
  if (patch.enabledConfigIdsByTier !== undefined) {
    return buildEnabledConfigIdsByTierFromIds(
      [
        ...normalizeEnabledConfigIdsByTier(patch.enabledConfigIdsByTier).single,
        ...normalizeEnabledConfigIdsByTier(patch.enabledConfigIdsByTier).double,
        ...normalizeEnabledConfigIdsByTier(patch.enabledConfigIdsByTier).triple,
      ],
      pricingSnapshot,
    )
  }

  return filterEnabledConfigIdsByCompatibleItems(
    product.enabledConfigIdsByTier,
    {
      ...product,
      specSizes: nextSpecSizes,
      layers: nextLayers,
      creamTypes: nextCreamTypes,
    },
    pricingSnapshot,
  )
}

function resolvePatchedConfigAdjustments(
  product: MerchantProductRecord,
  patch: Partial<MerchantProductDraftInput>,
): MerchantProductConfigAdjustmentMap {
  if (patch.priceAdjustmentsByConfigId !== undefined) {
    return normalizeConfigAdjustmentMap(patch.priceAdjustmentsByConfigId)
  }

  return product.priceAdjustmentsByConfigId
}

function resolvePatchedSizePriceAdjustments(
  product: MerchantProductRecord,
  patch: Partial<MerchantProductDraftInput>,
): MerchantProductPriceAdjustmentMap<ProductSpecSize> {
  if (patch.sizePriceAdjustments !== undefined) {
    return normalizePriceAdjustmentMap(patch.sizePriceAdjustments, VALID_SPEC_SIZES)
  }

  return product.sizePriceAdjustments
}

function resolvePatchedLayerPriceAdjustments(
  product: MerchantProductRecord,
  patch: Partial<MerchantProductDraftInput>,
): MerchantProductPriceAdjustmentMap<MerchantProductLayer> {
  if (patch.layerPriceAdjustments !== undefined) {
    return normalizePriceAdjustmentMap(patch.layerPriceAdjustments, VALID_LAYERS)
  }

  return product.layerPriceAdjustments
}

function resolvePatchedCreamPriceAdjustments(
  product: MerchantProductRecord,
  patch: Partial<MerchantProductDraftInput>,
): MerchantProductPriceAdjustmentMap<MerchantCreamType> {
  if (patch.creamPriceAdjustments !== undefined) {
    return normalizePriceAdjustmentMap(patch.creamPriceAdjustments, VALID_CREAM_TYPES)
  }

  return product.creamPriceAdjustments
}

export function resolveMerchantProductSalePrice(
  product: MerchantProductRecord,
  size: ProductSpecSize,
  layer: MerchantProductLayer,
  creamType: MerchantCreamType,
  pricingSnapshot: MerchantDefaultPricingSnapshot = createSeedMerchantDefaultPricingSnapshot(),
): number {
  const tier = resolveMerchantPriceTierFromLayer(layer)
  const compatibleItems = flattenMerchantDefaultPricingSnapshot(pricingSnapshot).filter((item) => (
    item.tier === tier &&
    item.creamType === creamType &&
    item.sizes.includes(size)
  ))

  if (compatibleItems.length === 0) {
    return (
      normalizePrice(product.basePrice) +
      resolvePriceAdjustment(product.sizePriceAdjustments, size) +
      resolvePriceAdjustment(product.layerPriceAdjustments, layer) +
      resolvePriceAdjustment(product.creamPriceAdjustments, creamType)
    )
  }

  const minConfiguredPrice = compatibleItems.reduce((currentMin, item) => {
    const price = resolveMerchantDefaultPriceByConfigId(pricingSnapshot, item.id) +
      resolveMerchantProductConfigSurcharge(product, item.id, pricingSnapshot)
    return Math.min(currentMin, price)
  }, Number.POSITIVE_INFINITY)

  return Number.isFinite(minConfiguredPrice) ? normalizePrice(minConfiguredPrice) : normalizePrice(product.basePrice)
}

export function resolveMerchantProductConfiguredPrice(
  product: MerchantProductRecord,
  configId: string,
  pricingSnapshot: MerchantDefaultPricingSnapshot = createSeedMerchantDefaultPricingSnapshot(),
): number {
  return normalizePrice(
    resolveMerchantDefaultPriceByConfigId(pricingSnapshot, configId) +
    resolveMerchantProductConfigSurcharge(product, configId, pricingSnapshot),
  )
}

export function resolveMerchantProductMinSalePrice(
  product: MerchantProductRecord,
  pricingSnapshot: MerchantDefaultPricingSnapshot = createSeedMerchantDefaultPricingSnapshot(),
): number {
  return recalculateBasePrice(product, pricingSnapshot)
}

export function createMemoryMerchantProductStorage(): MemoryMerchantProductStorage {
  const snapshot: Record<string, unknown> = {}

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

export function loadMerchantProductSnapshot(storage: MerchantProductStorageLike): MerchantProductRecord[] {
  return parseMerchantProductSnapshot(storage.getStorageSync(MERCHANT_PRODUCT_STORAGE_KEY))
}

export function saveMerchantProductSnapshot(storage: MerchantProductStorageLike, items: MerchantProductRecord[]): void {
  storage.setStorageSync(MERCHANT_PRODUCT_STORAGE_KEY, JSON.stringify(items))
}

export function splitMerchantProductsByRecycleState(
  products: MerchantProductRecord[],
  now: Date = new Date(),
): MerchantProductSplitState {
  const retainedProducts: MerchantProductRecord[] = []
  const activeProducts: MerchantProductRecord[] = []
  const recycleProducts: MerchantProductRecord[] = []

  products.forEach((product) => {
    if (product.recycleMeta === undefined) {
      retainedProducts.push(product)
      activeProducts.push(product)
      return
    }

    if (isRecycleExpired(product.recycleMeta, now)) {
      return
    }

    retainedProducts.push(product)
    recycleProducts.push(product)
  })

  return {
    retainedProducts,
    activeProducts,
    recycleProducts,
  }
}

function refreshProductBasePrices(
  products: MerchantProductRecord[],
  pricingSnapshot: MerchantDefaultPricingSnapshot,
): { products: MerchantProductRecord[]; changed: boolean } {
  let changed = false

  const nextProducts = products.map((product) => {
    const nextBasePrice = recalculateBasePrice(product, pricingSnapshot)
    if (nextBasePrice === product.basePrice) {
      return product
    }

    changed = true
    return {
      ...product,
      basePrice: nextBasePrice,
    }
  })

  return {
    products: nextProducts,
    changed,
  }
}

export function loadStoredMerchantProducts(
  storage: MerchantProductStorageLike = resolveDefaultStorage(),
  createNow?: () => Date,
): MerchantProductRecord[] {
  const now = resolveNow(createNow)
  const products = loadProductsWithSeed(storage, createNow)
  const normalizedResult = normalizeProductIds(products, storage)
  const retainedProducts = persistRetainedProducts(storage, normalizedResult.products, now)
  const pricingSnapshot = loadStoredMerchantDefaultPricing(storage)
  const refreshedProducts = refreshProductBasePrices(retainedProducts, pricingSnapshot)

  if (normalizedResult.changed || retainedProducts.length !== products.length || refreshedProducts.changed) {
    saveMerchantProductSnapshot(storage, refreshedProducts.products)
  }

  ensureProductIdCounter(storage, resolveMaxProductSequence(refreshedProducts.products))

  return refreshedProducts.products
}

export function createMerchantProduct(
  storage: MerchantProductStorageLike,
  input: MerchantProductDraftInput,
  createNow?: () => Date,
  pricingSnapshot?: MerchantDefaultPricingSnapshot,
): MerchantProductRecord {
  const now = resolveNow(createNow)
  const nowText = now.toISOString()
  const resolvedPricingSnapshot = pricingSnapshot ?? loadStoredMerchantDefaultPricing(storage)
  const products = loadStoredMerchantProducts(storage, createNow)
  const imageUrls = normalizeImageUrls(input.imageUrls, input.coverImage)
  const enabledConfigIdsByTier = buildEnabledConfigIdsByTierFromIds(
    [
      ...normalizeEnabledConfigIdsByTier(input.enabledConfigIdsByTier).single,
      ...normalizeEnabledConfigIdsByTier(input.enabledConfigIdsByTier).double,
      ...normalizeEnabledConfigIdsByTier(input.enabledConfigIdsByTier).triple,
    ],
    resolvedPricingSnapshot,
  )
  const fallbackSpecSizes = normalizeSpecSizes(input.specSizes)
  const fallbackLayers = normalizeLayers(input.layers)
  const fallbackCreamTypes = normalizeCreamTypes(input.creamTypes, input.creamType)
  const resolvedSelections = resolveSelectionsFromEnabledConfigIds(
    enabledConfigIdsByTier,
    resolvedPricingSnapshot,
    fallbackSpecSizes,
    fallbackLayers,
    fallbackCreamTypes,
    input.creamType,
  )
  const priceAdjustmentsByConfigId = filterConfigAdjustmentsByEnabledIds(
    normalizeConfigAdjustmentMap(input.priceAdjustmentsByConfigId),
    enabledConfigIdsByTier,
  )
  const sizePriceAdjustments = normalizePriceAdjustmentMap(input.sizePriceAdjustments, VALID_SPEC_SIZES)
  const layerPriceAdjustments = normalizePriceAdjustmentMap(input.layerPriceAdjustments, VALID_LAYERS)
  const creamPriceAdjustments = normalizePriceAdjustmentMap(input.creamPriceAdjustments, VALID_CREAM_TYPES)

  const draftProduct: MerchantProductRecord = {
    id: resolveNextProductId(storage, products),
    title: input.title.trim(),
    description: input.description.trim(),
    basePrice: normalizePrice(input.basePrice ?? 0),
    specSizes: resolvedSelections.specSizes,
    layers: resolvedSelections.layers,
    creamTypes: resolvedSelections.creamTypes,
    creamType: resolvedSelections.creamType,
    enabledConfigIdsByTier,
    priceAdjustmentsByConfigId,
    sizePriceAdjustments,
    layerPriceAdjustments,
    creamPriceAdjustments,
    imageUrls,
    coverImage: resolveCoverImage(imageUrls, input.coverImage),
    createdAt: nowText,
    updatedAt: nowText,
  }
  const nextProduct: MerchantProductRecord = {
    ...draftProduct,
    basePrice: recalculateBasePrice(draftProduct, resolvedPricingSnapshot),
  }

  saveMerchantProductSnapshot(storage, [nextProduct, ...products])

  return nextProduct
}

export function updateMerchantProduct(
  storage: MerchantProductStorageLike,
  productId: string,
  patch: Partial<MerchantProductDraftInput>,
  createNow?: () => Date,
  pricingSnapshot?: MerchantDefaultPricingSnapshot,
): MerchantProductRecord {
  const now = resolveNow(createNow)
  const resolvedPricingSnapshot = pricingSnapshot ?? loadStoredMerchantDefaultPricing(storage)
  const products = loadStoredMerchantProducts(storage, createNow)
  const { product, index } = requireProduct(products, productId)
  if (product.recycleMeta !== undefined) {
    throw new Error(`Product "${productId}" is in recycle bin`)
  }

  const creamTypes = resolvePatchedCreamTypes(product, patch)
  const layers = resolvePatchedLayers(product, patch)
  const specSizes = patch.specSizes !== undefined ? normalizeSpecSizes(patch.specSizes) : product.specSizes
  const imageUrls = resolvePatchedImageUrls(product, patch)
  const enabledConfigIdsByTier = resolvePatchedEnabledConfigIdsByTier(
    product,
    patch,
    resolvedPricingSnapshot,
    specSizes,
    layers,
    creamTypes,
  )
  const resolvedSelections = resolveSelectionsFromEnabledConfigIds(
    enabledConfigIdsByTier,
    resolvedPricingSnapshot,
    specSizes,
    layers,
    creamTypes,
    patch.creamType ?? product.creamType,
  )
  const priceAdjustmentsByConfigId = filterConfigAdjustmentsByEnabledIds(
    resolvePatchedConfigAdjustments(product, patch),
    enabledConfigIdsByTier,
  )
  const sizePriceAdjustments = resolvePatchedSizePriceAdjustments(product, patch)
  const layerPriceAdjustments = resolvePatchedLayerPriceAdjustments(product, patch)
  const creamPriceAdjustments = resolvePatchedCreamPriceAdjustments(product, patch)

  const draftProduct: MerchantProductRecord = {
    ...product,
    title: typeof patch.title === 'string' ? patch.title.trim() : product.title,
    description: typeof patch.description === 'string' ? patch.description.trim() : product.description,
    basePrice: typeof patch.basePrice === 'number' ? normalizePrice(patch.basePrice) : product.basePrice,
    specSizes: resolvedSelections.specSizes,
    layers: resolvedSelections.layers,
    creamTypes: resolvedSelections.creamTypes,
    creamType: resolvedSelections.creamType,
    enabledConfigIdsByTier,
    priceAdjustmentsByConfigId,
    sizePriceAdjustments,
    layerPriceAdjustments,
    creamPriceAdjustments,
    imageUrls,
    coverImage: resolveCoverImage(imageUrls, patch.coverImage ?? product.coverImage),
    updatedAt: now.toISOString(),
  }
  const nextProduct: MerchantProductRecord = {
    ...draftProduct,
    basePrice: recalculateBasePrice(draftProduct, resolvedPricingSnapshot),
  }

  saveMerchantProductSnapshot(storage, replaceProductAt(products, index, nextProduct))
  return nextProduct
}

export function deleteMerchantProduct(
  storage: MerchantProductStorageLike,
  productId: string,
  createNow?: () => Date,
): MerchantProductRecord {
  const now = resolveNow(createNow)
  const products = loadStoredMerchantProducts(storage, createNow)
  const { product, index } = requireProduct(products, productId)
  if (product.recycleMeta !== undefined) {
    return product
  }

  const nextProduct: MerchantProductRecord = {
    ...product,
    recycleMeta: buildRecycleMeta(now),
    updatedAt: now.toISOString(),
  }

  saveMerchantProductSnapshot(storage, replaceProductAt(products, index, nextProduct))
  return nextProduct
}

export function restoreMerchantProduct(
  storage: MerchantProductStorageLike,
  productId: string,
  createNow?: () => Date,
): MerchantProductRecord {
  const now = resolveNow(createNow)
  const products = loadStoredMerchantProducts(storage, createNow)
  const { product, index } = requireProduct(products, productId)
  if (product.recycleMeta === undefined) {
    return product
  }

  if (isRecycleExpired(product.recycleMeta, now)) {
    throw new Error(`Product "${productId}" recycle window expired`)
  }

  const nextProduct: MerchantProductRecord = {
    ...product,
    recycleMeta: undefined,
    updatedAt: now.toISOString(),
  }

  saveMerchantProductSnapshot(storage, replaceProductAt(products, index, nextProduct))
  return nextProduct
}

export function deleteRecycledMerchantProduct(
  storage: MerchantProductStorageLike,
  productId: string,
  createNow?: () => Date,
): MerchantProductRecord | null {
  const products = loadStoredMerchantProducts(storage, createNow)
  const { product } = requireProduct(products, productId)
  if (product.recycleMeta === undefined) {
    return null
  }

  const nextProducts = products.filter((item) => item.id !== productId)
  saveMerchantProductSnapshot(storage, nextProducts)
  ensureProductIdCounter(storage, resolveMaxProductSequence(nextProducts))

  return product
}

export function batchEditMerchantProducts(
  storage: MerchantProductStorageLike,
  input: MerchantProductBatchEditInput,
  createNow?: () => Date,
  pricingSnapshot?: MerchantDefaultPricingSnapshot,
): MerchantProductRecord[] {
  const now = resolveNow(createNow)
  const resolvedPricingSnapshot = pricingSnapshot ?? loadStoredMerchantDefaultPricing(storage)
  const products = loadStoredMerchantProducts(storage, createNow)
  const targetIds = new Set(input.productIds)
  const patchedBasePrice = typeof input.basePrice === 'number' ? input.basePrice : input.unifiedPrice
  const hasPricePatch = typeof patchedBasePrice === 'number'
  const hasSpecPatch = input.specSizes !== undefined
  const hasLayerPatch = input.layers !== undefined
  const hasEnabledConfigPatch = input.enabledConfigIdsByTier !== undefined
  const hasConfigAdjustmentPatch = input.priceAdjustmentsByConfigId !== undefined
  const hasSizeAdjustmentPatch = input.sizePriceAdjustments !== undefined
  const hasLayerAdjustmentPatch = input.layerPriceAdjustments !== undefined
  const hasCreamAdjustmentPatch = input.creamPriceAdjustments !== undefined

  const nextProducts = products.map((product) => {
    if (product.recycleMeta !== undefined || !targetIds.has(product.id)) {
      return product
    }

    const creamTypes = input.creamTypes !== undefined
      ? normalizeCreamTypes(input.creamTypes, input.creamType)
      : input.creamType !== undefined
        ? normalizeCreamTypes([], input.creamType)
        : product.creamTypes

    const nextSpecSizes = hasSpecPatch ? normalizeSpecSizes(input.specSizes) : product.specSizes
    const nextLayers = hasLayerPatch ? normalizeLayers(input.layers) : product.layers
    const nextEnabledConfigIdsByTier = hasEnabledConfigPatch
      ? buildEnabledConfigIdsByTierFromIds(
          [
            ...normalizeEnabledConfigIdsByTier(input.enabledConfigIdsByTier).single,
            ...normalizeEnabledConfigIdsByTier(input.enabledConfigIdsByTier).double,
            ...normalizeEnabledConfigIdsByTier(input.enabledConfigIdsByTier).triple,
          ],
          resolvedPricingSnapshot,
        )
      : filterEnabledConfigIdsByCompatibleItems(
          product.enabledConfigIdsByTier,
          {
            ...product,
            specSizes: nextSpecSizes,
            layers: nextLayers,
            creamTypes,
          },
          resolvedPricingSnapshot,
        )
    const resolvedSelections = resolveSelectionsFromEnabledConfigIds(
      nextEnabledConfigIdsByTier,
      resolvedPricingSnapshot,
      nextSpecSizes,
      nextLayers,
      creamTypes,
      input.creamType ?? product.creamType,
    )
    const nextConfigAdjustments = filterConfigAdjustmentsByEnabledIds(
      hasConfigAdjustmentPatch
        ? normalizeConfigAdjustmentMap(input.priceAdjustmentsByConfigId)
        : product.priceAdjustmentsByConfigId,
      nextEnabledConfigIdsByTier,
    )

    const patchedProduct: MerchantProductRecord = {
      ...product,
      basePrice: hasPricePatch ? normalizePrice(patchedBasePrice ?? product.basePrice) : product.basePrice,
      specSizes: resolvedSelections.specSizes,
      layers: resolvedSelections.layers,
      creamTypes: resolvedSelections.creamTypes,
      creamType: resolvedSelections.creamType,
      enabledConfigIdsByTier: nextEnabledConfigIdsByTier,
      priceAdjustmentsByConfigId: nextConfigAdjustments,
      sizePriceAdjustments: hasSizeAdjustmentPatch
        ? normalizePriceAdjustmentMap(input.sizePriceAdjustments, VALID_SPEC_SIZES)
        : product.sizePriceAdjustments,
      layerPriceAdjustments: hasLayerAdjustmentPatch
        ? normalizePriceAdjustmentMap(input.layerPriceAdjustments, VALID_LAYERS)
        : product.layerPriceAdjustments,
      creamPriceAdjustments: hasCreamAdjustmentPatch
        ? normalizePriceAdjustmentMap(input.creamPriceAdjustments, VALID_CREAM_TYPES)
        : product.creamPriceAdjustments,
      updatedAt: now.toISOString(),
    }

    return {
      ...patchedProduct,
      basePrice: recalculateBasePrice(patchedProduct, resolvedPricingSnapshot),
    }
  })

  saveMerchantProductSnapshot(storage, nextProducts)
  ensureProductIdCounter(storage, resolveMaxProductSequence(nextProducts))

  return nextProducts
}
