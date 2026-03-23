import assert from 'node:assert/strict'
import test from 'node:test'

import type { MerchantProductLayer, MerchantProductRecord } from '../types/merchant-product'
import {
  MERCHANT_PRODUCT_ID_COUNTER_KEY,
  batchEditMerchantProducts,
  createMemoryMerchantProductStorage,
  createMerchantProduct,
  deleteRecycledMerchantProduct,
  deleteMerchantProduct,
  loadMerchantProductSnapshot,
  loadStoredMerchantProducts,
  resolveMerchantProductConfiguredPrice,
  resolveMerchantProductSalePrice,
  restoreMerchantProduct,
  splitMerchantProductsByRecycleState,
  updateMerchantProduct,
} from '../miniprogram/utils/merchant-product-storage'
import { createMemoryMerchantDefaultPricingStorage, loadStoredMerchantDefaultPricing } from '../miniprogram/utils/merchant-default-pricing-storage'

function createNow(isoText: string): () => Date {
  return () => new Date(isoText)
}

function createProductSeed(id: string): MerchantProductRecord {
  return {
    id,
    title: `产品 ${id}`,
    description: '测试产品',
    basePrice: 188,
    specSizes: ['6-inch'],
    layers: ['1-layer'],
    creamTypes: ['dairy-cream'],
    creamType: 'dairy-cream',
    enabledConfigIdsByTier: {
      single: [],
      double: [],
      triple: [],
    },
    priceAdjustmentsByConfigId: {},
    sizePriceAdjustments: {},
    layerPriceAdjustments: {},
    creamPriceAdjustments: {},
    imageUrls: [],
    coverImage: '',
    createdAt: '2026-03-20T00:00:00.000Z',
    updatedAt: '2026-03-20T00:00:00.000Z',
  }
}

test('loadStoredMerchantProducts seeds products from customer catalog with A-sequence ids', () => {
  const storage = createMemoryMerchantProductStorage()
  const products = loadStoredMerchantProducts(storage)

  assert.equal(products.length > 0, true)
  assert.equal(products[0]?.id, 'A001')
  assert.equal(products.every((item) => /^A\d+$/.test(item.id)), true)
  assert.equal(Number(storage.snapshot[MERCHANT_PRODUCT_ID_COUNTER_KEY]) >= products.length, true)
})

test('createMerchantProduct and updateMerchantProduct persist merchant product edits with cream type', () => {
  const storage = createMemoryMerchantProductStorage()
  storage.setStorageSync('merchant-products-v1', JSON.stringify([createProductSeed('A001')]))
  storage.setStorageSync(MERCHANT_PRODUCT_ID_COUNTER_KEY, '1')

  const createdProduct = createMerchantProduct(
    storage,
    {
      title: '新上架蛋糕',
      description: '商家端新增',
      basePrice: 228,
      specSizes: ['6-inch', '8-inch'],
      creamTypes: ['animal-cream-i'],
      creamType: 'animal-cream-i',
      imageUrls: ['/assets/images/cakes/cloud-breeze.svg'],
      coverImage: '/assets/images/cakes/cloud-breeze.svg',
    },
    createNow('2026-03-20T02:30:00.000Z'),
  )

  assert.equal(createdProduct.id, 'A002')
  assert.equal(createdProduct.creamType, 'animal-cream-i')

  const updatedProduct = updateMerchantProduct(
    storage,
    createdProduct.id,
    {
      title: '新上架蛋糕（已改）',
      basePrice: 238,
      creamTypes: ['dairy-cream'],
      creamType: 'dairy-cream',
    },
    createNow('2026-03-20T03:30:00.000Z'),
  )

  assert.equal(updatedProduct.title, '新上架蛋糕（已改）')
  assert.equal(updatedProduct.basePrice, 238)
  assert.equal(updatedProduct.creamType, 'dairy-cream')
})

test('merchant product storage supports extended sizes and multiple cream types', () => {
  const storage = createMemoryMerchantProductStorage()
  storage.setStorageSync('merchant-products-v1', JSON.stringify([createProductSeed('A001')]))
  storage.setStorageSync(MERCHANT_PRODUCT_ID_COUNTER_KEY, '1')

  const createdProduct = createMerchantProduct(
    storage,
    {
      title: '大尺寸多奶油蛋糕',
      description: '规格和奶油类型扩展',
      basePrice: 428,
      specSizes: ['10-inch', '12-inch', '14-inch', '16-inch'],
      layers: ['1-layer', '2-layer', '3-layer'],
      creamTypes: ['animal-cream-i', 'naked-cake'],
      creamType: 'animal-cream-i',
      sizePriceAdjustments: { '12-inch': 40, '14-inch': 90, '16-inch': 140 },
      layerPriceAdjustments: { '2-layer': 60, '3-layer': 120 },
      creamPriceAdjustments: { 'animal-cream-i': 18, 'naked-cake': 28 },
      imageUrls: ['/tmp/a.png'],
      coverImage: '/tmp/a.png',
    },
    createNow('2026-03-21T02:30:00.000Z'),
  )

  assert.deepEqual(createdProduct.specSizes, ['10-inch', '12-inch', '14-inch', '16-inch'])
  assert.deepEqual(createdProduct.layers, ['1-layer', '2-layer', '3-layer'])
  assert.deepEqual(createdProduct.creamTypes, ['animal-cream-i', 'naked-cake'])
  assert.equal(createdProduct.sizePriceAdjustments['14-inch'], 90)
  assert.equal(createdProduct.layerPriceAdjustments['3-layer'], 120)
  assert.equal(createdProduct.creamPriceAdjustments['naked-cake'], 28)
})

