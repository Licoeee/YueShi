import type { RoleSession, RoleType } from '../../types/role'
import { getRoleEntryPathByRole } from './role-tabbar'

export const ROLE_DIRECTORY_STORAGE_KEY = 'yueshi:role-directory:v1'

export interface MerchantRoleBinding {
  openId: string
  shopName: string
}

export interface RoleDirectory {
  admins: string[]
  merchants: MerchantRoleBinding[]
}

export interface RoleDirectoryAdapter {
  getStorageSync(key: string): unknown
}

export interface ResolvedRolePayload {
  openId: string
  role: RoleType
  merchantName?: string
}

const DEFAULT_ROLE_DIRECTORY: RoleDirectory = {
  admins: [],
  merchants: [],
}

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

function normalizeShopName(rawValue: unknown): string | null {
  if (typeof rawValue !== 'string') {
    return null
  }

  const shopName = rawValue.trim()
  if (shopName.length === 0) {
    return null
  }

  return shopName
}

function normalizeRoleType(rawValue: unknown): RoleType | null {
  if (rawValue === 'admin' || rawValue === 'merchant' || rawValue === 'customer') {
    return rawValue
  }

  return null
}

export function createDefaultRoleSession(): RoleSession {
  return {
    currentRole: 'customer',
    availableRoles: ['customer'],
    isPreviewMode: false,
  }
}

function createAdminRoleSession(): RoleSession {
  return {
    currentRole: 'admin',
    availableRoles: ['admin', 'merchant', 'customer'],
    isPreviewMode: false,
  }
}

function createMerchantRoleSession(shopName: string): RoleSession {
  return {
    currentRole: 'merchant',
    availableRoles: ['merchant', 'customer'],
    isPreviewMode: false,
    merchantName: shopName,
  }
}

export function createRoleSessionFromResolvedRolePayload(payload: ResolvedRolePayload): RoleSession {
  if (payload.role === 'admin') {
    return createAdminRoleSession()
  }

  if (payload.role === 'merchant') {
    return createMerchantRoleSession(normalizeShopName(payload.merchantName) ?? '你的店铺')
  }

  return createDefaultRoleSession()
}

export function createRolePreviewSession(roleType: RoleType, merchantName?: string): RoleSession {
  if (roleType === 'admin') {
    return {
      ...createAdminRoleSession(),
      isPreviewMode: true,
    }
  }

  if (roleType === 'merchant') {
    return {
      ...createMerchantRoleSession(normalizeShopName(merchantName) ?? '预览店铺'),
      availableRoles: ['admin', 'merchant', 'customer'],
      isPreviewMode: true,
    }
  }

  return {
    ...createAdminRoleSession(),
    currentRole: 'customer',
    isPreviewMode: true,
  }
}

export function parseRoleDirectory(rawValue: unknown): RoleDirectory {
  if (typeof rawValue !== 'object' || rawValue === null) {
    return DEFAULT_ROLE_DIRECTORY
  }

  const candidate = rawValue as {
    admins?: unknown
    merchants?: unknown
  }

  const admins = Array.isArray(candidate.admins)
    ? Array.from(new Set(candidate.admins.map(normalizeOpenId).filter((value): value is string => value !== null)))
    : []

  const merchants = Array.isArray(candidate.merchants)
    ? candidate.merchants
        .map((item): MerchantRoleBinding | null => {
          if (typeof item !== 'object' || item === null) {
            return null
          }

          const openId = normalizeOpenId((item as { openId?: unknown }).openId)
          const shopName = normalizeShopName((item as { shopName?: unknown }).shopName)
          if (openId === null || shopName === null) {
            return null
          }

          return {
            openId,
            shopName,
          }
        })
        .filter((value): value is MerchantRoleBinding => value !== null)
    : []

  return {
    admins,
    merchants,
  }
}

export function parseResolvedRolePayload(rawValue: unknown): ResolvedRolePayload | null {
  if (typeof rawValue !== 'object' || rawValue === null) {
    return null
  }

  const openId = normalizeOpenId((rawValue as { openId?: unknown }).openId)
  const role = normalizeRoleType((rawValue as { role?: unknown }).role)
  if (openId === null || role === null) {
    return null
  }

  const merchantName = normalizeShopName((rawValue as { merchantName?: unknown }).merchantName) ?? undefined

  return merchantName === undefined
    ? { openId, role }
    : {
        openId,
        role,
        merchantName,
      }
}

export function findExplicitRoleSessionByOpenId(openId: string, directory: RoleDirectory): RoleSession | null {
  const normalizedOpenId = normalizeOpenId(openId)
  if (normalizedOpenId === null) {
    return null
  }

  if (directory.admins.includes(normalizedOpenId)) {
    return createAdminRoleSession()
  }

  const merchant = directory.merchants.find((item) => item.openId === normalizedOpenId)
  if (merchant !== undefined) {
    return createMerchantRoleSession(merchant.shopName)
  }

  return null
}

export function resolveRoleSessionByOpenId(openId: string, directory: RoleDirectory): RoleSession {
  const explicitSession = findExplicitRoleSessionByOpenId(openId, directory)
  if (explicitSession !== null) {
    return explicitSession
  }

  return createDefaultRoleSession()
}

export function findExplicitRoleSessionByOpenIdWithAdapter(
  openId: string,
  adapter: RoleDirectoryAdapter,
): RoleSession | null {
  const directory = parseRoleDirectory(adapter.getStorageSync(ROLE_DIRECTORY_STORAGE_KEY))

  return findExplicitRoleSessionByOpenId(openId, directory)
}

export function queryRoleSessionByOpenIdWithAdapter(openId: string, adapter: RoleDirectoryAdapter): RoleSession {
  const explicitSession = findExplicitRoleSessionByOpenIdWithAdapter(openId, adapter)

  return explicitSession ?? createDefaultRoleSession()
}

export function queryRoleSessionByOpenId(openId: string): RoleSession {
  return queryRoleSessionByOpenIdWithAdapter(openId, {
    getStorageSync(key: string): unknown {
      return wx.getStorageSync(key)
    },
  })
}

export function getRoleWelcomeMessage(session: RoleSession): string | null {
  if (session.currentRole === 'admin') {
    return '欢迎回来，最高指挥官大帅！'
  }

  if (session.currentRole === 'merchant') {
    const merchantName = normalizeShopName(session.merchantName) ?? '你的店铺'

    return `生意兴隆，${merchantName}的老板！`
  }

  return null
}

export function getRoleEntryPath(roleType: RoleType): string {
  return getRoleEntryPathByRole(roleType)
}
