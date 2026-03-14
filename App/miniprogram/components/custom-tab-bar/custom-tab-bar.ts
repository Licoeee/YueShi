import type { RoleType } from '../../../types/role'
import { buildCustomTabBarSyncResult } from '../../utils/custom-tab-bar-state'
import { type RoleTabbarItem } from '../../utils/role-tabbar'
import {
  resolveTabRouteAction,
  type RouteStackPage,
  type TabRouteAction,
} from '../../utils/tab-route-strategy'
import { warmPagePaths, warmRoleTabbarPages, type PagePreloadAdapter } from '../../utils/role-page-preload'
import {
  releaseSceneSwitchLock,
  requestSceneSwitch,
  type SceneSwitchLimiterState,
  type SceneSwitchRequest,
} from '../../utils/scene-switch-rate-limit'

interface CustomTabBarData {
  items: RoleTabbarItem[]
  currentValue: string
}

interface TabBarChangeEventDetail {
  value?: unknown
}

type TabSwitchMode = 'route' | 'scene'
type TabSwitchDirection = 'forward' | 'backward' | 'none'

interface SceneTabChangeEventDetail {
  path: string
  value: string
  direction: TabSwitchDirection
}

interface SceneSwitchRuntimeState {
  limiter: SceneSwitchLimiterState
  releaseTimer: number | null
}

const SCENE_SWITCH_LOCK_MS = 220

let isRouteSwitching = false
const LAST_WARM_STATE_BY_INSTANCE = new WeakMap<object, { roleType: RoleType; currentPath: string }>()
const SCENE_SWITCH_RUNTIME_BY_INSTANCE = new WeakMap<object, SceneSwitchRuntimeState>()

function finishRouteSwitching(): void {
  isRouteSwitching = false
}

function reLaunchTargetPath(targetPath: string): void {
  wx.reLaunch({
    url: targetPath,
    complete(): void {
      finishRouteSwitching()
    },
  })
}

function getRouteStackPages(): RouteStackPage[] {
  return getCurrentPages().map((page) => ({
    route: page.route,
  }))
}

function getSceneSwitchRuntime(instance: object): SceneSwitchRuntimeState {
  const existingState = SCENE_SWITCH_RUNTIME_BY_INSTANCE.get(instance)
  if (existingState !== undefined) {
    return existingState
  }

  const initialState: SceneSwitchRuntimeState = {
    limiter: {
      isLocked: false,
      pendingRequest: null,
    },
    releaseTimer: null,
  }
  SCENE_SWITCH_RUNTIME_BY_INSTANCE.set(instance, initialState)
  return initialState
}

function clearSceneSwitchReleaseTimer(instance: object): void {
  const runtimeState = SCENE_SWITCH_RUNTIME_BY_INSTANCE.get(instance)
  if (runtimeState === undefined || runtimeState.releaseTimer === null) {
    return
  }

  clearTimeout(runtimeState.releaseTimer)
  runtimeState.releaseTimer = null
}

function parseTabSwitchMode(rawValue: unknown): TabSwitchMode {
  if (rawValue === 'scene') {
    return rawValue
  }

  return 'route'
}

function getTabSwitchDirection(
  items: readonly RoleTabbarItem[],
  currentPath: string,
  targetPath: string,
): TabSwitchDirection {
  const currentIndex = items.findIndex((item) => item.path === currentPath)
  const targetIndex = items.findIndex((item) => item.path === targetPath)

  if (currentIndex < 0 || targetIndex < 0 || targetIndex === currentIndex) {
    return 'none'
  }

  return targetIndex > currentIndex ? 'forward' : 'backward'
}

function executeTabRouteAction(action: TabRouteAction, targetPath: string): void {
  if (action.type === 'noop') {
    finishRouteSwitching()
    return
  }

  if (action.type === 'navigateBack') {
    let isFallbackTriggered = false

    wx.navigateBack({
      delta: action.delta,
      fail(error): void {
        isFallbackTriggered = true
        console.warn('[tabbar] navigateBack failed, fallback to reLaunch', error)
        reLaunchTargetPath(targetPath)
      },
      complete(): void {
        if (!isFallbackTriggered) {
          finishRouteSwitching()
        }
      },
    })

    return
  }

  if (action.type === 'navigateTo') {
    let isFallbackTriggered = false

    wx.navigateTo({
      url: action.url,
      fail(error): void {
        isFallbackTriggered = true
        console.warn('[tabbar] navigateTo failed, fallback to reLaunch', error)
        reLaunchTargetPath(targetPath)
      },
      complete(): void {
        if (!isFallbackTriggered) {
          finishRouteSwitching()
        }
      },
    })

    return
  }

  if (action.type === 'navigateToChain') {
    const executeStep = (stepIndex: number): void => {
      const stepUrl = action.urls[stepIndex]
      if (typeof stepUrl !== 'string' || stepUrl.length === 0) {
        finishRouteSwitching()
        return
      }

      let isFallbackTriggered = false
      wx.navigateTo({
        url: stepUrl,
        fail(error): void {
          isFallbackTriggered = true
          console.warn('[tabbar] navigateTo chain failed, fallback to reLaunch', error)
          reLaunchTargetPath(targetPath)
        },
        complete(): void {
          if (isFallbackTriggered) {
            return
          }

          if (stepIndex >= action.urls.length - 1) {
            finishRouteSwitching()
            return
          }

          executeStep(stepIndex + 1)
        },
      })
    }

    executeStep(0)
    return
  }

  reLaunchTargetPath(action.url)
}

