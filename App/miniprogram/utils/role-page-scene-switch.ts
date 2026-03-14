export type RolePageSceneDirection = 'forward' | 'backward' | 'none'

export interface RolePageSceneSwitchState {
  scenePath: string
  sceneDirection: RolePageSceneDirection
  sceneMotionTick: number
}

export interface RolePageSceneTabChangeDetail {
  path?: unknown
  direction?: unknown
}

function parseSceneDirection(rawValue: unknown): RolePageSceneDirection {
  if (rawValue === 'forward' || rawValue === 'backward' || rawValue === 'none') {
    return rawValue
  }

  return 'none'
}

function parseScenePath(rawValue: unknown): string | null {
  if (typeof rawValue !== 'string') {
    return null
  }

  const normalizedPath = rawValue.trim()
  if (normalizedPath.length === 0) {
    return null
  }

  return normalizedPath
}

export function buildRolePageSceneSwitchPatch(
  currentState: RolePageSceneSwitchState,
  detail: RolePageSceneTabChangeDetail,
): Partial<RolePageSceneSwitchState> | null {
  const nextScenePath = parseScenePath(detail.path)
  if (nextScenePath === null || nextScenePath === currentState.scenePath) {
    return null
  }

  return {
    scenePath: nextScenePath,
    sceneDirection: parseSceneDirection(detail.direction),
    sceneMotionTick: currentState.sceneMotionTick + 1,
  }
}
