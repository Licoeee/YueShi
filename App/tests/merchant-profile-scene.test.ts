import assert from 'node:assert/strict'
import fs from 'node:fs'
import { createRequire } from 'node:module'
import path from 'node:path'
import test from 'node:test'

import {
  addMerchantDefaultPricingCustomItem,
  createMemoryMerchantDefaultPricingStorage,
  loadStoredMerchantDefaultPricing,
} from '../miniprogram/utils/merchant-default-pricing-storage'
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

interface WxLikeStorage {
  getStorageSync(key: string): unknown
  setStorageSync(key: string, value: unknown): void
  showToast(options: { title: string; icon: 'none' | 'success' }): void
  navigateTo(options: { url: string }): void
}

function deepClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

function createProfileSceneHarness(wxMock: WxLikeStorage): {
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

  const modulePath = path.join(workspaceRoot, 'App/miniprogram/components/merchant-profile-scene/merchant-profile-scene.ts')
  const resolvedPath = requireModule.resolve(modulePath)
  delete requireModule.cache[resolvedPath]
  requireModule(resolvedPath)

  if (captured === null) {
    globalTarget.Component = previousComponent
    globalTarget.wx = previousWx
    throw new Error('Failed to capture merchant-profile-scene component definition')
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

test('role-page-scene mounts merchant profile business scene', () => {
  const source = readWorkspaceFile('App/miniprogram/components/role-page-scene/role-page-scene.wxml')

  assert.match(source, /<merchant-profile-scene/)
})

test('merchant profile scene provides blacklist navigation entry', () => {
  const wxml = readWorkspaceFile('App/miniprogram/components/merchant-profile-scene/merchant-profile-scene.wxml')
  const source = readWorkspaceFile('App/miniprogram/components/merchant-profile-scene/merchant-profile-scene.ts')

  assert.match(wxml, /黑名单管理/)
  assert.match(source, /\/pages\/merchant\/blacklist\/blacklist/)
})

test('merchant profile scene renders default pricing groups and custom config dialog', () => {
  const wxml = readWorkspaceFile('App/miniprogram/components/merchant-profile-scene/merchant-profile-scene.wxml')
  const source = readWorkspaceFile('App/miniprogram/components/merchant-profile-scene/merchant-profile-scene.ts')

  assert.match(wxml, /默认价格/)
  assert.match(source, /single: '单层'/)
  assert.match(source, /double: '双层'/)
  assert.match(source, /triple: '三层'/)
  assert.match(wxml, /自定义/)
  assert.match(wxml, /尺寸（一层）|尺寸\\(一层\\)/)
  assert.match(source, /handleTogglePricingTier/)
  assert.match(source, /handleOpenCustomPricingDialog/)
})

test('merchant profile scene keeps pricing edits in draft until explicit save and accepts string dataset indexes for custom picker', () => {
  const storage = createMemoryMerchantDefaultPricingStorage()
  const wxMock: WxLikeStorage = {
    ...storage,
    showToast(): void {},
    navigateTo(): void {},
  }
  const { instance, cleanup } = createProfileSceneHarness(wxMock)

  try {
    ;(instance.syncSceneState as () => void)()

    const seededSnapshot = loadStoredMerchantDefaultPricing(storage)
    const targetItemId = seededSnapshot.single[0]?.id
    if (targetItemId === undefined) {
      throw new Error('Expected seeded default pricing item')
    }

    ;(instance.handlePricingInputChange as (event: unknown) => void)({
      currentTarget: {
        dataset: {
          itemId: targetItemId,
        },
      },
      detail: {
        value: '188',
      },
    })

    const snapshotAfterDraftChange = loadStoredMerchantDefaultPricing(storage)
    const storedItem = snapshotAfterDraftChange.single.find((item) => item.id === targetItemId)
    assert.equal(storedItem?.basePrice, 0)
    assert.equal(instance.data.pricingDraftDirty, true)

    ;(instance.handleOpenCustomPricingDialog as (event: unknown) => void)({
      currentTarget: {
        dataset: {
          tier: 'double',
        },
      },
    })

    ;(instance.handleCustomSizeChange as (event: unknown) => void)({
      currentTarget: {
        dataset: {
          index: '1',
        },
      },
      detail: {
        value: 4,
      },
    })

    assert.deepEqual(instance.data.customSizeIndexes, [2, 4])
  } finally {
    cleanup()
  }
})

test('merchant profile scene opens themed confirmation before deleting default pricing items', () => {
  const storage = createMemoryMerchantDefaultPricingStorage()
  const customItem = addMerchantDefaultPricingCustomItem(storage, {
    tier: 'single',
    sizes: ['16-inch'],
    creamType: 'animal-cream-i',
  })
  const wxMock: WxLikeStorage = {
    ...storage,
    showToast(): void {},
    navigateTo(): void {},
  }
  const { instance, cleanup } = createProfileSceneHarness(wxMock)

  try {
    ;(instance.syncSceneState as () => void)()

    ;(instance.handleDeletePricingItem as (event: unknown) => void)({
      currentTarget: {
        dataset: {
          itemId: customItem.id,
        },
      },
    })

    const storedSnapshot = loadStoredMerchantDefaultPricing(storage)
    assert.notEqual(storedSnapshot.single.find((item) => item.id === customItem.id), undefined)
    assert.equal(instance.data.deletePricingConfirmVisible, true)
    assert.equal(instance.data.pendingDeletePricingItemId, customItem.id)
  } finally {
    cleanup()
  }
})
