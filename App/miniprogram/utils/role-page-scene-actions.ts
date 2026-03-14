import type { RoleType } from '../../types/role'
import { createRolePreviewSession, getRoleEntryPath } from './role-routing'

export interface RoleSceneActionDetail {
  action?: unknown
  role?: unknown
}

export function parseRoleType(rawValue: unknown): RoleType | null {
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

export function switchPreviewRole(targetRole: RoleType): void {
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
}

export function returnToAdminPreview(): void {
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
}
