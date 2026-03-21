import type {
  MerchantCreamType,
  MerchantProductBatchEditInput,
  MerchantProductDraftInput,
  MerchantProductLayer,
  MerchantProductPriceAdjustmentMap,
  MerchantProductRecord,
  MerchantProductRecycleMeta,
} from '../../types/merchant-product'
import type { ProductSpecSize } from '../../types/product'
import { CUSTOMER_CAKES } from '../mock/customer-cakes'

export const MERCHANT_PRODUCT_STORAGE_KEY = 'merchant-products-v1'
export const MERCHANT_PRODUCT_ID_COUNTER_KEY = 'merchant-product-id-counter-v1'
const RECYCLE_RETENTION_MS = 7 * 24 * 60 * 60 * 1000
const VALID_SPEC_SIZES: ProductSpecSize[] = ['6-inch', '8-inch', '10-inch', '12-inch', '14-inch', '16-inch']
const VALID_LAYERS: MerchantProductLayer[] = [
  '1-layer',
  '2-layer',
  '3-layer',
  '4-layer',
  '5-layer',
  '6-layer',
  '7-layer',
  '8-layer',
  '9-layer',
  '10-layer',
]
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
    sizePriceAdjustments: {},
    layerPriceAdjustments: {},
    creamPriceAdjustments: {},
    imageUrls: [cake.coverImage],
    coverImage: cake.coverImage,
    createdAt: nowText,
    updatedAt: nowText,
  }))
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
): number {
  return (
    normalizePrice(product.basePrice) +
    resolvePriceAdjustment(product.sizePriceAdjustments, size) +
    resolvePriceAdjustment(product.layerPriceAdjustments, layer) +
    resolvePriceAdjustment(product.creamPriceAdjustments, creamType)
  )
}

