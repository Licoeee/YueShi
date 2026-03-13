import type { RoleType } from '../../../../types/role'

interface CustomerOrdersPageData {
  activeRole: RoleType
  isPreviewMode: boolean
}

Page<CustomerOrdersPageData, { onShow(): void }>({
  data: {
    activeRole: 'customer',
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
