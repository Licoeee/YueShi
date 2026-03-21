import type {
  MerchantExpirySubscriptionPreference,
  MerchantInventoryDraftInput,
  MerchantInventoryRecord,
} from '../../../types/merchant-inventory'
import { CUSTOMER_IMAGE_PLACEHOLDER } from '../../utils/customer-image-fallback'
import {
  collectDueInventoryExpiryReminders,
  createMerchantInventoryRecord,
  deleteMerchantInventoryRecord,
  loadMerchantExpirySubscriptionPreference,
  loadStoredMerchantInventoryRecords,
  markMerchantInventoryReminderNotified,
  resolveInventoryExpiryDate,
  resolveInventoryExpiryState,
  saveMerchantExpirySubscriptionPreference,
} from '../../utils/merchant-inventory-storage'

interface PickerOption {
  value: string
  label: string
}

interface ProductionPickerIndexes {
  yearIndex: number
  monthIndex: number
  dayIndex: number
}

interface ProductionPickerState {
  yearOptions: PickerOption[]
  monthOptions: PickerOption[]
  dayOptions: PickerOption[]
  indexes: ProductionPickerIndexes
}

interface MerchantInventoryDisplayRecord extends MerchantInventoryRecord {
  daysLeft: number
  isNearExpiry: boolean
  isExpired: boolean
  productionSummary: string
  expirySummary: string
  photoPreviewUrl: string
}

interface InputDetail {
  value?: unknown
}

interface PickerConfirmColumn {
  column?: unknown
  index?: unknown
}

interface PickerConfirmDetail {
  columns?: PickerConfirmColumn[]
}

interface PopupVisibleChangeDetail {
  visible?: unknown
}

interface ChooseMediaSuccessCallbackResult {
  tempFiles: Array<{
    tempFilePath: string
  }>
}

interface SubscribeMessageSuccessResult {
  [templateId: string]: string
}

interface MerchantInventorySceneData {
  records: MerchantInventoryDisplayRecord[]
  nearExpiryCount: number
  createPopupVisible: boolean
  productionPickerVisible: boolean
  productionPickerState: ProductionPickerState
  productionPickerValue: string[]
  productionDateInput: string
  itemNameInput: string
  costPriceInput: string
  shelfLifeDaysInput: string
  photoUrlInput: string
  expiryDatePreview: string
  canSubmitCreate: boolean
}

const MERCHANT_EXPIRY_TEMPLATE_ID_STORAGE_KEY = 'merchant-expiry-template-id'

function parseInputValue(detail: unknown): string {
  if (typeof detail === 'string') {
    return detail
  }

  if (typeof detail === 'object' && detail !== null && 'value' in detail) {
    const value = (detail as InputDetail).value
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

function resolveYearOptions(now: Date): PickerOption[] {
  const currentYear = now.getFullYear()

  return [currentYear - 1, currentYear, currentYear + 1].map((year) => ({
    value: String(year),
    label: `${year} 年`,
  }))
}

function resolveMonthOptions(): PickerOption[] {
  return Array.from({ length: 12 }, (_, index) => {
    const month = index + 1

    return {
      value: String(month).padStart(2, '0'),
      label: `${month} 月`,
    }
  })
}

function resolveDaysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate()
}

function resolveDayOptions(year: number, month: number): PickerOption[] {
  const daysInMonth = resolveDaysInMonth(year, month)

  return Array.from({ length: daysInMonth }, (_, index) => {
    const day = index + 1

    return {
      value: String(day).padStart(2, '0'),
      label: `${day} 日`,
    }
  })
}

function buildProductionPickerState(now: Date, indexes?: Partial<ProductionPickerIndexes>): ProductionPickerState {
  const yearOptions = resolveYearOptions(now)
  const monthOptions = resolveMonthOptions()

  const yearIndex = Math.min(Math.max(indexes?.yearIndex ?? 1, 0), yearOptions.length - 1)
  const monthIndex = Math.min(Math.max(indexes?.monthIndex ?? now.getMonth(), 0), monthOptions.length - 1)

  const selectedYear = Number(yearOptions[yearIndex]?.value ?? now.getFullYear())
  const selectedMonth = Number(monthOptions[monthIndex]?.value ?? now.getMonth() + 1)
  const dayOptions = resolveDayOptions(selectedYear, selectedMonth)

  const dayIndex = Math.min(Math.max(indexes?.dayIndex ?? now.getDate() - 1, 0), dayOptions.length - 1)

  return {
    yearOptions,
    monthOptions,
    dayOptions,
    indexes: {
      yearIndex,
      monthIndex,
      dayIndex,
    },
  }
}

function buildProductionPickerValue(state: ProductionPickerState): string[] {
  return [
    state.yearOptions[state.indexes.yearIndex]?.value ?? '',
    state.monthOptions[state.indexes.monthIndex]?.value ?? '',
    state.dayOptions[state.indexes.dayIndex]?.value ?? '',
  ]
}

function resolveProductionDateText(state: ProductionPickerState): string {
  const year = state.yearOptions[state.indexes.yearIndex]?.value
  const month = state.monthOptions[state.indexes.monthIndex]?.value
  const day = state.dayOptions[state.indexes.dayIndex]?.value

  if (year === undefined || month === undefined || day === undefined) {
    return ''
  }

  return `${year}-${month}-${day}`
}

function parseNumberInput(value: string): number | null {
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null
  }

  return Math.round(parsed)
}

