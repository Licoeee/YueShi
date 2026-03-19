import type { CustomerLocalSession } from '../../types/customer-session'

interface LoginResultLike {
  code?: string
}

interface UserInfoLike {
  nickName?: string
  avatarUrl?: string
}

interface UserProfileResultLike {
  userInfo?: UserInfoLike
}

interface WechatLoginLike {
  login(options: {
    success(result: LoginResultLike): void
    fail(error: unknown): void
  }): void
  getUserProfile?(options: {
    desc: string
    success(result: UserProfileResultLike): void
    fail(error: unknown): void
  }): void
}

function resolveNowText(now: Date = new Date()): string {
  return now.toISOString()
}

export function createGuestCustomerSession(): CustomerLocalSession {
  return {
    isLoggedIn: false,
    openIdLikeId: '',
    nickname: '微信用户',
    avatarUrl: '',
    lastLoginAt: '',
  }
}

export function isCustomerLoggedIn(session: CustomerLocalSession): boolean {
  return session.isLoggedIn && session.openIdLikeId.trim().length > 0
}

export function normalizeCustomerSession(rawValue: unknown): CustomerLocalSession {
  if (typeof rawValue !== 'object' || rawValue === null) {
    return createGuestCustomerSession()
  }

  const raw = rawValue as Partial<CustomerLocalSession>
  const normalized: CustomerLocalSession = {
    isLoggedIn: raw.isLoggedIn === true,
    openIdLikeId: typeof raw.openIdLikeId === 'string' ? raw.openIdLikeId : '',
    nickname: typeof raw.nickname === 'string' && raw.nickname.trim().length > 0 ? raw.nickname : '微信用户',
    avatarUrl: typeof raw.avatarUrl === 'string' ? raw.avatarUrl : '',
    lastLoginAt: typeof raw.lastLoginAt === 'string' ? raw.lastLoginAt : '',
  }

  if (!isCustomerLoggedIn(normalized)) {
    return createGuestCustomerSession()
  }

  return normalized
}

function resolveDefaultWechatApi(): WechatLoginLike {
  const maybeWechat = (globalThis as { wx?: WechatLoginLike }).wx
  if (maybeWechat === undefined) {
    throw new Error('Mini program wx runtime is unavailable')
  }

  return maybeWechat
}

function requestLoginCode(wechat: WechatLoginLike): Promise<LoginResultLike> {
  return new Promise<LoginResultLike>((resolve, reject) => {
    wechat.login({
      success: resolve,
      fail: reject,
    })
  })
}

function requestUserProfile(wechat: WechatLoginLike): Promise<UserProfileResultLike> {
  return new Promise<UserProfileResultLike>((resolve, reject) => {
    if (typeof wechat.getUserProfile !== 'function') {
      reject(new Error('getUserProfile unavailable'))
      return
    }

    wechat.getUserProfile({
      desc: '用于完成顾客端关键动作前的登录确认',
      success: resolve,
      fail: reject,
    })
  })
}

function resolveErrorMessage(error: unknown): string {
  if (typeof error === 'string') {
    return error
  }

  if (typeof error === 'object' && error !== null) {
    const errMsg = (error as { errMsg?: unknown }).errMsg
    if (typeof errMsg === 'string') {
      return errMsg
    }
  }

  if (error instanceof Error) {
    return error.message
  }

  return ''
}

function isUserProfileAuthorizationRejected(error: unknown): boolean {
  const message = resolveErrorMessage(error).toLowerCase()
  if (message.length === 0) {
    return false
  }

  return (
    message.includes('deny') ||
    message.includes('denied') ||
    message.includes('auth deny') ||
    message.includes('auth denied') ||
    message.includes('denied by user') ||
    message.includes('user deny') ||
    message.includes('cancel')
  )
}

async function requestOptionalUserProfile(wechat: WechatLoginLike): Promise<UserProfileResultLike | null> {
  if (typeof wechat.getUserProfile !== 'function') {
    return null
  }

  try {
    return await requestUserProfile(wechat)
  } catch (error) {
    if (isUserProfileAuthorizationRejected(error)) {
      throw error
    }

    return null
  }
}

function resolveAppIdentity(): string {
  const maybeGetApp = (globalThis as { getApp?: () => IAppOption }).getApp
  if (typeof maybeGetApp !== 'function') {
    return ''
  }

  try {
    const app = maybeGetApp()
    return app.globalData.userIdentity?.openId ?? app.globalData.openId ?? ''
  } catch {
    return ''
  }
}

export async function requestCustomerLoginSession(
  wechat: WechatLoginLike = resolveDefaultWechatApi(),
  now: Date = new Date(),
): Promise<CustomerLocalSession | null> {
  try {
    const loginResult = await requestLoginCode(wechat)
    const profileResult = await requestOptionalUserProfile(wechat)

    const openIdLikeId = resolveAppIdentity() || loginResult.code || `local-customer-${now.getTime()}`
    const nickname = profileResult?.userInfo?.nickName?.trim() || '微信用户'
    const avatarUrl = profileResult?.userInfo?.avatarUrl ?? ''

    return {
      isLoggedIn: true,
      openIdLikeId,
      nickname,
      avatarUrl,
      lastLoginAt: resolveNowText(now),
    }
  } catch {
    return null
  }
}