export function resolveMerchantProductMinSalePrice(product: MerchantProductRecord): number {
  const sizes: ProductSpecSize[] = product.specSizes.length > 0 ? product.specSizes : ['6-inch']
  const layers: MerchantProductLayer[] = product.layers.length > 0 ? product.layers : [DEFAULT_LAYER]
  const creamTypes: MerchantCreamType[] = product.creamTypes.length > 0 ? product.creamTypes : [DEFAULT_CREAM_TYPE]
  let minPrice = Number.POSITIVE_INFINITY

  sizes.forEach((size) => {
    layers.forEach((layer) => {
      creamTypes.forEach((creamType) => {
        minPrice = Math.min(minPrice, resolveMerchantProductSalePrice(product, size, layer, creamType))
      })
    })
  })

  return Number.isFinite(minPrice) ? minPrice : normalizePrice(product.basePrice)
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

export function loadStoredMerchantProducts(
  storage: MerchantProductStorageLike = resolveDefaultStorage(),
  createNow?: () => Date,
): MerchantProductRecord[] {
  const now = resolveNow(createNow)
  const products = loadProductsWithSeed(storage, createNow)
  const normalizedResult = normalizeProductIds(products, storage)
  const retainedProducts = persistRetainedProducts(storage, normalizedResult.products, now)

  if (normalizedResult.changed || retainedProducts.length !== products.length) {
    saveMerchantProductSnapshot(storage, retainedProducts)
  }

  ensureProductIdCounter(storage, resolveMaxProductSequence(retainedProducts))

  return retainedProducts
}

export function createMerchantProduct(
  storage: MerchantProductStorageLike,
  input: MerchantProductDraftInput,
  createNow?: () => Date,
): MerchantProductRecord {
  const now = resolveNow(createNow)
  const nowText = now.toISOString()
  const products = loadStoredMerchantProducts(storage, createNow)
  const imageUrls = normalizeImageUrls(input.imageUrls, input.coverImage)
  const layers = normalizeLayers(input.layers)
  const creamTypes = normalizeCreamTypes(input.creamTypes, input.creamType)
  const sizePriceAdjustments = normalizePriceAdjustmentMap(input.sizePriceAdjustments, VALID_SPEC_SIZES)
  const layerPriceAdjustments = normalizePriceAdjustmentMap(input.layerPriceAdjustments, VALID_LAYERS)
  const creamPriceAdjustments = normalizePriceAdjustmentMap(input.creamPriceAdjustments, VALID_CREAM_TYPES)

  const nextProduct: MerchantProductRecord = {
    id: resolveNextProductId(storage, products),
    title: input.title.trim(),
    description: input.description.trim(),
    basePrice: normalizePrice(input.basePrice),
    specSizes: normalizeSpecSizes(input.specSizes),
    layers,
    creamTypes,
    creamType: resolvePrimaryCreamType(creamTypes, input.creamType),
    sizePriceAdjustments,
    layerPriceAdjustments,
    creamPriceAdjustments,
    imageUrls,
    coverImage: resolveCoverImage(imageUrls, input.coverImage),
    createdAt: nowText,
    updatedAt: nowText,
  }

  saveMerchantProductSnapshot(storage, [nextProduct, ...products])

  return nextProduct
}

export function updateMerchantProduct(
  storage: MerchantProductStorageLike,
  productId: string,
  patch: Partial<MerchantProductDraftInput>,
  createNow?: () => Date,
): MerchantProductRecord {
  const now = resolveNow(createNow)
  const products = loadStoredMerchantProducts(storage, createNow)
  const { product, index } = requireProduct(products, productId)
  if (product.recycleMeta !== undefined) {
    throw new Error(`Product "${productId}" is in recycle bin`)
  }

  const creamTypes = resolvePatchedCreamTypes(product, patch)
  const layers = resolvePatchedLayers(product, patch)
  const imageUrls = resolvePatchedImageUrls(product, patch)
  const sizePriceAdjustments = resolvePatchedSizePriceAdjustments(product, patch)
  const layerPriceAdjustments = resolvePatchedLayerPriceAdjustments(product, patch)
  const creamPriceAdjustments = resolvePatchedCreamPriceAdjustments(product, patch)

  const nextProduct: MerchantProductRecord = {
    ...product,
    title: typeof patch.title === 'string' ? patch.title.trim() : product.title,
    description: typeof patch.description === 'string' ? patch.description.trim() : product.description,
    basePrice: typeof patch.basePrice === 'number' ? normalizePrice(patch.basePrice) : product.basePrice,
    specSizes: patch.specSizes !== undefined ? normalizeSpecSizes(patch.specSizes) : product.specSizes,
    layers,
    creamTypes,
    creamType: resolvePrimaryCreamType(creamTypes, patch.creamType ?? product.creamType),
    sizePriceAdjustments,
    layerPriceAdjustments,
    creamPriceAdjustments,
    imageUrls,
    coverImage: resolveCoverImage(imageUrls, patch.coverImage ?? product.coverImage),
    updatedAt: now.toISOString(),
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

export function batchEditMerchantProducts(
  storage: MerchantProductStorageLike,
  input: MerchantProductBatchEditInput,
  createNow?: () => Date,
): MerchantProductRecord[] {
  const now = resolveNow(createNow)
  const products = loadStoredMerchantProducts(storage, createNow)
  const targetIds = new Set(input.productIds)
  const patchedBasePrice = typeof input.basePrice === 'number' ? input.basePrice : input.unifiedPrice
  const hasPricePatch = typeof patchedBasePrice === 'number'
  const hasSpecPatch = input.specSizes !== undefined
  const hasLayerPatch = input.layers !== undefined
  const hasCreamPatch = input.creamTypes !== undefined || input.creamType !== undefined
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

    const nextLayers = hasLayerPatch ? normalizeLayers(input.layers) : product.layers

    return {
      ...product,
      basePrice: hasPricePatch ? normalizePrice(patchedBasePrice ?? product.basePrice) : product.basePrice,
      specSizes: hasSpecPatch ? normalizeSpecSizes(input.specSizes) : product.specSizes,
      layers: nextLayers,
      creamTypes,
      creamType: hasCreamPatch ? resolvePrimaryCreamType(creamTypes, input.creamType) : product.creamType,
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
  })

  saveMerchantProductSnapshot(storage, nextProducts)
  ensureProductIdCounter(storage, resolveMaxProductSequence(nextProducts))

  return nextProducts
}