function resolvePhotoPreviewUrl(photoUrl: string): string {
  if (photoUrl.length === 0) {
    return CUSTOMER_IMAGE_PLACEHOLDER
  }

  if (photoUrl.startsWith('/assets/') || photoUrl.startsWith('http') || photoUrl.startsWith('wxfile://')) {
    return photoUrl
  }

  return CUSTOMER_IMAGE_PLACEHOLDER
}

function mapRecordToDisplay(record: MerchantInventoryRecord, now: Date): MerchantInventoryDisplayRecord {
  const expiryState = resolveInventoryExpiryState(record.expiryDate, now)

  return {
    ...record,
    daysLeft: expiryState.daysLeft,
    isNearExpiry: expiryState.isNearExpiry,
    isExpired: expiryState.isExpired,
    productionSummary: record.productionDate,
    expirySummary: record.expiryDate,
    photoPreviewUrl: resolvePhotoPreviewUrl(record.photoUrl),
  }
}

function resolveTemplateId(): string {
  const rawTemplateId = wx.getStorageSync(MERCHANT_EXPIRY_TEMPLATE_ID_STORAGE_KEY)

  if (typeof rawTemplateId !== 'string') {
    return ''
  }

  return rawTemplateId.trim()
}

function shouldRequestSubscribeMessage(templateId: string): boolean {
  return templateId.length > 0 && !templateId.includes('TODO') && !templateId.includes('merchant-expiry-reminder')
}

function resolveCanSubmitCreate(itemName: string, costPrice: string, shelfLifeDays: string, productionDate: string): boolean {
  return (
    itemName.trim().length > 0 &&
    parseNumberInput(costPrice.trim()) !== null &&
    parseNumberInput(shelfLifeDays.trim()) !== null &&
    productionDate.length > 0
  )
}

const INITIAL_PICKER_STATE = buildProductionPickerState(new Date())
const INITIAL_PRODUCTION_DATE = resolveProductionDateText(INITIAL_PICKER_STATE)

