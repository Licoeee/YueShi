import type { RoleType } from '../../../../types/role'

interface MerchantProductsPageData {
  activeRole: RoleType
  isPreviewMode: boolean
}

Page<MerchantProductsPageData, { onShow(): void }>({
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
