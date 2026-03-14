import type { RoleSession } from '../../../types/role'
import { bootstrapRoleSession } from '../../utils/role-bootstrap'
import { warmRoleTabbarPages, type PagePreloadAdapter } from '../../utils/role-page-preload'
import { getRoleEntryPath, getRoleWelcomeMessage } from '../../utils/role-routing'
import type { WelcomeParticle, WelcomeStateSnapshot } from '../../utils/welcome-motion'
import {
  WELCOME_TIMINGS,
  canStartReveal,
  finishRevealState,
  getInitialWelcomeState,
  getRevealDiameterPx,
  startRevealState,
} from '../../utils/welcome-motion'

interface WelcomePageData extends WelcomeStateSnapshot {
  particles: WelcomeParticle[]
  revealDiameterPx: number
  loadingRoleTitle: string
  loadingRoleSubtitle: string
}

interface WelcomePageMethods {
  onLoad(): void
  handleEnterTap(): void
  onShow(): void
  onHide(): void
  onUnload(): void
}

let buttonRevealTimer: number | null = null
let buttonReadyTimer: number | null = null
let revealCompleteTimer: number | null = null

function clearTimer(timerId: number | null): number | null {
  if (timerId !== null) {
    clearTimeout(timerId)
  }

  return null
}

function clearWelcomeTimers(): void {
  buttonRevealTimer = clearTimer(buttonRevealTimer)
  buttonReadyTimer = clearTimer(buttonReadyTimer)
  revealCompleteTimer = clearTimer(revealCompleteTimer)
}

function buildWelcomeData(revealDiameterPx: number): WelcomePageData {
  return {
    ...getInitialWelcomeState(),
    revealDiameterPx,
    loadingRoleTitle: '正在识别你的身份...',
    loadingRoleSubtitle: '系统将自动进入对应主页',
  }
}

function enterRoleHome(roleSession: RoleSession): void {
  wx.reLaunch({
    url: getRoleEntryPath(roleSession.currentRole),
  })
}

function buildRoleLoadingCopy(roleSession: RoleSession): Pick<WelcomePageData, 'loadingRoleTitle' | 'loadingRoleSubtitle'> {
  const welcomeMessage = getRoleWelcomeMessage(roleSession)

  if (roleSession.currentRole === 'admin') {
    return {
      loadingRoleTitle: welcomeMessage ?? '正在进入管理员主页',
      loadingRoleSubtitle: '权限中心与巡检看板加载中',
    }
  }

  if (roleSession.currentRole === 'merchant') {
    return {
      loadingRoleTitle: welcomeMessage ?? '正在进入商家主页',
      loadingRoleSubtitle: '订单与商品工作台加载中',
    }
  }

  return {
    loadingRoleTitle: '正在进入顾客主页',
    loadingRoleSubtitle: '选购与订单入口加载中',
  }
}

Page<WelcomePageData, WelcomePageMethods>({
  data: buildWelcomeData(getRevealDiameterPx(390, 844)),

  onLoad() {
    const systemInfo = wx.getSystemInfoSync()

    this.setData({
      revealDiameterPx: getRevealDiameterPx(systemInfo.windowWidth, systemInfo.windowHeight),
    })
  },

  onShow() {
    clearWelcomeTimers()
    this.setData(buildWelcomeData(this.data.revealDiameterPx))

    buttonRevealTimer = setTimeout((): void => {
      this.setData({
        isButtonVisible: true,
      })
    }, WELCOME_TIMINGS.buttonRevealDelayMs)

    buttonReadyTimer = setTimeout((): void => {
      this.setData({
        isButtonReady: true,
      })
    }, WELCOME_TIMINGS.buttonReadyDelayMs)
  },

  onHide() {
    clearWelcomeTimers()
  },

  onUnload() {
    clearWelcomeTimers()
  },

  handleEnterTap() {
    if (!canStartReveal(this.data.isButtonReady, this.data.isRevealing)) {
      return
    }

    const app = getApp<IAppOption>()
    const roleSessionTask = bootstrapRoleSession(app).then((roleSession): RoleSession => {
      warmRoleTabbarPages(roleSession.currentRole, '', wx as Partial<PagePreloadAdapter>)
      this.setData(buildRoleLoadingCopy(roleSession))

      return roleSession
    })

    this.setData({
      ...startRevealState(),
      loadingRoleTitle: '正在识别你的身份...',
      loadingRoleSubtitle: '系统将自动进入对应主页',
    })

    revealCompleteTimer = setTimeout((): void => {
      this.setData(finishRevealState())

      void roleSessionTask
        .then((roleSession): void => {
          enterRoleHome(roleSession)
        })
        .catch((error: unknown): void => {
          console.warn('[role-routing] 角色识别失败，回退顾客入口', error)
          wx.reLaunch({
            url: getRoleEntryPath('customer'),
          })
        })
    }, WELCOME_TIMINGS.revealDurationMs)
  },
})