test('merchant product storage resolves sale price from default pricing and config surcharge', () => {
  const pricingStorage = createMemoryMerchantDefaultPricingStorage()
  const pricingSnapshot = loadStoredMerchantDefaultPricing(pricingStorage)
  const product: MerchantProductRecord = {
    ...createProductSeed('A009'),
    basePrice: 168,
    specSizes: ['6-inch', '8-inch'],
    layers: ['1-layer', '2-layer'],
    creamTypes: ['dairy-cream', 'animal-cream-i'],
    priceAdjustmentsByConfigId: {
      'single-6-inch-dairy-cream': 168,
      'single-8-inch-dairy-cream': 204,
      'double-10-inch-6-inch-animal-cream-i': 320,
    },
  }

  assert.equal(resolveMerchantProductSalePrice(product, '6-inch', '1-layer', 'dairy-cream', pricingSnapshot), 168)
  assert.equal(resolveMerchantProductConfiguredPrice(product, 'single-8-inch-dairy-cream', pricingSnapshot), 204)
})

test('merchant product storage persists enabled config ids across multiple tiers on the same product', () => {
  const storage = createMemoryMerchantProductStorage()
  const pricingStorage = createMemoryMerchantDefaultPricingStorage()
  const pricingSnapshot = loadStoredMerchantDefaultPricing(pricingStorage)
  const createdProductView = createMerchantProduct as unknown

  type MerchantMultiTierView = MerchantProductRecord & {
    enabledConfigIdsByTier?: {
      single?: string[]
      double?: string[]
      triple?: string[]
    }
  }

  const createdProduct = createdProductView(
    storage,
    {
      title: '多层级联动蛋糕',
      description: '同一商品支持多个层级',
      specSizes: ['6-inch', '8-inch', '10-inch'],
      layers: ['1-layer', '2-layer'],
      creamTypes: ['dairy-cream', 'animal-cream-i'],
      creamType: 'dairy-cream',
      enabledConfigIdsByTier: {
        single: ['single-6-inch-dairy-cream', 'single-8-inch-dairy-cream'],
        double: ['double-10-inch-6-inch-animal-cream-i'],
        triple: [],
      },
      priceAdjustmentsByConfigId: {
        'single-6-inch-dairy-cream': 0,
        'single-8-inch-dairy-cream': 12,
        'double-10-inch-6-inch-animal-cream-i': 24,
      },
      sizePriceAdjustments: {},
      layerPriceAdjustments: {},
      creamPriceAdjustments: {},
      imageUrls: ['/tmp/multi-tier.png'],
      coverImage: '/tmp/multi-tier.png',
    },
    createNow('2026-03-23T08:00:00.000Z'),
    pricingSnapshot,
  ) as MerchantMultiTierView

  assert.ok(createdProduct.enabledConfigIdsByTier)
  assert.deepEqual(createdProduct.enabledConfigIdsByTier.single, ['single-6-inch-dairy-cream', 'single-8-inch-dairy-cream'])
  assert.deepEqual(createdProduct.enabledConfigIdsByTier.double, ['double-10-inch-6-inch-animal-cream-i'])
  assert.deepEqual(createdProduct.enabledConfigIdsByTier.triple, [])

  const updatedProduct = updateMerchantProduct(
    storage,
    createdProduct.id,
    {
      enabledConfigIdsByTier: {
        single: ['single-6-inch-dairy-cream'],
        double: ['double-10-inch-6-inch-animal-cream-i'],
        triple: ['triple-12-inch-10-inch-6-inch-dairy-cream'],
      },
    },
    createNow('2026-03-23T08:30:00.000Z'),
    pricingSnapshot,
  ) as MerchantMultiTierView

  assert.ok(updatedProduct.enabledConfigIdsByTier)
  assert.deepEqual(updatedProduct.enabledConfigIdsByTier.single, ['single-6-inch-dairy-cream'])
  assert.deepEqual(updatedProduct.enabledConfigIdsByTier.double, ['double-10-inch-6-inch-animal-cream-i'])
  assert.deepEqual(updatedProduct.enabledConfigIdsByTier.triple, ['triple-12-inch-10-inch-6-inch-dairy-cream'])
})

