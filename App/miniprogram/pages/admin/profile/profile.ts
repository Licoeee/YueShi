import type { RoleType } from '../../../../types/role'
import { createRolePreviewSession, getRoleEntryPath } from '../../../utils/role-routing'

interface RoleSwitchOption {
  role: RoleType
  label: string
  note: string
}

interface SceneActionDetail {
  action?: unknown
  role?: unknown
}

interface AdminProfilePageData {
  activeRole: RoleType
  roleSwitchOptions: RoleSwitchOption[]
  isPreviewMode: boolean
}

function parseRoleType(rawValue: unknown): RoleType | null {
  if (rawValue === 'admin' || rawValue === 'merchant' || rawValue === 'customer') {
    return rawValue
  }

  return null
}

function getRoleLabel(roleType: RoleType): string {
  if (roleType === 'admin') {
    return '管理员'
  }

  if (roleType === 'merchant') {
    return '商家'
  }

  return '顾客'
}

Page<
  AdminProfilePageData,
  {
    onShow(): void
    handleSceneAction(event: WechatMiniprogram.CustomEvent<SceneActionDetail>): void
    switchToRole(targetRole: RoleType): void
  }
>({
  data: {
    activeRole: 'admin',
    isPreviewMode: false,
    roleSwitchOptions: [
      { role: 'admin', label: '管理员视角', note: '审核与巡检入口' },
      { role: 'merchant', label: '商家视角', note: '订单与商品工作台' },
      { role: 'customer', label: '顾客视角', note: '选购与订单入口' },
    ],
  },

  onShow() {
    const roleSession = getApp<IAppOption>().globalData.roleSession
    const currentRole = parseRoleType(roleSession?.currentRole)
    if (currentRole !== null) {
      this.setData({
        activeRole: currentRole,
        isPreviewMode: roleSession?.isPreviewMode ?? false,
      })
    }
  },

  handleSceneAction(event) {
    if (event.detail.action !== 'switch-role') {
      return
    }

    const targetRole = parseRoleType(event.detail.role)
    if (targetRole === null) {
      return
    }

    this.switchToRole(targetRole)
  },

  switchToRole(targetRole) {
    const app = getApp<IAppOption>()
    app.globalData.roleSession = createRolePreviewSession(targetRole, app.globalData.roleSession?.merchantName)

    wx.showToast({
      title: `已切换为${getRoleLabel(targetRole)}预览`,
      icon: 'none',
      duration: 980,
    })

    setTimeout((): void => {
      wx.reLaunch({
        url: getRoleEntryPath(targetRole),
      })
    }, 1000)
  },
})
