import type { OrderStatus } from './order'
import type { RoleSession, RoleType } from './role'

export type UserStatus = 'active' | 'pending-review' | 'blacklisted' | 'disabled'

export interface BaseUserProfile {
  openId: string
  nickname: string
  avatarUrl?: string
  phone?: string
  roles: RoleType[]
  currentRole: RoleType
  status: UserStatus
}

export interface CustomerProfile extends BaseUserProfile {
  defaultPickupReminderEnabled: boolean
  lastOrderStatus?: OrderStatus
}

export interface MerchantProfile extends BaseUserProfile {
  shopName: string
  verificationCode?: string
  orderReminderEnabled: boolean
  blacklistedOpenIds: string[]
}

export interface AdminProfile extends BaseUserProfile {
  displayTitle: string
  reviewPermission: boolean
  previewableRoles: RoleType[]
}

export interface UserIdentity {
  session: RoleSession
  profile: CustomerProfile | MerchantProfile | AdminProfile
}