test('merchant product storage keeps imageUrls and derives coverImage from the first image', () => {
  const storage = createMemoryMerchantProductStorage()
  storage.setStorageSync('merchant-products-v1', JSON.stringify([createProductSeed('A001')]))
  storage.setStorageSync(MERCHANT_PRODUCT_ID_COUNTER_KEY, '1')

  const createdProduct = createMerchantProduct(
    storage,
    {
      title: '多图蛋糕',
      description: '多图',
      basePrice: 298,
      specSizes: ['6-inch'],
      layers: ['1-layer'],
      creamTypes: ['dairy-cream'],
      creamType: 'dairy-cream',
      sizePriceAdjustments: {},
      layerPriceAdjustments: {},
      creamPriceAdjustments: {},
      imageUrls: ['/tmp/a.png', '/tmp/b.png', '/tmp/c.png'],
      coverImage: '/tmp/a.png',
    },
    createNow('2026-03-21T03:30:00.000Z'),
  )

  assert.deepEqual(createdProduct.imageUrls, ['/tmp/a.png', '/tmp/b.png', '/tmp/c.png'])
  assert.equal(createdProduct.coverImage, '/tmp/a.png')

  const updatedProduct = updateMerchantProduct(
    storage,
    createdProduct.id,
    {
      imageUrls: ['/tmp/b.png', '/tmp/c.png'],
      coverImage: '/tmp/b.png',
    },
    createNow('2026-03-21T04:30:00.000Z'),
  )

  assert.deepEqual(updatedProduct.imageUrls, ['/tmp/b.png', '/tmp/c.png'])
  assert.equal(updatedProduct.coverImage, '/tmp/b.png')
})

test('deleteMerchantProduct moves product into recycle bin and restoreMerchantProduct recovers within 7 days', () => {
  const storage = createMemoryMerchantProductStorage()
  const seedProduct = createProductSeed('A001')
  storage.setStorageSync('merchant-products-v1', JSON.stringify([seedProduct]))
  storage.setStorageSync(MERCHANT_PRODUCT_ID_COUNTER_KEY, '1')

  deleteMerchantProduct(storage, seedProduct.id, createNow('2026-03-20T02:30:00.000Z'))

  let snapshot = loadMerchantProductSnapshot(storage)
  let splitState = splitMerchantProductsByRecycleState(snapshot, new Date('2026-03-20T08:00:00.000Z'))
  assert.equal(splitState.activeProducts.length, 0)
  assert.equal(splitState.recycleProducts.length, 1)

  restoreMerchantProduct(storage, seedProduct.id, createNow('2026-03-21T02:30:00.000Z'))

  snapshot = loadMerchantProductSnapshot(storage)
  splitState = splitMerchantProductsByRecycleState(snapshot, new Date('2026-03-21T08:00:00.000Z'))
  assert.equal(splitState.activeProducts.length, 1)
  assert.equal(splitState.recycleProducts.length, 0)
})

test('splitMerchantProductsByRecycleState purges expired recycle records after 7 days', () => {
  const storage = createMemoryMerchantProductStorage()
  const expiredProduct: MerchantProductRecord = {
    ...createProductSeed('A001'),
    recycleMeta: {
      deletedAt: '2026-03-01T02:30:00.000Z',
      recoverExpiresAt: '2026-03-08T02:30:00.000Z',
    },
  }

  storage.setStorageSync('merchant-products-v1', JSON.stringify([expiredProduct]))
  storage.setStorageSync(MERCHANT_PRODUCT_ID_COUNTER_KEY, '1')

  const loadedProducts = loadStoredMerchantProducts(storage, createNow('2026-03-20T02:30:00.000Z'))

  assert.deepEqual(loadedProducts, [])
})

