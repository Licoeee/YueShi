import type { CustomerLocalSession } from '../../../types/customer-session'
import { clearStoredCustomerSession, loadStoredCustomerSession, saveStoredCustomerSession } from '../../utils/customer-session-storage'
import { createGuestCustomerSession, requestCustomerLoginSession } from '../../utils/customer-session'

interface CustomerProfileSceneData {
  session: CustomerLocalSession
  avatarText: string
  statusLabel: string
}

function resolveAvatarText(session: CustomerLocalSession): string {
  const nickname = session.nickname.trim()
  return nickname.length > 0 ? nickname.slice(0, 1).toUpperCase() : '客'
}

function buildScenePatch(session: CustomerLocalSession): CustomerProfileSceneData {
  return {
    session,
    avatarText: resolveAvatarText(session),
    statusLabel: session.isLoggedIn ? '已登录' : '未登录',
  }
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

  data: buildScenePatch(createGuestCustomerSession()) as CustomerProfileSceneData,

  lifetimes: {
    attached(): void {
      this.syncSession()
    },
  },

  pageLifetimes: {
    show(): void {
      this.syncSession()
    },
  },

  methods: {
    syncSession(): void {
      this.setData(buildScenePatch(loadStoredCustomerSession()))
    },

    async handleLoginTap(): Promise<void> {
      if (this.data.session.isLoggedIn) {
        wx.showToast({
          title: '当前已登录',
          icon: 'none',
        })
        return
      }

      const session = await requestCustomerLoginSession()
      if (session === null) {
        wx.showToast({
          title: '微信登录未完成',
          icon: 'none',
        })
        return
      }

      saveStoredCustomerSession(session)
      this.syncSession()
      wx.showToast({
        title: '登录成功',
        icon: 'success',
      })
    },

    handleLogoutTap(): void {
      clearStoredCustomerSession()
      this.syncSession()
      wx.showToast({
        title: '已退出登录',
        icon: 'success',
      })
    },

    handleSettingsTap(): void {
      wx.navigateTo({
        url: '/pages/customer/settings/settings',
      })
    },

    handleDeletedOrderQueryTap(): void {
      wx.navigateTo({
        url: '/pages/customer/order-recycle/order-recycle',
      })
    },

    handlePreviewReturnTap(): void {
      this.triggerEvent('sceneaction', {
        action: 'preview-return',
      })
    },
  },
})
