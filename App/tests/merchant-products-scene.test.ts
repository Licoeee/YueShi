import assert from 'node:assert/strict'
import fs from 'node:fs'
import { createRequire } from 'node:module'
import path from 'node:path'
import test from 'node:test'

import {
  createMemoryMerchantDefaultPricingStorage,
  loadStoredMerchantDefaultPricing,
  updateMerchantDefaultPricingItemPrice,
} from '../miniprogram/utils/merchant-default-pricing-storage'
import { MERCHANT_PRODUCT_ID_COUNTER_KEY } from '../miniprogram/utils/merchant-product-storage'
import { workspaceRoot } from './test-workspace-root'

const requireModule = createRequire(import.meta.url)

function readWorkspaceFile(relativePath: string): string {
  return fs.readFileSync(path.join(workspaceRoot, relativePath), 'utf8')
}

type GenericDataRecord = Record<string, unknown>
type ComponentMethod = (this: ComponentHarnessInstance, ...args: unknown[]) => unknown

interface CapturedComponentDefinition {
  data: GenericDataRecord
  methods: Record<string, ComponentMethod>
}

interface ComponentHarnessInstance {
  data: GenericDataRecord
  setData(patch: GenericDataRecord): void
  [key: string]: unknown
}

interface WxProductsStorageLike {
  getStorageSync(key: string): unknown
  setStorageSync(key: string, value: unknown): void
  showToast(options: { title: string; icon: 'none' | 'success' }): void
  chooseMedia(options: unknown): void
  previewImage(options: unknown): void
}

function deepClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

function createProductsSceneHarness(wxMock: WxProductsStorageLike): {
  instance: ComponentHarnessInstance
  cleanup: () => void
} {
  const globalTarget = globalThis as typeof globalThis & {
    Component?: (options: unknown) => void
    wx?: unknown
  }
  const previousComponent = globalTarget.Component
  const previousWx = globalTarget.wx
  let captured: CapturedComponentDefinition | null = null

  globalTarget.Component = (options: unknown): void => {
    captured = options as CapturedComponentDefinition
  }
  globalTarget.wx = wxMock

  const modulePath = path.join(workspaceRoot, 'App/miniprogram/components/merchant-products-scene/merchant-products-scene.ts')
  const resolvedPath = requireModule.resolve(modulePath)
  delete requireModule.cache[resolvedPath]
  requireModule(resolvedPath)

  if (captured === null) {
    globalTarget.Component = previousComponent
    globalTarget.wx = previousWx
    throw new Error('Failed to capture merchant-products-scene component definition')
  }

  const instance: ComponentHarnessInstance = {
    data: deepClone(captured.data),
    setData(patch: GenericDataRecord): void {
      this.data = {
        ...this.data,
        ...patch,
      }
    },
  }

  Object.entries(captured.methods).forEach(([methodName, method]) => {
    instance[methodName] = method.bind(instance)
  })

  return {
    instance,
    cleanup: (): void => {
      globalTarget.Component = previousComponent
      globalTarget.wx = previousWx
    },
  }
}

test('role-page-scene mounts merchant products business scene', () => {
  const source = readWorkspaceFile('App/miniprogram/components/role-page-scene/role-page-scene.wxml')

  assert.match(source, /<merchant-products-scene/)
})

test('merchant products scene includes waterfall cards, batch actions, and recycle popup', () => {
  const wxml = readWorkspaceFile('App/miniprogram/components/merchant-products-scene/merchant-products-scene.wxml')

  assert.match(wxml, /新增商品/)
  assert.match(wxml, /回收站/)
  assert.match(wxml, /批量编辑/)
  assert.match(wxml, /退出编辑/)
  assert.match(wxml, /ID \{\{item.id\}\}/)
  assert.match(wxml, /t-popup/)
  assert.match(wxml, /上传图片/)
  assert.match(wxml, /奶油类型/)
})

test('merchant products scene renders multi-select cream controls and multi-image preview rail', () => {
  const wxml = readWorkspaceFile('App/miniprogram/components/merchant-products-scene/merchant-products-scene.wxml')
  const source = readWorkspaceFile('App/miniprogram/components/merchant-products-scene/merchant-products-scene.ts')

  assert.match(wxml, /t-checkbox-group value="\{\{productCreamTypes\}\}"/)
  assert.match(source, /label: '裸蛋糕'/)
  assert.match(wxml, /productImageUrls/)
  assert.match(wxml, /设为首图/)
  assert.match(source, /handlePreviewProductImage/)
  assert.match(source, /handleRemoveProductImage/)
  assert.match(source, /handleSetPrimaryProductImage/)
})

