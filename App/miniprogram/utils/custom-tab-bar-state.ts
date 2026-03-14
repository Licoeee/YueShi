import type { RoleType } from '../../types/role'
import { getRoleTabbarItems, getRoleTabbarValueByPath, type RoleTabbarItem } from './role-tabbar'
import { normalizePagePath } from './tab-route-strategy'

export interface CustomTabBarDataPatch {
  items?: RoleTabbarItem[]
  currentValue?: string
}

export interface CustomTabBarSyncResult {
  roleType: RoleType
  currentPath: string
  dataPatch: CustomTabBarDataPatch | null
  shouldWarm: boolean
}

export interface BuildCustomTabBarSyncResultOptions {
  roleFromProperty: unknown
  roleFromGlobal: unknown
  currentPath: string
  currentItems: readonly RoleTabbarItem[]
  currentValue: string
  lastWarmRoleType?: RoleType | null
  lastWarmPath?: string | null
}

function parseRoleType(rawValue: unknown): RoleType | null {
  if (rawValue === 'admin' || rawValue === 'merchant' || rawValue === 'customer') {
    return rawValue
  }

  return null
}

function normalizeOptionalPath(path: string | null | undefined): string {
  if (typeof path !== 'string' || path.length === 0) {
    return ''
  }

  return normalizePagePath(path)
}

export function buildCustomTabBarSyncResult({
  roleFromProperty,
  roleFromGlobal,
  currentPath,
  currentItems,
  currentValue,
  lastWarmRoleType = null,
  lastWarmPath = null,
}: BuildCustomTabBarSyncResultOptions): CustomTabBarSyncResult {
  const roleType = parseRoleType(roleFromProperty) ?? parseRoleType(roleFromGlobal) ?? 'customer'
  const normalizedCurrentPath = normalizeOptionalPath(currentPath)
  const items = getRoleTabbarItems(roleType)
  const matchedValue =
    normalizedCurrentPath.length > 0 ? getRoleTabbarValueByPath(normalizedCurrentPath) : null
  const nextCurrentValue =
    matchedValue !== null && items.some((item) => item.value === matchedValue) ? matchedValue : (items[0]?.value ?? '')

  const dataPatch: CustomTabBarDataPatch = {}
  if (currentItems !== items) {
    dataPatch.items = items
  }
  if (currentValue !== nextCurrentValue) {
    dataPatch.currentValue = nextCurrentValue
  }

  return {
    roleType,
    currentPath: normalizedCurrentPath,
    dataPatch: Object.keys(dataPatch).length > 0 ? dataPatch : null,
    shouldWarm:
      lastWarmRoleType !== roleType || normalizeOptionalPath(lastWarmPath) !== normalizedCurrentPath,
  }
}
