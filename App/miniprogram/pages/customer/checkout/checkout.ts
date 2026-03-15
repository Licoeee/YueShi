import type { CheckoutItemRecord, CheckoutSource } from '../../../../types/checkout'
import type { PickupSlot } from '../../../../types/order'
import {
  buildCheckoutState,
  removeSubmittedCartItems,
} from '../../../utils/customer-checkout-state'
import { runCustomerAuthorizedAction } from '../../../utils/customer-action-gate'
import { resolveCakeImageUrl } from '../../../utils/customer-image-fallback'
import {
  buildPickupPickerState,
  formatPickupSlot,
  resolvePickupSlotFromIndexes,
  type PickupPickerIndexes,
  type PickupPickerState,
} from '../../../utils/customer-pickup-slot'
import {
  loadStoredPhoneHistory,
  savePhoneToHistory,
} from '../../../utils/customer-phone-history-storage'
import { createLocalCustomerOrderRepository } from '../../../utils/customer-order-repository'
import { loadStoredCustomerCart, saveStoredCustomerCart } from '../../../utils/customer-cart-storage'

const PAYMENT_GUIDE_TEXT = '请在付款时备注手机号后四位，以便商家对账'

interface CheckoutDisplayItem extends CheckoutItemRecord {
  coverImageUrl: string
}

interface PickerColumnDetail {
  column?: unknown
  index?: unknown
}

interface PickerConfirmColumn {
  column?: unknown
  index?: unknown
}

interface PickerConfirmDetail {
  columns?: PickerConfirmColumn[]
}

interface InputDetail {
  value?: unknown
}

interface ActionSheetItem {
  label: string
}

interface ActionSheetSelectedDetail {
  selected?: {
    label?: unknown
  }
}

interface CheckoutPageData {
  checkoutSource: CheckoutSource
  checkoutItems: CheckoutDisplayItem[]
  totalAmount: number
  totalQuantity: number
  phone: string
  phoneError: string
  phoneHistoryVisible: boolean
  phoneHistoryItems: ActionSheetItem[]
  pickupError: string
  pickupSummary: string
  pickupPickerVisible: boolean
  pickupPickerState: PickupPickerState
  pickupPickerValue: string[]
  paymentGuideVisible: boolean
  paymentGuideText: string
}

function buildPickerValue(state: PickupPickerState): string[] {
  return [
    state.monthOptions[state.indexes.monthIndex]?.value ?? '',
    state.dayOptions[state.indexes.dayIndex]?.value ?? '',
    state.timeOptions[state.indexes.timeIndex]?.value ?? '',
  ]
}

function buildPickupPatch(indexes?: Partial<PickupPickerIndexes>): Pick<
  CheckoutPageData,
  'pickupPickerState' | 'pickupPickerValue' | 'pickupSummary'
> {
  const now = new Date()
  const pickupPickerState = buildPickupPickerState(now, indexes)
  const pickupSlot = resolvePickupSlotFromIndexes(pickupPickerState.indexes, now)

  return {
    pickupPickerState,
    pickupPickerValue: buildPickerValue(pickupPickerState),
    pickupSummary: pickupSlot === null ? '请选择取货时间' : formatPickupSlot(pickupSlot),
  }
}

function extractPhone(detail: unknown): string {
  if (typeof detail === 'string') {
    return detail
  }

  if (typeof detail === 'object' && detail !== null && 'value' in detail) {
    const value = (detail as InputDetail).value
    return typeof value === 'string' ? value : ''
  }

  return ''
}

function buildCheckoutDisplayItems(items: CheckoutItemRecord[]): CheckoutDisplayItem[] {
  return items.map((item) => ({
    ...item,
    coverImageUrl: resolveCakeImageUrl(item.coverImage),
  }))
}

function isValidPhone(phone: string): boolean {
  return /^1[3-9]\d{9}$/.test(phone)
}

function extractIndexesFromConfirm(detail: unknown, fallback: PickupPickerIndexes): PickupPickerIndexes {
  if (typeof detail !== 'object' || detail === null || !('columns' in detail)) {
    return fallback
  }

  const columns = (detail as PickerConfirmDetail).columns
  if (!Array.isArray(columns)) {
    return fallback
  }

  const nextIndexes: PickupPickerIndexes = { ...fallback }
  columns.forEach((columnDetail) => {
    if (typeof columnDetail.column !== 'number' || typeof columnDetail.index !== 'number') {
      return
    }

    if (columnDetail.column === 0) {
      nextIndexes.monthIndex = columnDetail.index
    }

    if (columnDetail.column === 1) {
      nextIndexes.dayIndex = columnDetail.index
    }

    if (columnDetail.column === 2) {
      nextIndexes.timeIndex = columnDetail.index
    }
  })

  return nextIndexes
}

Page<
  CheckoutPageData,
  {
    onShow(): void
    syncCheckout(): void
    handlePhoneChange(event: WechatMiniprogram.CustomEvent<InputDetail>): void
    handleOpenPhoneHistory(): void
    handleSelectPhoneHistory(event: WechatMiniprogram.CustomEvent<ActionSheetSelectedDetail>): void
    handleClosePhoneHistory(): void
    handleOpenPickupPicker(): void
    handlePickupPick(event: WechatMiniprogram.CustomEvent<PickerColumnDetail>): void
    handlePickupConfirm(event: WechatMiniprogram.CustomEvent<PickerConfirmDetail>): void
    handlePickupCancel(): void
    handleSubmit(): Promise<void>
    handlePaymentGuideConfirm(): void
  }
