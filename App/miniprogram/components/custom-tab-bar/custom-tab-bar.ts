import type { RoleType } from '../../../types/role'
import {
  getRoleTabbarItems,
  getRoleTabbarValueByPath,
  type RoleTabbarItem,
} from '../../utils/role-tabbar'
import {
  normalizePagePath,
  resolveTabRouteAction,
  type RouteStackPage,
  type TabRouteAction,
} from '../../utils/tab-route-strategy'
import { warmPagePaths, warmRoleTabbarPages, type PagePreloadAdapter } from '../../utils/role-page-preload'

interface CustomTabBarData {
  items: RoleTabbarItem[]
  currentValue: string
}

interface TabBarChangeEventDetail {
  value?: unknown
}

let isRouteSwitching = false

function parseRoleType(rawValue: unknown): RoleType | null {
  if (rawValue === 'admin' || rawValue === 'merchant' || rawValue === 'customer') {
    return rawValue
  }

  return null
}

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
  },

  methods: {
    resolveRoleType(): RoleType {
      const roleFromProperty = parseRoleType(this.properties.role)
      if (roleFromProperty !== null) {
        return roleFromProperty
      }

      const app = getApp<IAppOption>()
      const roleFromGlobal = parseRoleType(app.globalData.roleSession?.currentRole)

      return roleFromGlobal ?? 'customer'
    },

    syncTabBarState(): void {
      const roleType = this.resolveRoleType()
      const items = getRoleTabbarItems(roleType)
      const roleCurrentValue = getRoleTabbarValueByPath(normalizePagePath(this.properties.currentPath))
      const currentValue =
        roleCurrentValue !== null && items.some((item) => item.value === roleCurrentValue)
          ? roleCurrentValue
          : (items[0]?.value ?? '')

      this.setData({
        items,
        currentValue,
      })

      warmRoleTabbarPages(
        roleType,
        normalizePagePath(this.properties.currentPath),
        wx as Partial<PagePreloadAdapter>,
      )
    },

    handleTabChange(event: WechatMiniprogram.CustomEvent<TabBarChangeEventDetail>): void {
      if (isRouteSwitching) {
        return
      }

      const rawValue = event.detail.value
      const selectedValue = typeof rawValue === 'string' ? rawValue : null
      if (selectedValue === null) {
        return
      }

      const targetPath = this.data.items.find((item) => item.value === selectedValue)?.path
      if (targetPath === undefined) {
        return
      }

      if (normalizePagePath(this.properties.currentPath) === targetPath) {
        return
      }

      isRouteSwitching = true
      this.setData({
        currentValue: selectedValue,
      })

      warmPagePaths([targetPath], wx as Partial<PagePreloadAdapter>)
      executeTabRouteAction(resolveTabRouteAction(getRouteStackPages(), targetPath), targetPath)
    },
  },
})
