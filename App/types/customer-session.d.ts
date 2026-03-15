export interface CustomerLocalSession {
  isLoggedIn: boolean
  openIdLikeId: string
  nickname: string
  avatarUrl: string
  lastLoginAt: string
}

export type CustomerPhoneHistory = string[]
