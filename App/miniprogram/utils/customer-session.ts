import type { CustomerLocalSession } from '../../types/customer-session'
import { OPENID_IDENTITY_STORAGE_KEY } from './openid-bootstrap'

const CUSTOMER_LOGIN_CLOUD_FUNCTION_NAME = 'customer-login'

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

interface CloudCallResponseLike {
  result?: unknown
}

interface CustomerLoginCloudPayload {
  openId: string
  sessionTicket: string
  loginAt: number
}

interface CustomerLoginRuntimeLike {
  setStorageSync?(key: string, value: unknown): void
  cloud?: {
    init(options: { traceUser: boolean }): void
    callFunction(options: {
      name: string
      data?: unknown
      success(response: CloudCallResponseLike): void
      fail(error: unknown): void
    }): void
  }
}

let isCloudReady = false

function resolveNowText(now: Date = new Date()): string {
  return now.toISOString()
}

function normalizeNonEmptyString(rawValue: unknown): string | null {
  if (typeof rawValue !== 'string') {
    return null
  }

  const normalized = rawValue.trim()
  return normalized.length > 0 ? normalized : null
}

function normalizeFiniteNumber(rawValue: unknown): number | null {
  if (typeof rawValue !== 'number' || !Number.isFinite(rawValue)) {
    return null
  }

  return rawValue
}

function parseCustomerLoginCloudPayload(rawValue: unknown): CustomerLoginCloudPayload | null {
  if (typeof rawValue !== 'object' || rawValue === null) {
    return null
  }

  const payload = rawValue as {
    openId?: unknown
    sessionTicket?: unknown
    loginAt?: unknown
  }
  const openId = normalizeNonEmptyString(payload.openId)
  const sessionTicket = normalizeNonEmptyString(payload.sessionTicket)
  const loginAt = normalizeFiniteNumber(payload.loginAt)
  if (openId === null || sessionTicket === null || loginAt === null) {
    return null
  }

  return {
    openId,
    sessionTicket,
    loginAt,
  }
}

function resolveRuntimeWx(): CustomerLoginRuntimeLike {
  const runtimeWx = (globalThis as { wx?: CustomerLoginRuntimeLike }).wx
  if (runtimeWx === undefined) {
    throw new Error('Mini program wx runtime is unavailable')
  }

  return runtimeWx
}

function ensureCloudReady(runtimeWx: CustomerLoginRuntimeLike): void {
  if (isCloudReady) {
    return
  }

  if (typeof runtimeWx.cloud !== 'object' || runtimeWx.cloud === null) {
    throw new Error('wx.cloud 不可用，无法执行顾客登录')
  }

  runtimeWx.cloud.init({
    traceUser: true,
  })
  isCloudReady = true
}

function resolveAppInstance(): IAppOption | null {
  const maybeGetApp = (globalThis as { getApp?: () => IAppOption }).getApp
  if (typeof maybeGetApp !== 'function') {
    return null
  }

  try {
    return maybeGetApp()
  } catch {
    return null
  }
}

function syncAppIdentity(openId: string, loginAt: number): void {
  const app = resolveAppInstance()
  if (app !== null) {
    app.globalData.openId = openId
    app.globalData.userIdentity = {
      openId,
      fetchedAt: loginAt,
    }
  }

  try {
    const runtimeWx = resolveRuntimeWx()
    if (typeof runtimeWx.setStorageSync === 'function') {
      runtimeWx.setStorageSync(OPENID_IDENTITY_STORAGE_KEY, {
        openId,
        fetchedAt: loginAt,
      })
    }
  } catch {
    return
  }
}

async function requestCustomerLoginPayload(loginCode: string): Promise<CustomerLoginCloudPayload | null> {
  const runtimeWx = resolveRuntimeWx()
  ensureCloudReady(runtimeWx)

  return new Promise<CustomerLoginCloudPayload | null>((resolve, reject) => {
    runtimeWx.cloud?.callFunction({
      name: CUSTOMER_LOGIN_CLOUD_FUNCTION_NAME,
      data: {
        loginCode,
      },
      success(response): void {
        resolve(parseCustomerLoginCloudPayload(response.result))
      },
      fail(error): void {
        reject(error)
      },
    })
  })
}

export function createGuestCustomerSession(): CustomerLocalSession {
  return {
    isLoggedIn: false,
    openIdLikeId: '',
    authTicket: '',
    nickname: '微信用户',
    avatarUrl: '',
    lastLoginAt: '',
  }
}

export function isCustomerLoggedIn(session: CustomerLocalSession): boolean {
  const ticket = typeof session.authTicket === 'string' ? session.authTicket.trim() : ''
  return session.isLoggedIn && session.openIdLikeId.trim().length > 0 && ticket.length > 0
}

export function normalizeCustomerSession(rawValue: unknown): CustomerLocalSession {
  if (typeof rawValue !== 'object' || rawValue === null) {
    return createGuestCustomerSession()
  }

  const raw = rawValue as Partial<CustomerLocalSession>
  const normalized: CustomerLocalSession = {
    isLoggedIn: raw.isLoggedIn === true,
    openIdLikeId: typeof raw.openIdLikeId === 'string' ? raw.openIdLikeId : '',
    authTicket: typeof raw.authTicket === 'string' ? raw.authTicket : '',
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

export async function requestCustomerLoginSession(
  wechat: WechatLoginLike = resolveDefaultWechatApi(),
  now: Date = new Date(),
): Promise<CustomerLocalSession | null> {
  try {
    const loginResult = await requestLoginCode(wechat)
    const loginCode = normalizeNonEmptyString(loginResult.code)
    if (loginCode === null) {
      return null
    }

    const loginPayload = await requestCustomerLoginPayload(loginCode)
    if (loginPayload === null) {
      return null
    }

    syncAppIdentity(loginPayload.openId, loginPayload.loginAt)
    const profileResult = await requestOptionalUserProfile(wechat)

    const nickname = profileResult?.userInfo?.nickName?.trim() || '微信用户'
    const avatarUrl = profileResult?.userInfo?.avatarUrl ?? ''

    return {
      isLoggedIn: true,
      openIdLikeId: loginPayload.openId,
      authTicket: loginPayload.sessionTicket,
      nickname,
      avatarUrl,
      lastLoginAt: resolveNowText(now),
    }
  } catch {
    return null
  }
}
