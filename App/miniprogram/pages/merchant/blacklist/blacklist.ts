import type { MerchantBlacklistEntry } from '../../../../types/merchant-blacklist'
import {
  addOpenIdToMerchantBlacklist,
  loadMerchantBlacklistSnapshot,
  removeOpenIdFromMerchantBlacklist,
} from '../../../utils/merchant-blacklist-storage'

interface InputDetail {
  value?: unknown
}

interface MerchantBlacklistPageData {
  openIdInput: string
  entries: MerchantBlacklistEntry[]
  removeDialogVisible: boolean
  pendingRemoveOpenId: string
}

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

Page<
  MerchantBlacklistPageData,
  {
    onShow(): void
    syncEntries(): void
    handleOpenIdInputChange(event: WechatMiniprogram.CustomEvent<InputDetail>): void
    handleAddOpenId(): void
    handleRequestRemoveOpenId(event: WechatMiniprogram.BaseEvent): void
    handleCloseRemoveDialog(): void
    handleConfirmRemoveOpenId(): void
  }
>({
  data: {
    openIdInput: '',
    entries: [],
    removeDialogVisible: false,
    pendingRemoveOpenId: '',
  },

  onShow() {
    this.syncEntries()
  },

  syncEntries() {
    this.setData({
      entries: loadMerchantBlacklistSnapshot(wx),
    })
  },

  handleOpenIdInputChange(event) {
    this.setData({
      openIdInput: parseInputValue(event.detail).trim(),
    })
  },

  handleAddOpenId() {
    const openId = this.data.openIdInput.trim()
    if (openId.length === 0) {
      wx.showToast({
        title: '请输入 OpenID',
        icon: 'none',
      })
      return
    }

    addOpenIdToMerchantBlacklist(wx, openId)
    this.setData({
      openIdInput: '',
    })
    this.syncEntries()
    wx.showToast({
      title: '已加入黑名单',
      icon: 'success',
    })
  },

  handleRequestRemoveOpenId(event) {
    const openId = (event.currentTarget.dataset as { openId?: unknown }).openId
    if (typeof openId !== 'string' || openId.length === 0) {
      return
    }

    this.setData({
      removeDialogVisible: true,
      pendingRemoveOpenId: openId,
    })
  },

  handleCloseRemoveDialog() {
    this.setData({
      removeDialogVisible: false,
      pendingRemoveOpenId: '',
    })
  },

  handleConfirmRemoveOpenId() {
    const openId = this.data.pendingRemoveOpenId
    if (openId.length === 0) {
      this.handleCloseRemoveDialog()
      return
    }

    removeOpenIdFromMerchantBlacklist(wx, openId)
    this.handleCloseRemoveDialog()
    this.syncEntries()
    wx.showToast({
      title: '已解除拉黑',
      icon: 'none',
    })
  },
})
