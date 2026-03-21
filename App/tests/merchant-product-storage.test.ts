import assert from 'node:assert/strict'
import test from 'node:test'

import type { MerchantProductLayer, MerchantProductRecord } from '../types/merchant-product'
import {
  MERCHANT_PRODUCT_ID_COUNTER_KEY,
  batchEditMerchantProducts,
  createMemoryMerchantProductStorage,
  createMerchantProduct,
  deleteMerchantProduct,
  loadMerchantProductSnapshot,
  loadStoredMerchantProducts,
  resolveMerchantProductSalePrice,
  restoreMerchantProduct,
  splitMerchantProductsByRecycleState,
  updateMerchantProduct,
} from '../miniprogram/utils/merchant-product-storage'

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

test('merchant product storage resolves sale price from base price and dimension adjustments', () => {
  const product: MerchantProductRecord = {
    ...createProductSeed('A009'),
    basePrice: 168,
    specSizes: ['6-inch', '8-inch'],
    layers: ['1-layer', '2-layer'],
    creamTypes: ['dairy-cream', 'animal-cream-i'],
    sizePriceAdjustments: { '8-inch': 36 },
    layerPriceAdjustments: { '2-layer': 88 },
    creamPriceAdjustments: { 'animal-cream-i': 20 },
  }

  assert.equal(resolveMerchantProductSalePrice(product, '6-inch', '1-layer', 'dairy-cream'), 168)
  assert.equal(resolveMerchantProductSalePrice(product, '8-inch', '2-layer', 'animal-cream-i'), 312)
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
  )

  const productA = result.find((item) => item.id === 'A001')
  const productB = result.find((item) => item.id === 'A002')

  assert.equal(productA?.basePrice, 188)
  assert.equal(productB?.basePrice, 199)
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
