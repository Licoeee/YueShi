import type { RoleType } from '../../types/role'
import { getRoleTabbarPreloadPaths } from './role-tabbar'

export interface PagePreloadAdapter {
  preloadPage(options: { url: string }): void
}

export const warmedRolePagePaths = new Set<string>()

export function warmPagePaths(
  paths: string[],
  adapter: Partial<PagePreloadAdapter>,
  warmedPaths: Set<string> = warmedRolePagePaths,
): string[] {
  const preloadPage = adapter.preloadPage
  if (typeof preloadPage !== 'function') {
    return []
  }

  const warmedPathsInThisCall: string[] = []

  paths.forEach((path) => {
    if (warmedPaths.has(path)) {
      return
    }

    try {
      preloadPage({
        url: path,
      })
      warmedPaths.add(path)
      warmedPathsInThisCall.push(path)
    } catch (error: unknown) {
      console.warn('[role-page-preload] preloadPage failed', error)
    }
  })

  return warmedPathsInThisCall
}

export function warmRoleTabbarPages(
  roleType: RoleType,
  currentPath: string,
  adapter: Partial<PagePreloadAdapter>,
  warmedPaths: Set<string> = warmedRolePagePaths,
): string[] {
  return warmPagePaths(getRoleTabbarPreloadPaths(roleType, currentPath), adapter, warmedPaths)
}
