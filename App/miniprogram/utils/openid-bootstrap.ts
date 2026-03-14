export const OPENID_IDENTITY_STORAGE_KEY = 'yueshi:user-identity:v1'
const OPENID_CLOUD_FUNCTION_NAME = 'get-user-openid'

export interface CachedUserIdentity {
  openId: string
  fetchedAt: number
}

export interface OpenIdBootstrapAdapter {
  getStorageSync(key: string): unknown
  setStorageSync(key: string, value: CachedUserIdentity): void
  callFunction(name: string): Promise<unknown>
  now(): number
}

let isCloudReady = false

function normalizeOpenId(rawValue: unknown): string | null {
  if (typeof rawValue !== 'string') {
    return null
  }

  const openId = rawValue.trim()
  if (openId.length === 0) {
    return null
  }

  return openId
}

export function parseCachedUserIdentity(rawValue: unknown): CachedUserIdentity | null {
  if (typeof rawValue !== 'object' || rawValue === null) {
    return null
  }

  const openId = normalizeOpenId((rawValue as { openId?: unknown }).openId)
  const fetchedAt = (rawValue as { fetchedAt?: unknown }).fetchedAt
  if (openId === null || typeof fetchedAt !== 'number' || !Number.isFinite(fetchedAt)) {
    return null
  }

  return {
    openId,
    fetchedAt,
  }
}

export function extractOpenIdFromCloudPayload(rawPayload: unknown): string | null {
  if (typeof rawPayload !== 'object' || rawPayload === null) {
    return null
  }

  return normalizeOpenId((rawPayload as { openId?: unknown }).openId)
}

export async function bootstrapOpenIdWithAdapter(
  adapter: OpenIdBootstrapAdapter,
): Promise<CachedUserIdentity | null> {
  const cachedIdentity = parseCachedUserIdentity(adapter.getStorageSync(OPENID_IDENTITY_STORAGE_KEY))
  if (cachedIdentity !== null) {
    return cachedIdentity
  }

  const cloudPayload = await adapter.callFunction(OPENID_CLOUD_FUNCTION_NAME)
  const openId = extractOpenIdFromCloudPayload(cloudPayload)
  if (openId === null) {
    return null
  }

  const identity: CachedUserIdentity = {
    openId,
    fetchedAt: adapter.now(),
  }
  adapter.setStorageSync(OPENID_IDENTITY_STORAGE_KEY, identity)

  return identity
}

function ensureCloudReady(): void {
  if (isCloudReady) {
    return
  }

  if (typeof wx.cloud !== 'object' || wx.cloud === null) {
    throw new Error('wx.cloud 不可用，无法静默获取 OpenID')
  }

  wx.cloud.init({
    traceUser: true,
  })
  isCloudReady = true
}

function getRuntimeAdapter(): OpenIdBootstrapAdapter {
  return {
    getStorageSync(key: string): unknown {
      return wx.getStorageSync(key)
    },
    setStorageSync(key: string, value: CachedUserIdentity): void {
      wx.setStorageSync(key, value)
    },
    async callFunction(name: string): Promise<unknown> {
      ensureCloudReady()

      return new Promise<unknown>((resolve, reject): void => {
        wx.cloud.callFunction({
          name,
          success(response): void {
            resolve(response.result)
          },
          fail(error): void {
            reject(error)
          },
        })
      })
    },
    now(): number {
      return Date.now()
    },
  }
}

export function readCachedUserIdentity(): CachedUserIdentity | null {
  return parseCachedUserIdentity(wx.getStorageSync(OPENID_IDENTITY_STORAGE_KEY))
}

export async function bootstrapOpenId(): Promise<CachedUserIdentity | null> {
  return bootstrapOpenIdWithAdapter(getRuntimeAdapter())
}
