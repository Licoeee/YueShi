import type { RoleType } from '../../../../types/role'

interface AdminReviewsPageData {
  activeRole: RoleType
  isPreviewMode: boolean
}

Page<AdminReviewsPageData, { onShow(): void }>({
  data: {
    activeRole: 'admin',
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
