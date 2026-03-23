import type {
  MerchantDefaultPriceConfigItem,
  MerchantDefaultPricingSnapshot,
  MerchantPriceTier,
} from '../../../types/merchant-default-pricing'
import type { MerchantCreamType } from '../../../types/merchant-product'
import type { ProductSpecSize } from '../../../types/product'
import { loadMerchantBlacklistSnapshot } from '../../utils/merchant-blacklist-storage'
import {
  addMerchantDefaultPricingCustomItemToSnapshot,
  applyMerchantDefaultPricingItemPrice,
  cloneMerchantDefaultPricingSnapshot,
  createSeedMerchantDefaultPricingSnapshot,
  loadStoredMerchantDefaultPricing,
  removeMerchantDefaultPricingItemFromSnapshot,
  saveMerchantDefaultPricingSnapshot,
} from '../../utils/merchant-default-pricing-storage'

interface MerchantProfilePricingItemView {
  id: string
  label: string
  basePriceInput: string
}

interface MerchantProfilePricingGroupView {
  tier: MerchantPriceTier
  label: string
  itemCount: number
  expanded: boolean
  settingMode: boolean
  items: MerchantProfilePricingItemView[]
}

interface PricingInputDetail {
  value?: unknown
}

interface PopupVisibleChangeDetail {
  visible?: unknown
}

interface PickerChangeDetail {
  value?: unknown
}

interface TierDataset {
  tier?: unknown
}

interface PricingItemDataset {
  itemId?: unknown
}

interface CustomSizeDataset {
  index?: unknown
}

interface MerchantProfileSceneData {
  blacklistCount: number
  pricingSnapshot: MerchantDefaultPricingSnapshot
  pricingGroups: MerchantProfilePricingGroupView[]
  pricingExpandedMap: Record<MerchantPriceTier, boolean>
  pricingSettingMap: Record<MerchantPriceTier, boolean>
  pricingDraftDirty: boolean
  customDialogVisible: boolean
  customDialogTitle: string
  customDialogTier: MerchantPriceTier
  customSizeIndexes: number[]
  customCreamIndex: number
  customSizeOptionLabels: string[]
  customCreamOptionLabels: string[]
  deletePricingConfirmVisible: boolean
  deletePricingConfirmTitle: string
  deletePricingConfirmContent: string
  deletePricingConfirmConfirmText: string
  pendingDeletePricingItemId: string
}

const SIZE_OPTIONS: Array<{ value: ProductSpecSize; label: string }> = [
  { value: '6-inch', label: '6 寸' },
  { value: '8-inch', label: '8 寸' },
  { value: '10-inch', label: '10 寸' },
  { value: '12-inch', label: '12 寸' },
  { value: '14-inch', label: '14 寸' },
  { value: '16-inch', label: '16 寸' },
]

const CREAM_OPTIONS: Array<{ value: MerchantCreamType; label: string }> = [
  { value: 'animal-cream-i', label: '动物奶油i' },
  { value: 'dairy-cream', label: '乳脂奶油' },
  { value: 'naked-cake', label: '裸蛋糕' },
]

const DEFAULT_CUSTOM_SIZE_INDEXES: Record<MerchantPriceTier, number[]> = {
  single: [0],
  double: [2, 0],
  triple: [3, 2, 0],
}

const TIER_LABEL_MAP: Record<MerchantPriceTier, string> = {
  single: '单层',
  double: '双层',
  triple: '三层',
}

function parseInputValue(detail: unknown): string {
  if (typeof detail === 'string') {
    return detail
  }

  if (typeof detail === 'object' && detail !== null && 'value' in detail) {
    const value = (detail as PricingInputDetail).value
    return typeof value === 'string' ? value : ''
  }

  return ''
}

function parsePopupVisible(detail: unknown): boolean {
  if (typeof detail === 'boolean') {
    return detail
  }

  if (typeof detail !== 'object' || detail === null || !('visible' in detail)) {
    return false
  }

  return (detail as PopupVisibleChangeDetail).visible === true
}

function parseDatasetIndex(rawValue: unknown): number | null {
  if (typeof rawValue === 'number' && Number.isInteger(rawValue) && rawValue >= 0) {
    return rawValue
  }

  if (typeof rawValue === 'string' && /^\d+$/.test(rawValue)) {
    return Number(rawValue)
  }

  return null
}

