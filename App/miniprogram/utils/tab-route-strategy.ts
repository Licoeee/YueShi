export interface RouteStackPage {
  route: string
}

export type TabRouteAction =
  | { type: 'noop' }
  | { type: 'navigateBack'; delta: number }
  | { type: 'navigateTo'; url: string }
  | { type: 'reLaunch'; url: string }

const MAX_PAGE_STACK_DEPTH = 10

export function normalizePagePath(path: string): string {
  const queryStartIndex = path.indexOf('?')
  const rawPath = queryStartIndex >= 0 ? path.slice(0, queryStartIndex) : path

  return rawPath.startsWith('/') ? rawPath : `/${rawPath}`
}

export function resolveTabRouteAction(
  pages: readonly RouteStackPage[],
  targetPath: string,
): TabRouteAction {
  const normalizedTargetPath = normalizePagePath(targetPath)
  const currentTopPage = pages.length > 0 ? pages[pages.length - 1] : undefined

  if (currentTopPage !== undefined && normalizePagePath(currentTopPage.route) === normalizedTargetPath) {
    return { type: 'noop' }
  }

  for (let index = pages.length - 2; index >= 0; index -= 1) {
    if (normalizePagePath(pages[index].route) === normalizedTargetPath) {
      return {
        type: 'navigateBack',
        delta: pages.length - index - 1,
      }
    }
  }

  if (pages.length >= MAX_PAGE_STACK_DEPTH) {
    return {
      type: 'reLaunch',
      url: normalizedTargetPath,
    }
  }

  return {
    type: 'navigateTo',
    url: normalizedTargetPath,
  }
}