test('batchEditMerchantProducts applies unified price, spec sizes, and cream type', () => {
  const storage = createMemoryMerchantProductStorage()
  const pricingStorage = createMemoryMerchantDefaultPricingStorage()
  const pricingSnapshot = loadStoredMerchantDefaultPricing(pricingStorage)
  const products = [createProductSeed('A001'), createProductSeed('A002')]
  storage.setStorageSync('merchant-products-v1', JSON.stringify(products))
  storage.setStorageSync(MERCHANT_PRODUCT_ID_COUNTER_KEY, '2')

  const result = batchEditMerchantProducts(
    storage,
    {
      productIds: ['A002'],
      basePrice: 199,
      specSizes: ['6-inch', '8-inch', '10-inch', '12-inch'],
      layers: ['1-layer', '2-layer', '3-layer'] satisfies MerchantProductLayer[],
      creamTypes: ['animal-cream-i', 'naked-cake'],
      creamType: 'animal-cream-i',
      sizePriceAdjustments: { '8-inch': 12, '10-inch': 28, '12-inch': 66 },
      layerPriceAdjustments: { '2-layer': 58, '3-layer': 108 },
      creamPriceAdjustments: { 'animal-cream-i': 18, 'naked-cake': 30 },
    },
    createNow('2026-03-20T06:30:00.000Z'),
    pricingSnapshot,
  )

  const productA = result.find((item) => item.id === 'A001')
  const productB = result.find((item) => item.id === 'A002')

  assert.equal(productA?.basePrice, 188)
  assert.equal(productB?.basePrice, 217)
  assert.deepEqual(productB?.specSizes, ['6-inch', '8-inch', '10-inch', '12-inch'])
  assert.deepEqual(productB?.layers, ['1-layer', '2-layer', '3-layer'])
  assert.deepEqual(productB?.creamTypes, ['animal-cream-i', 'naked-cake'])
  assert.equal(productB?.creamType, 'animal-cream-i')
  assert.equal(productB?.sizePriceAdjustments['12-inch'], 66)
  assert.equal(productB?.layerPriceAdjustments['3-layer'], 108)
  assert.equal(productB?.creamPriceAdjustments['naked-cake'], 30)
})

test('product id counter does not reuse deleted ids across delete create restore flow', () => {
  const storage = createMemoryMerchantProductStorage()
  const products = [createProductSeed('A001'), createProductSeed('A002')]
  storage.setStorageSync('merchant-products-v1', JSON.stringify(products))
  storage.setStorageSync(MERCHANT_PRODUCT_ID_COUNTER_KEY, '2')

  deleteMerchantProduct(storage, 'A002', createNow('2026-03-20T01:00:00.000Z'))

  const created = createMerchantProduct(
    storage,
    {
      title: '新增蛋糕',
      description: '新增',
      basePrice: 168,
      specSizes: ['6-inch'],
      layers: ['1-layer'],
      creamTypes: ['dairy-cream'],
      creamType: 'dairy-cream',
      sizePriceAdjustments: {},
      layerPriceAdjustments: {},
      creamPriceAdjustments: {},
      imageUrls: [],
      coverImage: '',
    },
    createNow('2026-03-20T01:30:00.000Z'),
  )

  assert.equal(created.id, 'A003')

  restoreMerchantProduct(storage, 'A002', createNow('2026-03-20T02:00:00.000Z'))

  const ids = loadMerchantProductSnapshot(storage).map((item) => item.id)
  assert.equal(new Set(ids).size, ids.length)
})

test('merchant product storage restricts layers to 1/2/3 and resolves configured price from default pricing plus surcharge', () => {
  const storage = createMemoryMerchantProductStorage()
  const pricingStorage = createMemoryMerchantDefaultPricingStorage()
  const pricingSnapshot = loadStoredMerchantDefaultPricing(pricingStorage)

  const createdProduct = createMerchantProduct(
    storage,
    {
      title: '默认价格联动蛋糕',
      description: '联动测试',
      specSizes: ['6-inch', '10-inch'],
      layers: ['5-layer' as unknown as MerchantProductLayer],
      creamTypes: ['animal-cream-i'],
      creamType: 'animal-cream-i',
      priceAdjustmentsByConfigId: {
        'double-10-inch-6-inch-animal-cream-i': 10,
      },
      imageUrls: ['/tmp/linked.png'],
      coverImage: '/tmp/linked.png',
    },
    createNow('2026-03-21T08:00:00.000Z'),
    pricingSnapshot,
  )

  assert.deepEqual(createdProduct.layers, ['1-layer'])
  assert.equal(
    resolveMerchantProductConfiguredPrice(createdProduct, 'double-10-inch-6-inch-animal-cream-i', pricingSnapshot),
    10,
  )
})

test('deleteRecycledMerchantProduct physically removes recycle records without resetting id counter', () => {
  const storage = createMemoryMerchantProductStorage()
  const product = createProductSeed('A001')
  storage.setStorageSync('merchant-products-v1', JSON.stringify([product]))
  storage.setStorageSync(MERCHANT_PRODUCT_ID_COUNTER_KEY, '1')

  deleteMerchantProduct(storage, 'A001', createNow('2026-03-21T09:00:00.000Z'))
  deleteRecycledMerchantProduct(storage, 'A001', createNow('2026-03-21T09:30:00.000Z'))

  assert.deepEqual(loadMerchantProductSnapshot(storage), [])
  assert.equal(storage.snapshot[MERCHANT_PRODUCT_ID_COUNTER_KEY], '1')
})