function parsePickerIndex(detail: unknown): number {
  if (typeof detail === 'number' && Number.isInteger(detail) && detail >= 0) {
    return detail
  }

  if (typeof detail === 'string' && /^\d+$/.test(detail)) {
    return Number(detail)
  }

  if (typeof detail === 'object' && detail !== null && 'value' in detail) {
    const value = (detail as PickerChangeDetail).value
    if (typeof value === 'number' && Number.isInteger(value) && value >= 0) {
      return value
    }

    if (typeof value === 'string' && /^\d+$/.test(value)) {
      return Number(value)
    }
  }

  return 0
}

function normalizePriceInputValue(rawValue: string): number {
  const parsed = Number(rawValue)
  if (!Number.isFinite(parsed) || parsed < 0) {
    return 0
  }

  return Math.round(parsed)
}

function buildPricingGroups(
  snapshot: MerchantDefaultPricingSnapshot,
  expandedMap: Record<MerchantPriceTier, boolean>,
  settingMap: Record<MerchantPriceTier, boolean>,
): MerchantProfilePricingGroupView[] {
  const tierOrder: MerchantPriceTier[] = ['single', 'double', 'triple']

  return tierOrder.map((tier) => {
    const tierItems = snapshot[tier]
    return {
      tier,
      label: TIER_LABEL_MAP[tier],
      itemCount: tierItems.length,
      expanded: expandedMap[tier] === true,
      settingMode: settingMap[tier] === true,
      items: tierItems.map((item) => ({
        id: item.id,
        label: item.label,
        basePriceInput: String(item.basePrice),
      })),
    }
  })
}

function findPricingItem(
  snapshot: MerchantDefaultPricingSnapshot,
  itemId: string,
): MerchantDefaultPriceConfigItem | undefined {
  return [...snapshot.single, ...snapshot.double, ...snapshot.triple].find((item) => item.id === itemId)
}

function resolveTierSizeCount(tier: MerchantPriceTier): number {
  if (tier === 'triple') {
    return 3
  }

  if (tier === 'double') {
    return 2
  }

  return 1
}

