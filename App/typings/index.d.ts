/// <reference path="./types/index.d.ts" />

interface CachedIdentitySnapshot {
  openId: string
  fetchedAt: number
}

type AppRoleType = 'admin' | 'merchant' | 'customer'

interface RoleSessionSnapshot {
  currentRole: AppRoleType
  availableRoles: AppRoleType[]
  isPreviewMode: boolean
  merchantName?: string
}

interface IAppOption {
  globalData: {
    userInfo?: WechatMiniprogram.UserInfo
    openId?: string
    userIdentity?: CachedIdentitySnapshot
    roleSession?: RoleSessionSnapshot
    roleSessionPromise?: Promise<RoleSessionSnapshot>
  }
  userInfoReadyCallback?: WechatMiniprogram.GetUserInfoSuccessCallback
}