test('merchant products scene renders layer selection default pricing groups and select-all controls', () => {
  const wxml = readWorkspaceFile('App/miniprogram/components/merchant-products-scene/merchant-products-scene.wxml')
  const source = readWorkspaceFile('App/miniprogram/components/merchant-products-scene/merchant-products-scene.ts')
  const types = readWorkspaceFile('App/types/merchant-product.d.ts')

  assert.match(wxml, /默认价格参考/)
  assert.match(wxml, /层数选择/)
  assert.match(source, /PRICING_GROUP_LABEL_MAP/)
  assert.match(source, /single: '单层加价'/)
  assert.match(source, /double: '双层加价'/)
  assert.match(source, /triple: '三层加价'/)
  assert.match(wxml, /handleToggleAllSpecSizes/)
  assert.match(wxml, /handleToggleAllLayers/)
  assert.match(wxml, /handleToggleAllCreamTypes/)
  assert.match(types, /type MerchantProductLayer =/)
  assert.match(source, /handleProductLayerChange/)
})

test('merchant products scene uses themed validation dialog and required marks instead of toast-only validation', () => {
  const wxml = readWorkspaceFile('App/miniprogram/components/merchant-products-scene/merchant-products-scene.wxml')
  const wxss = readWorkspaceFile('App/miniprogram/components/merchant-products-scene/merchant-products-scene.wxss')
  const source = readWorkspaceFile('App/miniprogram/components/merchant-products-scene/merchant-products-scene.ts')

  assert.match(wxml, /merchant-products-scene__required-mark/)
  assert.match(wxml, /validationDialogVisible/)
  assert.match(wxml, /merchant-products-scene__dialog-shell/)
  assert.match(wxss, /\.merchant-products-scene__required-mark/)
  assert.match(wxss, /\.merchant-products-scene__dialog-shell/)
  assert.match(source, /collectMissingRequiredFields/)
  assert.match(source, /validationMissingFields/)
})

test('merchant products scene exposes two action rows and a search input', () => {
  const wxml = readWorkspaceFile('App/miniprogram/components/merchant-products-scene/merchant-products-scene.wxml')

  assert.match(wxml, /merchant-products-scene__action-grid/)
  assert.match(wxml, /merchant-products-scene__action-row merchant-products-scene__action-row--primary/)
  assert.match(wxml, /merchant-products-scene__action-row merchant-products-scene__action-row--secondary/)
  assert.match(wxml, /placeholder="搜索商品名称、ID、规格"/)
})

test('merchant products scene uses a single controlled search clear action and no built-in clearable icon', () => {
  const wxml = readWorkspaceFile('App/miniprogram/components/merchant-products-scene/merchant-products-scene.wxml')
  const source = readWorkspaceFile('App/miniprogram/components/merchant-products-scene/merchant-products-scene.ts')

  assert.match(wxml, /merchant-products-scene__search-clear/)
  assert.match(source, /handleClearProductSearch/)
  assert.doesNotMatch(wxml, /clearable="\{\{true\}\}"/)
})

test('merchant products scene keeps waterfall layout outside checkbox-group wrapper', () => {
  const wxml = readWorkspaceFile('App/miniprogram/components/merchant-products-scene/merchant-products-scene.wxml')

  assert.doesNotMatch(wxml, /<t-checkbox-group wx:else value="\{\{selectedProductIds\}\}" bind:change="handleBatchSelectionChange">/)
  assert.match(wxml, /class="merchant-products-scene__waterfall"/)
  assert.match(wxml, /class="merchant-products-scene__selection"/)
})

test('merchant products scene separates toolbar button sizing from card actions', () => {
  const wxml = readWorkspaceFile('App/miniprogram/components/merchant-products-scene/merchant-products-scene.wxml')
  const wxss = readWorkspaceFile('App/miniprogram/components/merchant-products-scene/merchant-products-scene.wxss')

  assert.match(wxml, /merchant-products-scene__toolbar-btn/)
  assert.match(wxml, /merchant-products-scene__card-btn/)
  assert.match(wxss, /\.merchant-products-scene__toolbar-btn/)
  assert.match(wxss, /\.merchant-products-scene__card-btn/)
})

