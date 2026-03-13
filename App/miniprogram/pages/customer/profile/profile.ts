import type { RoleType } from '../../../../types/role'
import { getRoleEntryPath } from '../../../utils/role-routing'

interface SceneActionDetail {
  action?: unknown
}

interface CustomerProfilePageData {
  activeRole: RoleType
  canBackToAdmin: boolean
  isPreviewMode: boolean
}

Page<
  CustomerProfilePageData,
  {
    onShow(): void
    handleBackToAdmin(): void
    handleSceneAction(event: WechatMiniprogram.CustomEvent<SceneActionDetail>): void
  }
>({
  data: {
    activeRole: 'customer',
    canBackToAdmin: false,
    isPreviewMode: false,
  },

  onShow() {
    const roleSession = getApp<IAppOption>().globalData.roleSession
    const roleFromGlobal = roleSession?.currentRole
    if (roleFromGlobal === 'admin' || roleFromGlobal === 'merchant' || roleFromGlobal === 'customer') {
      this.setData({
        activeRole: roleFromGlobal,
        isPreviewMode: roleSession?.isPreviewMode ?? false,
        canBackToAdmin: (roleSession?.isPreviewMode ?? false) && (roleSession?.availableRoles ?? []).includes('admin'),
      })
    }
  },

  handleSceneAction(event) {
    if (event.detail.action === 'preview-return') {
      this.handleBackToAdmin()
    }
  },

  handleBackToAdmin() {
    const app = getApp<IAppOption>()
    const currentSession = app.globalData.roleSession
    app.globalData.roleSession = {
      currentRole: 'admin',
      availableRoles: ['admin', 'merchant', 'customer'],
      isPreviewMode: true,
      merchantName: currentSession?.merchantName,
    }

    wx.reLaunch({
      url: getRoleEntryPath('admin'),
    })
  },
})
