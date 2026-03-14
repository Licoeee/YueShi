import type { RoleSession, RoleType } from '../../types/role'

interface RoleSessionLike {
  currentRole?: unknown
  availableRoles?: unknown
  isPreviewMode?: unknown
}

export interface RolePageState {
  activeRole: RoleType
  isPreviewMode: boolean
}

export interface PreviewableRolePageState extends RolePageState {
  canBackToAdmin: boolean
}

function parseRoleType(rawValue: unknown): RoleType | null {
  if (rawValue === 'admin' || rawValue === 'merchant' || rawValue === 'customer') {
    return rawValue
  }

  return null
}

function hasAdminRole(rawRoles: unknown): boolean {
  return Array.isArray(rawRoles) && rawRoles.includes('admin')
}

export function buildRolePageState(
  roleSession: RoleSessionLike | RoleSession | undefined,
  fallbackRole: RoleType,
): RolePageState {
  return {
    activeRole: parseRoleType(roleSession?.currentRole) ?? fallbackRole,
    isPreviewMode: roleSession?.isPreviewMode === true,
  }
}

export function buildPreviewableRolePageState(
  roleSession: RoleSessionLike | RoleSession | undefined,
  fallbackRole: RoleType,
): PreviewableRolePageState {
  const baseState = buildRolePageState(roleSession, fallbackRole)

  return {
    ...baseState,
    canBackToAdmin: baseState.isPreviewMode && hasAdminRole(roleSession?.availableRoles),
  }
}

export function buildRolePageDataPatch<T extends object>(currentData: T, nextState: Partial<T>): Partial<T> | null {
  const changedKeys = (Object.keys(nextState) as Array<keyof T>).filter((key) => currentData[key] !== nextState[key])
  if (changedKeys.length === 0) {
    return null
  }

  const patch: Partial<T> = {}
  changedKeys.forEach((key) => {
    patch[key] = nextState[key] as T[typeof key]
  })

  return patch
}