test('merchant products scene keeps edit delete actions in a stable action rail', () => {
  const wxml = readWorkspaceFile('App/miniprogram/components/merchant-products-scene/merchant-products-scene.wxml')
  const wxss = readWorkspaceFile('App/miniprogram/components/merchant-products-scene/merchant-products-scene.wxss')

  assert.match(wxml, /merchant-products-scene__card-actions/)
  assert.match(wxml, /merchant-products-scene__card-action-cell/)
  assert.match(wxml, /merchant-products-scene__card-action-shell/)
  assert.match(wxss, /\.merchant-products-scene__card-action-cell/)
  assert.match(wxss, /\.merchant-products-scene__card-action-shell/)
})

test('merchant products scene uses consistent round selection controls and scrollable popup body', () => {
  const wxml = readWorkspaceFile('App/miniprogram/components/merchant-products-scene/merchant-products-scene.wxml')
  const wxss = readWorkspaceFile('App/miniprogram/components/merchant-products-scene/merchant-products-scene.wxss')

  assert.match(wxml, /handleToggleProductSelection/)
  assert.match(wxml, /icon="\{\{selectionCircleIcons\}\}"/)
  assert.match(wxml, /scroll-view class="merchant-products-scene__popup-scroll" scroll-y/)
  assert.match(wxml, /class="merchant-products-scene__popup-shell/)
  assert.match(wxss, /\.merchant-products-scene__popup-shell/)
  assert.match(wxss, /\.merchant-products-scene__popup-scroll/)
})

test('merchant products recycle popup exposes clickable permanent delete and themed danger dialog', () => {
  const wxml = readWorkspaceFile('App/miniprogram/components/merchant-products-scene/merchant-products-scene.wxml')
  const source = readWorkspaceFile('App/miniprogram/components/merchant-products-scene/merchant-products-scene.ts')

  assert.match(wxml, /永久删除/)
  assert.doesNotMatch(wxml, /disabled="\{\{true\}\}"/)
  assert.match(wxml, /handleDeleteRecycleProductPermanently/)
  assert.match(wxml, /merchant-products-scene__dialog-shell/)
  assert.doesNotMatch(wxml, /<t-dialog/)
  assert.match(source, /pendingRecycleDeleteProductId/)
})

test('merchant products scene drives pricing from default pricing groups instead of raw dimension adjustments', () => {
  const wxml = readWorkspaceFile('App/miniprogram/components/merchant-products-scene/merchant-products-scene.wxml')
  const source = readWorkspaceFile('App/miniprogram/components/merchant-products-scene/merchant-products-scene.ts')
  const types = readWorkspaceFile('App/types/merchant-product.d.ts')

  assert.match(wxml, /默认价格参考/)
  assert.match(source, /buildPricingGroups/)
  assert.match(source, /priceAdjustmentsByConfigId/)
  assert.match(source, /handleProductConfigPriceChange/)
  assert.match(source, /priceAdjustmentsByConfigId/)
  assert.match(types, /priceAdjustmentsByConfigId/)
  assert.doesNotMatch(wxml, /尺寸加价/)
  assert.doesNotMatch(wxml, /层数加价/)
  assert.doesNotMatch(wxml, /奶油加价/)
})

test('merchant products scene rebuilds visible products with explicit keyword patch on search clear', () => {
  const source = readWorkspaceFile('App/miniprogram/components/merchant-products-scene/merchant-products-scene.ts')

  assert.match(source, /handleProductSearchChange\([\s\S]*productSearchKeyword[\s\S]*buildVisibleProductPatch\(this\.data\.activeProducts, productSearchKeyword\)/)
  assert.match(source, /handleClearProductSearch\(\): void[\s\S]*productSearchKeyword:\s*''[\s\S]*buildVisibleProductPatch\(this\.data\.activeProducts, ''\)/)
})

test('merchant products scene uses tier-scoped enabled config state instead of a single flat pricing group model', () => {
  const wxml = readWorkspaceFile('App/miniprogram/components/merchant-products-scene/merchant-products-scene.wxml')
  const source = readWorkspaceFile('App/miniprogram/components/merchant-products-scene/merchant-products-scene.ts')
  const types = readWorkspaceFile('App/types/merchant-product.d.ts')

  assert.match(wxml, /merchant-products-scene__tier-block/)
  assert.match(source, /productEnabledConfigIdsByTier/)
  assert.match(source, /handleToggleTierConfigItem/)
  assert.match(source, /handleToggleBatchTierConfigItem/)
  assert.match(types, /enabledConfigIdsByTier/)
  assert.match(types, /single:\s*string\[\]/)
  assert.match(types, /double:\s*string\[\]/)
  assert.match(types, /triple:\s*string\[\]/)
})

test('merchant products scene uses a multi-phase batch edit state machine', () => {
  const source = readWorkspaceFile('App/miniprogram/components/merchant-products-scene/merchant-products-scene.ts')

  assert.match(source, /type BatchEditPhase = 'idle' \| 'selecting' \| 'editing'/)
  assert.match(source, /batchEditPhase/)
  assert.match(source, /productSearchKeyword/)
  assert.match(source, /handleBatchEditTrigger/)
  assert.match(source, /handleExitBatchEdit/)
  assert.doesNotMatch(source, /batchEditMode/)
})

test('merchant products scene uses storage helpers for CRUD, batch edit, and id counter', () => {
  const source = readWorkspaceFile('App/miniprogram/components/merchant-products-scene/merchant-products-scene.ts')
  const json = readWorkspaceFile('App/miniprogram/components/merchant-products-scene/merchant-products-scene.json')

  assert.match(source, /MERCHANT_PRODUCT_ID_COUNTER_KEY/)
  assert.match(source, /createMerchantProduct/)
  assert.match(source, /updateMerchantProduct/)
  assert.match(source, /deleteMerchantProduct/)
  assert.match(source, /batchEditMerchantProducts/)
  assert.match(source, /restoreMerchantProduct/)
  assert.match(json, /"t-popup":\s*"tdesign-miniprogram\/popup\/popup"/)
  assert.doesNotMatch(json, /"t-dialog":/)
})

test('merchant products scene keeps recycle confirmation separate from recycle popup and uses saved default pricing for card summary', () => {
  const pricingStorage = createMemoryMerchantDefaultPricingStorage()
  loadStoredMerchantDefaultPricing(pricingStorage)
  updateMerchantDefaultPricingItemPrice(pricingStorage, 'single-6-inch-dairy-cream', 100)
  const pricingSnapshot = loadStoredMerchantDefaultPricing(pricingStorage)

  const storageState: Record<string, unknown> = {
    'merchant-default-pricing-v1': JSON.stringify(pricingSnapshot),
    'merchant-products-v1': JSON.stringify([
      {
        id: 'A001',
        title: '默认价蛋糕',
        description: '用于验证卡片价格',
        basePrice: 100,
        specSizes: ['6-inch'],
        layers: ['1-layer'],
        creamTypes: ['dairy-cream'],
        creamType: 'dairy-cream',
        priceAdjustmentsByConfigId: {
          'single-6-inch-dairy-cream': 0,
        },
        sizePriceAdjustments: {},
        layerPriceAdjustments: {},
        creamPriceAdjustments: {},
        imageUrls: ['/tmp/a.png'],
        coverImage: '/tmp/a.png',
        createdAt: '2026-03-21T10:00:00.000Z',
        updatedAt: '2026-03-21T10:00:00.000Z',
        recycleMeta: {
          deletedAt: '2026-03-21T10:30:00.000Z',
          recoverExpiresAt: '2026-03-28T10:30:00.000Z',
        },
      },
    ]),
    [MERCHANT_PRODUCT_ID_COUNTER_KEY]: '1',
  }

  const wxMock: WxProductsStorageLike = {
    getStorageSync(key: string): unknown {
      return storageState[key]
    },
    setStorageSync(key: string, value: unknown): void {
      storageState[key] = value
    },
    showToast(): void {},
    chooseMedia(): void {},
    previewImage(): void {},
  }

  const { instance, cleanup } = createProductsSceneHarness(wxMock)

  try {
    ;(instance.syncProducts as () => void)()

    const recycleProducts = instance.data.recycleProducts as Array<{ priceSummary: string; id: string }>
    assert.equal(recycleProducts[0]?.priceSummary, '¥100 起')

    instance.setData({
      recyclePopupVisible: true,
    })

    ;(instance.handleDeleteRecycleProductPermanently as (event: unknown) => void)({
      currentTarget: {
        dataset: {
          productId: 'A001',
        },
      },
    })

    assert.equal(instance.data.confirmDialogVisible, true)
    assert.equal(instance.data.confirmDialogMode, 'delete-recycle-product')
    assert.equal(instance.data.recyclePopupVisible, false)
  } finally {
    cleanup()
  }
})