>({
  data: {
    checkoutSource: 'cart',
    checkoutItems: [],
    totalAmount: 0,
    totalQuantity: 0,
    phone: '',
    phoneError: '',
    phoneHistoryVisible: false,
    phoneHistoryItems: [],
    pickupError: '',
    pickupSummary: '请选择取货时间',
    pickupPickerVisible: false,
    pickupPickerState: buildPickupPickerState(new Date()),
    pickupPickerValue: buildPickerValue(buildPickupPickerState(new Date())),
    paymentGuideVisible: false,
    paymentGuideText: PAYMENT_GUIDE_TEXT,
  },

  onShow() {
    this.syncCheckout()
  },

  syncCheckout() {
    const checkoutState = buildCheckoutState(loadStoredCustomerCart())
    const phoneHistory = loadStoredPhoneHistory()
    const currentPhone = this.data.phone.trim()

    this.setData({
      checkoutSource: checkoutState.source,
      checkoutItems: buildCheckoutDisplayItems(checkoutState.items),
      totalAmount: checkoutState.totalAmount,
      totalQuantity: checkoutState.totalQuantity,
      phone: currentPhone.length > 0 ? currentPhone : (phoneHistory[0] ?? ''),
      phoneHistoryItems: phoneHistory.map((phone) => ({ label: phone })),
      ...buildPickupPatch(this.data.pickupPickerState.indexes),
    })
  },

  handlePhoneChange(event) {
    this.setData({
      phone: extractPhone(event.detail).trim(),
      phoneError: '',
    })
  },

  handleOpenPhoneHistory() {
    if (this.data.phoneHistoryItems.length === 0) {
      return
    }

    this.setData({
      phoneHistoryVisible: true,
    })
  },

  handleSelectPhoneHistory(event) {
    const selectedPhone = event.detail.selected?.label
    if (typeof selectedPhone !== 'string') {
      return
    }

    this.setData({
      phone: selectedPhone,
      phoneError: '',
      phoneHistoryVisible: false,
    })
  },

  handleClosePhoneHistory() {
    this.setData({
      phoneHistoryVisible: false,
    })
  },

  handleOpenPickupPicker() {
    this.setData({
      pickupPickerVisible: true,
    })
  },

  handlePickupPick(event) {
    const detail = event.detail
    if (typeof detail.column !== 'number' || typeof detail.index !== 'number') {
      return
    }

    const nextIndexes: PickupPickerIndexes = { ...this.data.pickupPickerState.indexes }
    if (detail.column === 0) {
      nextIndexes.monthIndex = detail.index
      nextIndexes.dayIndex = 0
    }

    if (detail.column === 1) {
      nextIndexes.dayIndex = detail.index
    }

    if (detail.column === 2) {
      nextIndexes.timeIndex = detail.index
    }

    this.setData({
      ...buildPickupPatch(nextIndexes),
    })
  },

  handlePickupConfirm(event) {
    const nextIndexes = extractIndexesFromConfirm(event.detail, this.data.pickupPickerState.indexes)

    this.setData({
      pickupPickerVisible: false,
      pickupError: '',
      ...buildPickupPatch(nextIndexes),
    })
  },

  handlePickupCancel() {
    this.setData({
      pickupPickerVisible: false,
    })
  },

  async handleSubmit() {
    if (this.data.checkoutItems.length === 0) {
      return
    }

    const phone = this.data.phone.trim()
    if (!isValidPhone(phone)) {
      this.setData({
        phoneError: '请输入有效的 11 位手机号',
      })
      return
    }

    const pickupSlot: PickupSlot | null = resolvePickupSlotFromIndexes(this.data.pickupPickerState.indexes, new Date())
    if (pickupSlot === null) {
      this.setData({
        pickupError: '请选择一个有效的取货时间',
      })
      return
    }

    const allowed = await runCustomerAuthorizedAction(async () => {
      const repository = createLocalCustomerOrderRepository(wx)
      await repository.createDraftOrder({
        source: this.data.checkoutSource,
        items: this.data.checkoutItems,
        contact: {
          phone,
        },
        pickupSlot,
        totalAmount: this.data.totalAmount,
      })

      savePhoneToHistory(wx, phone)

      const nextCartItems = removeSubmittedCartItems(loadStoredCustomerCart(), this.data.checkoutItems)
      saveStoredCustomerCart(nextCartItems)

      this.setData({
        paymentGuideVisible: true,
        phoneError: '',
        pickupError: '',
        phoneHistoryItems: loadStoredPhoneHistory().map((historyPhone) => ({ label: historyPhone })),
      })
    })

    if (!allowed) {
      wx.showToast({
        title: '请先完成微信登录',
        icon: 'none',
      })
    }
  },

  handlePaymentGuideConfirm() {
    this.setData({
      paymentGuideVisible: false,
    })

    wx.redirectTo({
      url: '/pages/customer/orders/orders',
    })
  },
})