Component({
  options: {
    addGlobalClass: true,
  },

  properties: {
    role: {
      type: String,
      value: '',
    },
    mode: {
      type: String,
      value: 'route',
    },
    currentPath: {
      type: String,
      value: '',
    },
  },

  data: {
    items: [],
    currentValue: '',
  } as CustomTabBarData,

  observers: {
    'role, currentPath'(): void {
      this.syncTabBarState()
    },
  },

  lifetimes: {
    attached(): void {
      this.syncTabBarState()
    },
    detached(): void {
      clearSceneSwitchReleaseTimer(this)
      SCENE_SWITCH_RUNTIME_BY_INSTANCE.delete(this)
    },
  },

  pageLifetimes: {
    show(): void {
      this.syncTabBarState()
    },
  },

  methods: {
    syncTabBarState(): void {
      const mode = parseTabSwitchMode(this.properties.mode)
      const lastWarmState = LAST_WARM_STATE_BY_INSTANCE.get(this)
      const syncResult = buildCustomTabBarSyncResult({
        roleFromProperty: this.properties.role,
        roleFromGlobal: getApp<IAppOption>().globalData.roleSession?.currentRole,
        currentPath: this.properties.currentPath,
        currentItems: this.data.items,
        currentValue: this.data.currentValue,
        lastWarmRoleType: lastWarmState?.roleType,
        lastWarmPath: lastWarmState?.currentPath,
      })

      if (syncResult.dataPatch !== null) {
        this.setData(syncResult.dataPatch)
      }

      LAST_WARM_STATE_BY_INSTANCE.set(this, {
        roleType: syncResult.roleType,
        currentPath: syncResult.currentPath,
      })

      if (syncResult.shouldWarm && mode === 'route') {
        warmRoleTabbarPages(syncResult.roleType, syncResult.currentPath, wx as Partial<PagePreloadAdapter>)
      }
    },

    dispatchSceneSwitch(request: SceneSwitchRequest, currentPath: string): void {
      this.setData({
        currentValue: request.targetValue,
      })

      const lastWarmState = LAST_WARM_STATE_BY_INSTANCE.get(this)
      LAST_WARM_STATE_BY_INSTANCE.set(this, {
        roleType: lastWarmState?.roleType ?? 'customer',
        currentPath: request.targetPath,
      })

      const direction = getTabSwitchDirection(this.data.items, currentPath, request.targetPath)
      this.triggerEvent('tabchange', {
        path: request.targetPath,
        value: request.targetValue,
        direction,
      } as SceneTabChangeEventDetail)

      this.scheduleSceneSwitchRelease()
    },

    scheduleSceneSwitchRelease(): void {
      clearSceneSwitchReleaseTimer(this)
      const runtimeState = getSceneSwitchRuntime(this)

      runtimeState.releaseTimer = setTimeout((): void => {
        runtimeState.releaseTimer = null

        const currentPath = LAST_WARM_STATE_BY_INSTANCE.get(this)?.currentPath ?? this.properties.currentPath
        const releaseDecision = releaseSceneSwitchLock(runtimeState.limiter, currentPath)
        runtimeState.limiter = releaseDecision.nextState

        if (releaseDecision.immediateRequest !== null) {
          this.dispatchSceneSwitch(releaseDecision.immediateRequest, currentPath)
        }
      }, SCENE_SWITCH_LOCK_MS)
    },

    handleTabChange(event: WechatMiniprogram.CustomEvent<TabBarChangeEventDetail>): void {
      const rawValue = event.detail.value
      const selectedValue = typeof rawValue === 'string' ? rawValue : null
      if (selectedValue === null) {
        return
      }

      const targetPath = this.data.items.find((item) => item.value === selectedValue)?.path
      if (targetPath === undefined) {
        return
      }

      const currentPath = LAST_WARM_STATE_BY_INSTANCE.get(this)?.currentPath ?? this.properties.currentPath
      if (currentPath === targetPath) {
        return
      }

      const mode = parseTabSwitchMode(this.properties.mode)
      if (mode === 'scene') {
        const runtimeState = getSceneSwitchRuntime(this)
        const switchDecision = requestSceneSwitch(runtimeState.limiter, {
          targetPath,
          targetValue: selectedValue,
        })
        runtimeState.limiter = switchDecision.nextState

        if (switchDecision.immediateRequest !== null) {
          this.dispatchSceneSwitch(switchDecision.immediateRequest, currentPath)
        }
        return
      }

      if (isRouteSwitching) {
        return
      }

      isRouteSwitching = true
      this.setData({
        currentValue: selectedValue,
      })

      warmPagePaths([targetPath], wx as Partial<PagePreloadAdapter>)
      executeTabRouteAction(
        resolveTabRouteAction(getRouteStackPages(), targetPath, {
          currentPath,
          orderedTabPaths: this.data.items.map((item) => item.path),
        }),
        targetPath,
      )
    },
  },
})
