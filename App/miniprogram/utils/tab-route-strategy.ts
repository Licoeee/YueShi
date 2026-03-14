export interface RouteStackPage {
  route: string
}

export interface ResolveTabRouteActionOptions {
  currentPath?: string
  orderedTabPaths?: readonly string[]
}

export type TabRouteAction =
  | { type: 'noop' }
  | { type: 'navigateBack'; delta: number }
  | { type: 'navigateTo'; url: string }
  | { type: 'navigateToChain'; urls: string[] }
  | { type: 'reLaunch'; url: string }

const MAX_PAGE_STACK_DEPTH = 10

export function normalizePagePath(path: string): string {
  const queryStartIndex = path.indexOf('?')
  const rawPath = queryStartIndex >= 0 ? path.slice(0, queryStartIndex) : path

  return rawPath.startsWith('/') ? rawPath : `/${rawPath}`
}

function normalizeOptionalPath(path: string | undefined): string {
  if (typeof path !== 'string' || path.length === 0) {
    return ''
  }

  return normalizePagePath(path)
}

function getTabIndex(path: string, orderedTabPaths: readonly string[]): number {
  return orderedTabPaths.findIndex((tabPath) => normalizePagePath(tabPath) === path)
}

function normalizeOrderedTabPaths(orderedTabPaths: readonly string[]): string[] {
  return orderedTabPaths.map((path) => normalizePagePath(path))
}

function canNavigateBackByTabOrder(
  pages: readonly RouteStackPage[],
  normalizedOrderedTabPaths: readonly string[],
  currentTabIndex: number,
  targetTabIndex: number,
): boolean {
  const delta = currentTabIndex - targetTabIndex
  const stackStartIndex = pages.length - delta - 1
  if (delta <= 0 || stackStartIndex < 0) {
    return false
  }

  for (let offset = 0; offset <= delta; offset += 1) {
    const stackPath = normalizePagePath(pages[stackStartIndex + offset].route)
    const tabPath = normalizedOrderedTabPaths[targetTabIndex + offset]
    if (stackPath !== tabPath) {
      return false
    }
  }

  return true
}

export function resolveTabRouteAction(
  pages: readonly RouteStackPage[],
  targetPath: string,
  options: ResolveTabRouteActionOptions = {},
): TabRouteAction {
  const normalizedTargetPath = normalizePagePath(targetPath)
  const currentTopPage = pages.length > 0 ? pages[pages.length - 1] : undefined
  const normalizedTopPath = currentTopPage === undefined ? '' : normalizePagePath(currentTopPage.route)

  if (normalizedTopPath === normalizedTargetPath) {
    return { type: 'noop' }
  }

  const normalizedCurrentPath = normalizeOptionalPath(options.currentPath)
  const effectiveCurrentPath = normalizedCurrentPath.length > 0 ? normalizedCurrentPath : normalizedTopPath
  const orderedTabPaths = Array.isArray(options.orderedTabPaths) ? normalizeOrderedTabPaths(options.orderedTabPaths) : []
  const currentTabIndex = getTabIndex(effectiveCurrentPath, orderedTabPaths)
  const targetTabIndex = getTabIndex(normalizedTargetPath, orderedTabPaths)
  const shouldUseForwardSemantic = currentTabIndex >= 0 && targetTabIndex > currentTabIndex

  if (shouldUseForwardSemantic) {
    const stepPaths = orderedTabPaths.slice(currentTabIndex + 1, targetTabIndex + 1)
    if (pages.length + stepPaths.length > MAX_PAGE_STACK_DEPTH) {
      return {
        type: 'reLaunch',
        url: normalizedTargetPath,
      }
    }

    if (stepPaths.length > 1) {
      return {
        type: 'navigateToChain',
        urls: stepPaths,
      }
    }

    return {
      type: 'navigateTo',
      url: stepPaths[0] ?? normalizedTargetPath,
    }
  }

  const shouldUseBackSemantic = currentTabIndex > targetTabIndex && targetTabIndex >= 0
  if (shouldUseBackSemantic) {
    const delta = currentTabIndex - targetTabIndex
    if (canNavigateBackByTabOrder(pages, orderedTabPaths, currentTabIndex, targetTabIndex)) {
      return {
        type: 'navigateBack',
        delta,
      }
    }

    return {
      type: 'reLaunch',
      url: normalizedTargetPath,
    }
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
