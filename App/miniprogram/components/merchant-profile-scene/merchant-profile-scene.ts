import { loadMerchantBlacklistSnapshot } from '../../utils/merchant-blacklist-storage'

interface MerchantProfileSceneData {
  blacklistCount: number
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
  } as MerchantProfileSceneData,

  lifetimes: {
    attached(): void {
      this.syncBlacklistCount()
    },
  },

  pageLifetimes: {
    show(): void {
      this.syncBlacklistCount()
    },
  },

  methods: {
    syncBlacklistCount(): void {
      this.setData({
        blacklistCount: loadMerchantBlacklistSnapshot(wx).length,
      })
    },

    handleOpenBlacklist(): void {
      wx.navigateTo({
        url: '/pages/merchant/blacklist/blacklist',
      })
    },

    handlePreviewReturnTap(): void {
      this.triggerEvent('sceneaction', {
        action: 'preview-return',
      })
    },
  },
})

