export interface CustomerLocalSession {
  isLoggedIn: boolean
  openIdLikeId: string
  authTicket?: string
  nickname: string
  avatarUrl: string
  lastLoginAt: string
}

export type CustomerPhoneHistory = string[]