Component({
  options: {
    addGlobalClass: true,
  },

  data: {
    records: [],
    nearExpiryCount: 0,
    createPopupVisible: false,
    productionPickerVisible: false,
    productionPickerState: INITIAL_PICKER_STATE,
    productionPickerValue: buildProductionPickerValue(INITIAL_PICKER_STATE),
    productionDateInput: INITIAL_PRODUCTION_DATE,
    itemNameInput: '',
    costPriceInput: '',
    shelfLifeDaysInput: '30',
    photoUrlInput: '',
    expiryDatePreview: resolveInventoryExpiryDate(INITIAL_PRODUCTION_DATE, 30),
    canSubmitCreate: false,
  } as MerchantInventorySceneData,

  lifetimes: {
    attached(): void {
      this.syncRecords()
    },
  },

  pageLifetimes: {
    show(): void {
      this.syncRecords()
      this.notifyDueReminders()
    },
  },

  methods: {
    syncRecords(): void {
      const now = new Date()
      const records = loadStoredMerchantInventoryRecords().map((record) => mapRecordToDisplay(record, now))

      this.setData({
        records,
        nearExpiryCount: records.filter((record) => record.isNearExpiry && !record.isExpired).length,
      })
    },

    notifyDueReminders(): void {
      const preference = loadMerchantExpirySubscriptionPreference(wx)
      if (preference !== 'accepted') {
        return
      }

      const now = new Date()
      const dueRecords = collectDueInventoryExpiryReminders(loadStoredMerchantInventoryRecords(), now)
      if (dueRecords.length === 0) {
        return
      }

      wx.showToast({
        title: `临期提醒 ${dueRecords.length} 条`,
        icon: 'none',
      })

      markMerchantInventoryReminderNotified(
        wx,
        dueRecords.map((record) => record.id),
      )

      this.syncRecords()
    },

    updateCreateForm(patch: Partial<MerchantInventorySceneData>): void {
      const itemNameInput = patch.itemNameInput ?? this.data.itemNameInput
      const costPriceInput = patch.costPriceInput ?? this.data.costPriceInput
      const shelfLifeDaysInput = patch.shelfLifeDaysInput ?? this.data.shelfLifeDaysInput
      const productionDateInput = patch.productionDateInput ?? this.data.productionDateInput
      const shelfLifeDays = parseNumberInput(shelfLifeDaysInput) ?? 1
      const expiryDatePreview = patch.expiryDatePreview ?? resolveInventoryExpiryDate(productionDateInput, shelfLifeDays)

      this.setData({
        ...patch,
        expiryDatePreview,
        canSubmitCreate: resolveCanSubmitCreate(itemNameInput, costPriceInput, shelfLifeDaysInput, productionDateInput),
      })
    },

    handleOpenCreatePopup(): void {
      const pickerState = buildProductionPickerState(new Date())
      const productionDateInput = resolveProductionDateText(pickerState)

      this.updateCreateForm({
        createPopupVisible: true,
        productionPickerState: pickerState,
        productionPickerValue: buildProductionPickerValue(pickerState),
        productionDateInput,
        itemNameInput: '',
        costPriceInput: '',
        shelfLifeDaysInput: '30',
        photoUrlInput: '',
      })
    },

    handleCreatePopupVisibleChange(event: WechatMiniprogram.CustomEvent<PopupVisibleChangeDetail>): void {
      this.setData({
        createPopupVisible: parsePopupVisible(event.detail),
      })
    },

    handleCloseCreatePopup(): void {
      this.setData({
        createPopupVisible: false,
      })
    },

    handleOpenProductionPicker(): void {
      this.setData({
        productionPickerVisible: true,
      })
    },

    handleProductionPick(event: WechatMiniprogram.CustomEvent<{ column?: number; index?: number }>): void {
      const detail = event.detail
      if (typeof detail.column !== 'number' || typeof detail.index !== 'number') {
        return
      }

      const nextIndexes: ProductionPickerIndexes = { ...this.data.productionPickerState.indexes }
      if (detail.column === 0) {
        nextIndexes.yearIndex = detail.index
        nextIndexes.dayIndex = 0
      }

      if (detail.column === 1) {
        nextIndexes.monthIndex = detail.index
        nextIndexes.dayIndex = 0
      }

      if (detail.column === 2) {
        nextIndexes.dayIndex = detail.index
      }

      const nextPickerState = buildProductionPickerState(new Date(), nextIndexes)
      const productionDateInput = resolveProductionDateText(nextPickerState)

      this.updateCreateForm({
        productionPickerState: nextPickerState,
        productionPickerValue: buildProductionPickerValue(nextPickerState),
        productionDateInput,
      })
    },

    handleProductionConfirm(event: WechatMiniprogram.CustomEvent<PickerConfirmDetail>): void {
      const columns = event.detail.columns
      const indexes: ProductionPickerIndexes = { ...this.data.productionPickerState.indexes }

      if (Array.isArray(columns)) {
        columns.forEach((columnDetail) => {
          if (typeof columnDetail.column !== 'number' || typeof columnDetail.index !== 'number') {
            return
          }

          if (columnDetail.column === 0) {
            indexes.yearIndex = columnDetail.index
          }

          if (columnDetail.column === 1) {
            indexes.monthIndex = columnDetail.index
          }

          if (columnDetail.column === 2) {
            indexes.dayIndex = columnDetail.index
          }
        })
      }

      const pickerState = buildProductionPickerState(new Date(), indexes)
      const productionDateInput = resolveProductionDateText(pickerState)

      this.updateCreateForm({
        productionPickerVisible: false,
        productionPickerState: pickerState,
        productionPickerValue: buildProductionPickerValue(pickerState),
        productionDateInput,
      })
    },

    handleProductionCancel(): void {
      this.setData({
        productionPickerVisible: false,
      })
    },

    handleItemNameChange(event: WechatMiniprogram.CustomEvent<InputDetail>): void {
      this.updateCreateForm({
        itemNameInput: parseInputValue(event.detail),
      })
    },

    handleCostPriceChange(event: WechatMiniprogram.CustomEvent<InputDetail>): void {
      this.updateCreateForm({
        costPriceInput: parseInputValue(event.detail),
      })
    },

    handleShelfLifeDaysChange(event: WechatMiniprogram.CustomEvent<InputDetail>): void {
      this.updateCreateForm({
        shelfLifeDaysInput: parseInputValue(event.detail),
      })
    },

    handleChoosePhoto(): void {
      wx.chooseMedia({
        count: 1,
        mediaType: ['image'],
        sourceType: ['album', 'camera'],
        success: (result: ChooseMediaSuccessCallbackResult): void => {
          const photoPath = result.tempFiles[0]?.tempFilePath
          if (typeof photoPath !== 'string' || photoPath.length === 0) {
            return
          }

          this.setData({
            photoUrlInput: photoPath,
          })
        },
      })
    },

    handleDeleteRecord(event: WechatMiniprogram.BaseEvent): void {
      const recordId = (event.currentTarget.dataset as { recordId?: unknown }).recordId
      if (typeof recordId !== 'string' || recordId.length === 0) {
        return
      }

      deleteMerchantInventoryRecord(wx, recordId)
      this.syncRecords()
      wx.showToast({
        title: '已删除入库记录',
        icon: 'none',
      })
    },

    handleCreateRecord(): void {
      if (!this.data.canSubmitCreate) {
        wx.showToast({
          title: '请先补齐必填信息',
          icon: 'none',
        })
        return
      }

      const itemName = this.data.itemNameInput.trim()
      const costPrice = parseNumberInput(this.data.costPriceInput.trim())
      const shelfLifeDays = parseNumberInput(this.data.shelfLifeDaysInput.trim())
      const productionDate = this.data.productionDateInput

      if (costPrice === null || shelfLifeDays === null) {
        wx.showToast({
          title: '入库参数无效',
          icon: 'none',
        })
        return
      }

      const draft: MerchantInventoryDraftInput = {
        itemName,
        photoUrl: this.data.photoUrlInput,
        costPrice,
        productionDate,
        shelfLifeDays,
      }

      createMerchantInventoryRecord(wx, draft)
      this.setData({
        createPopupVisible: false,
      })

      this.syncRecords()
      wx.showToast({
        title: '入库成功',
        icon: 'success',
      })
      this.promptSubscribeIfNeeded()
    },

    promptSubscribeIfNeeded(): void {
      const preference = loadMerchantExpirySubscriptionPreference(wx)
      if (preference === 'accepted') {
        this.notifyDueReminders()
        return
      }

      wx.showModal({
        title: '开启临期提醒',
        content: '是否开启服务号订阅通知？同意后不再重复询问。',
        confirmText: '同意并开启',
        cancelText: '暂不',
        success: (result): void => {
          if (!result.confirm) {
            saveMerchantExpirySubscriptionPreference(wx, 'rejected')
            return
          }

          this.requestSubscribePermission()
        },
      })
    },

    requestSubscribePermission(): void {
      const templateId = resolveTemplateId()
      const runtimeWx = wx as typeof wx & {
        requestSubscribeMessage?: (options: {
          tmplIds: string[]
          success?: (result: SubscribeMessageSuccessResult) => void
          fail?: () => void
        }) => void
      }

      if (!shouldRequestSubscribeMessage(templateId) || typeof runtimeWx.requestSubscribeMessage !== 'function') {
        saveMerchantExpirySubscriptionPreference(wx, 'accepted')
        wx.showToast({
          title: '已开启临期提醒',
          icon: 'success',
        })
        this.notifyDueReminders()
        return
      }

      runtimeWx.requestSubscribeMessage({
        tmplIds: [templateId],
        success: (result): void => {
          const decision = result[templateId]
          const preference: MerchantExpirySubscriptionPreference = decision === 'accept' ? 'accepted' : 'rejected'
          saveMerchantExpirySubscriptionPreference(wx, preference)

          if (preference === 'accepted') {
            wx.showToast({
              title: '已开启临期提醒',
              icon: 'success',
            })
            this.notifyDueReminders()
            return
          }

          wx.showToast({
            title: '本次未开启提醒',
            icon: 'none',
          })
        },
        fail: (): void => {
          saveMerchantExpirySubscriptionPreference(wx, 'rejected')
          wx.showToast({
            title: '订阅未完成，下次入库会再次询问',
            icon: 'none',
          })
        },
      })
    },
  },
})
