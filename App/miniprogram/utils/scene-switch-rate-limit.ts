export interface SceneSwitchRequest {
  targetPath: string
  targetValue: string
}

export interface SceneSwitchLimiterState {
  isLocked: boolean
  pendingRequest: SceneSwitchRequest | null
}

export interface SceneSwitchDecision {
  nextState: SceneSwitchLimiterState
  immediateRequest: SceneSwitchRequest | null
}

export function requestSceneSwitch(
  state: SceneSwitchLimiterState,
  request: SceneSwitchRequest,
): SceneSwitchDecision {
  if (!state.isLocked) {
    return {
      nextState: {
        isLocked: true,
        pendingRequest: null,
      },
      immediateRequest: request,
    }
  }

  return {
    nextState: {
      isLocked: true,
      pendingRequest: request,
    },
    immediateRequest: null,
  }
}

export function releaseSceneSwitchLock(
  state: SceneSwitchLimiterState,
  currentPath: string,
): SceneSwitchDecision {
  const pendingRequest = state.pendingRequest
  if (pendingRequest === null || pendingRequest.targetPath === currentPath) {
    return {
      nextState: {
        isLocked: false,
        pendingRequest: null,
      },
      immediateRequest: null,
    }
  }

  return {
    nextState: {
      isLocked: true,
      pendingRequest: null,
    },
    immediateRequest: pendingRequest,
  }
}