Component({
  options: {
    addGlobalClass: true,
  },

  properties: {
    isPreviewMode: {
      type: Boolean,
      value: false,
    },
    canBackToAdmin: {
      type: Boolean,
      value: false,
    },
  },

  data: {
    blacklistCount: 0,
    pricingSnapshot: createSeedMerchantDefaultPricingSnapshot(),
    pricingGroups: [],
    pricingExpandedMap: { single: true, double: false, triple: false },
    pricingSettingMap: { single: false, double: false, triple: false },
    pricingDraftDirty: false,
    customDialogVisible: false,
    customDialogTitle: '新增默认价格项',
    customDialogTier: 'single',
    customSizeIndexes: [...DEFAULT_CUSTOM_SIZE_INDEXES.single],
    customCreamIndex: 0,
    customSizeOptionLabels: SIZE_OPTIONS.map((item) => item.label),
    customCreamOptionLabels: CREAM_OPTIONS.map((item) => item.label),
    deletePricingConfirmVisible: false,
    deletePricingConfirmTitle: '删除默认价格项',
    deletePricingConfirmContent: '删除后需要重新保存才会生效，未保存前不会真正写入默认价格。',
    deletePricingConfirmConfirmText: '确认删除',
    pendingDeletePricingItemId: '',
  } as MerchantProfileSceneData,

  lifetimes: {
    attached(): void {
      this.syncSceneState(true)
    },
  },

  pageLifetimes: {
    show(): void {
      this.syncSceneState(false)
    },
  },

  methods: {
    syncSceneState(forceStorageSync: boolean = false): void {
      const storedSnapshot = cloneMerchantDefaultPricingSnapshot(loadStoredMerchantDefaultPricing(wx))
      const nextSnapshot =
        !forceStorageSync && this.data.pricingDraftDirty
          ? cloneMerchantDefaultPricingSnapshot(this.data.pricingSnapshot)
          : storedSnapshot

      this.setData({
        blacklistCount: loadMerchantBlacklistSnapshot(wx).length,
        pricingSnapshot: nextSnapshot,
        pricingGroups: buildPricingGroups(
          nextSnapshot,
          this.data.pricingExpandedMap,
          this.data.pricingSettingMap,
        ),
        pricingDraftDirty: forceStorageSync ? false : this.data.pricingDraftDirty,
      })
    },

    updatePricingView(
      snapshot: MerchantDefaultPricingSnapshot,
      expandedMap: Record<MerchantPriceTier, boolean>,
      settingMap: Record<MerchantPriceTier, boolean>,
      dirty: boolean,
    ): void {
      const nextSnapshot = cloneMerchantDefaultPricingSnapshot(snapshot)
      this.setData({
        blacklistCount: loadMerchantBlacklistSnapshot(wx).length,
        pricingSnapshot: nextSnapshot,
        pricingExpandedMap: expandedMap,
        pricingSettingMap: settingMap,
        pricingGroups: buildPricingGroups(nextSnapshot, expandedMap, settingMap),
        pricingDraftDirty: dirty,
      })
    },

    getActivePricingSnapshot(): MerchantDefaultPricingSnapshot {
      return cloneMerchantDefaultPricingSnapshot(this.data.pricingSnapshot)
    },

    handleOpenBlacklist(): void {
      if (this.data.pricingDraftDirty) {
        wx.showToast({
          title: '默认价格有未保存修改，请先保存',
          icon: 'none',
        })
        return
      }

      wx.navigateTo({
        url: '/pages/merchant/blacklist/blacklist',
      })
    },

    handlePreviewReturnTap(): void {
      if (this.data.pricingDraftDirty) {
        wx.showToast({
          title: '默认价格有未保存修改，请先保存',
          icon: 'none',
        })
        return
      }

      this.triggerEvent('sceneaction', {
        action: 'preview-return',
      })
    },

    handleTogglePricingTier(event: WechatMiniprogram.BaseEvent): void {
      const tier = (event.currentTarget.dataset as TierDataset).tier
      if (tier !== 'single' && tier !== 'double' && tier !== 'triple') {
        return
      }

      this.updatePricingView(
        this.getActivePricingSnapshot(),
        {
          ...this.data.pricingExpandedMap,
          [tier]: !this.data.pricingExpandedMap[tier],
        },
        this.data.pricingSettingMap,
        this.data.pricingDraftDirty,
      )
    },

    handleTogglePricingSetting(event: WechatMiniprogram.BaseEvent): void {
      const tier = (event.currentTarget.dataset as TierDataset).tier
      if (tier !== 'single' && tier !== 'double' && tier !== 'triple') {
        return
      }

      this.updatePricingView(
        this.getActivePricingSnapshot(),
        {
          ...this.data.pricingExpandedMap,
          [tier]: true,
        },
        {
          ...this.data.pricingSettingMap,
          [tier]: !this.data.pricingSettingMap[tier],
        },
        this.data.pricingDraftDirty,
      )
    },

    handlePricingInputChange(event: WechatMiniprogram.CustomEvent<PricingInputDetail>): void {
      const itemId = (event.currentTarget.dataset as PricingItemDataset).itemId
      if (typeof itemId !== 'string' || itemId.length === 0) {
        return
      }

      const nextSnapshot = applyMerchantDefaultPricingItemPrice(
        this.getActivePricingSnapshot(),
        itemId,
        normalizePriceInputValue(parseInputValue(event.detail).trim()),
      )

      this.updatePricingView(
        nextSnapshot,
        this.data.pricingExpandedMap,
        this.data.pricingSettingMap,
        true,
      )
    },

    handleSavePricingDraft(): void {
      if (!this.data.pricingDraftDirty) {
        return
      }

      saveMerchantDefaultPricingSnapshot(wx, this.data.pricingSnapshot)
      this.syncSceneState(true)
      wx.showToast({
        title: '默认价格已保存',
        icon: 'success',
      })
    },

    handleDeletePricingItem(event: WechatMiniprogram.BaseEvent): void {
      const itemId = (event.currentTarget.dataset as PricingItemDataset).itemId
      if (typeof itemId !== 'string' || itemId.length === 0) {
        return
      }

      const targetItem = findPricingItem(this.data.pricingSnapshot, itemId)
      const targetLabel = targetItem?.label ?? '该默认价格项'

      this.setData({
        deletePricingConfirmVisible: true,
        deletePricingConfirmTitle: '删除默认价格项',
        deletePricingConfirmContent: `确认删除“${targetLabel}”吗？删除后需要重新保存才会真正生效。`,
        deletePricingConfirmConfirmText: '确认删除',
        pendingDeletePricingItemId: itemId,
      })
    },

    handleDeletePricingConfirmVisibleChange(event: WechatMiniprogram.CustomEvent<PopupVisibleChangeDetail>): void {
      if (parsePopupVisible(event.detail)) {
        return
      }

      this.handleCloseDeletePricingConfirmDialog()
    },

    handleCloseDeletePricingConfirmDialog(): void {
      this.setData({
        deletePricingConfirmVisible: false,
        pendingDeletePricingItemId: '',
      })
    },

    handleConfirmDeletePricingItem(): void {
      if (this.data.pendingDeletePricingItemId.length === 0) {
        this.handleCloseDeletePricingConfirmDialog()
        return
      }

      const nextSnapshot = removeMerchantDefaultPricingItemFromSnapshot(
        this.getActivePricingSnapshot(),
        this.data.pendingDeletePricingItemId,
      )

      this.updatePricingView(
        nextSnapshot,
        this.data.pricingExpandedMap,
        this.data.pricingSettingMap,
        true,
      )
      this.handleCloseDeletePricingConfirmDialog()
      wx.showToast({
        title: '已加入待保存变更',
        icon: 'none',
      })
    },

    handleOpenCustomPricingDialog(event: WechatMiniprogram.BaseEvent): void {
      const tier = (event.currentTarget.dataset as TierDataset).tier
      if (tier !== 'single' && tier !== 'double' && tier !== 'triple') {
        return
      }

      this.setData({
        customDialogVisible: true,
        customDialogTier: tier,
        customDialogTitle: `新增${TIER_LABEL_MAP[tier]}默认价格项`,
        customSizeIndexes: [...DEFAULT_CUSTOM_SIZE_INDEXES[tier]],
        customCreamIndex: 0,
      })
    },

    handleCustomDialogVisibleChange(event: WechatMiniprogram.CustomEvent<PopupVisibleChangeDetail>): void {
      this.setData({
        customDialogVisible: parsePopupVisible(event.detail),
      })
    },

    handleCloseCustomPricingDialog(): void {
      this.setData({
        customDialogVisible: false,
      })
    },

    handleCustomSizeChange(event: WechatMiniprogram.CustomEvent<PickerChangeDetail>): void {
      const index = parseDatasetIndex((event.currentTarget.dataset as CustomSizeDataset).index)
      if (index === null) {
        return
      }

      const nextIndexes = [...this.data.customSizeIndexes]
      nextIndexes[index] = Math.min(parsePickerIndex(event.detail), SIZE_OPTIONS.length - 1)
      this.setData({
        customSizeIndexes: nextIndexes,
      })
    },

    handleCustomCreamChange(event: WechatMiniprogram.CustomEvent<PickerChangeDetail>): void {
      this.setData({
        customCreamIndex: Math.min(parsePickerIndex(event.detail), CREAM_OPTIONS.length - 1),
      })
    },

    handleConfirmCustomPricing(): void {
      const sizeCount = resolveTierSizeCount(this.data.customDialogTier)
      const sizes = this.data.customSizeIndexes
        .slice(0, sizeCount)
        .map((index) => SIZE_OPTIONS[index] ?? SIZE_OPTIONS[0])
        .map((item) => item.value)
      const creamType = (CREAM_OPTIONS[this.data.customCreamIndex] ?? CREAM_OPTIONS[0]).value

      const addResult = addMerchantDefaultPricingCustomItemToSnapshot(this.getActivePricingSnapshot(), {
        tier: this.data.customDialogTier,
        sizes,
        creamType,
      })
      const nextExpandedMap = {
        ...this.data.pricingExpandedMap,
        [this.data.customDialogTier]: true,
      }
      const nextSettingMap = {
        ...this.data.pricingSettingMap,
        [this.data.customDialogTier]: true,
      }

      this.setData({
        customDialogVisible: false,
      })
      this.updatePricingView(addResult.snapshot, nextExpandedMap, nextSettingMap, true)
      wx.showToast({
        title: '已加入待保存配置',
        icon: 'none',
      })
    },
  },
})
