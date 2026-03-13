import type { RoleType } from '../../../../types/role'

interface MerchantOrdersPageData {
  activeRole: RoleType
  isPreviewMode: boolean
}

Page<MerchantOrdersPageData, { onShow(): void }>({
  data: {
    activeRole: 'merchant',
    isPreviewMode: false,
  },

  onShow() {
    const roleSession = getApp<IAppOption>().globalData.roleSession
    const roleFromGlobal = roleSession?.currentRole
    if (roleFromGlobal === 'admin' || roleFromGlobal === 'merchant' || roleFromGlobal === 'customer') {
      this.setData({
        activeRole: roleFromGlobal,
        isPreviewMode: roleSession?.isPreviewMode ?? false,
      })
    }
  },
})
