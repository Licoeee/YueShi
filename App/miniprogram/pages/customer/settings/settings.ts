import type { CustomerLocalSession } from '../../../../types/customer-session'
import { loadStoredCustomerCart, saveStoredCustomerCart } from '../../../utils/customer-cart-storage'
import {
  clearStoredPhoneHistory,
  loadStoredPhoneHistory,
  removePhoneFromHistory,
} from '../../../utils/customer-phone-history-storage'
import { loadStoredCustomerOrders, saveStoredCustomerOrders } from '../../../utils/customer-order-storage'
import { createGuestCustomerSession } from '../../../utils/customer-session'
import { loadStoredCustomerSession } from '../../../utils/customer-session-storage'

type CustomerSettingsClearTarget = 'cart' | 'orders' | 'phones' | ''

interface CustomerSettingsPageData {
  session: CustomerLocalSession
  cartCount: number
  orderCount: number
  phoneHistory: string[]
  clearTarget: CustomerSettingsClearTarget
  clearDialogVisible: boolean
  clearDialogTitle: string
  clearDialogContent: string
}

function buildDialogCopy(target: CustomerSettingsClearTarget): Pick<
  CustomerSettingsPageData,
  'clearDialogTitle' | 'clearDialogContent'
> {
  if (target === 'cart') {
    return {
      clearDialogTitle: '清理购物车',
      clearDialogContent: '确认清空本地购物车吗？该操作不会影响已生成的本地订单。',
    }
  }

  if (target === 'orders') {
    return {
      clearDialogTitle: '清理本地订单',
      clearDialogContent: '确认删除当前设备上的本地订单记录吗？备注与状态也会一并移除。',
    }
  }

  if (target === 'phones') {
    return {
      clearDialogTitle: '清空手机号历史',
      clearDialogContent: '确认清空历史手机号吗？后续提交订单仍可重新记录。',
    }
  }

  return {
    clearDialogTitle: '',
    clearDialogContent: '',
  }
}

Page<
  CustomerSettingsPageData,
  {
    onShow(): void
    syncPageState(): void
    handleOpenClearDialog(event: WechatMiniprogram.BaseEvent): void
    handleCloseClearDialog(): void
    handleConfirmClear(): void
    handleRemovePhone(event: WechatMiniprogram.BaseEvent): void
  }
>({
  data: {
    session: createGuestCustomerSession(),
    cartCount: 0,
    orderCount: 0,
    phoneHistory: [],
    clearTarget: '',
    clearDialogVisible: false,
    clearDialogTitle: '',
    clearDialogContent: '',
  },

  onShow() {
    this.syncPageState()
  },

  syncPageState() {
    this.setData({
      session: loadStoredCustomerSession(),
      cartCount: loadStoredCustomerCart().length,
      orderCount: loadStoredCustomerOrders().length,
      phoneHistory: loadStoredPhoneHistory(),
    })
  },

  handleOpenClearDialog(event) {
    const target = (event.currentTarget.dataset as { target?: unknown }).target
    if (target !== 'cart' && target !== 'orders' && target !== 'phones') {
      return
    }

    this.setData({
      clearTarget: target,
      clearDialogVisible: true,
      ...buildDialogCopy(target),
    })
  },

  handleCloseClearDialog() {
    this.setData({
      clearTarget: '',
      clearDialogVisible: false,
      ...buildDialogCopy(''),
    })
  },

  handleConfirmClear() {
    if (this.data.clearTarget === 'cart') {
      saveStoredCustomerCart([])
    }

    if (this.data.clearTarget === 'orders') {
      saveStoredCustomerOrders([])
    }

    if (this.data.clearTarget === 'phones') {
      clearStoredPhoneHistory()
    }

    if (this.data.clearTarget.length > 0) {
      wx.showToast({
        title: '本地数据已更新',
        icon: 'success',
      })
    }

    this.handleCloseClearDialog()
    this.syncPageState()
  },

  handleRemovePhone(event) {
    const phone = (event.currentTarget.dataset as { phone?: unknown }).phone
    if (typeof phone !== 'string' || phone.length === 0) {
      return
    }

    removePhoneFromHistory(wx, phone)
    this.syncPageState()
    wx.showToast({
      title: '已移除手机号',
      icon: 'success',
    })
  },
})
