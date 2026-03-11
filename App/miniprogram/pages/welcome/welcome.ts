import type { WelcomeParticle, WelcomeStateSnapshot } from '../../utils/welcome-motion'
import {
  WELCOME_TIMINGS,
  canStartReveal,
  getInitialWelcomeState,
  getRevealDiameterPx,
  getWelcomeEntryTarget,
  startRevealState,
} from '../../utils/welcome-motion'

interface WelcomePageData extends WelcomeStateSnapshot {
  particles: WelcomeParticle[]
  revealDiameterPx: number
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
let navigationTimer: number | null = null

function clearTimer(timerId: number | null): number | null {
  if (timerId !== null) {
    clearTimeout(timerId)
  }

  return null
}

function clearWelcomeTimers(): void {
  buttonRevealTimer = clearTimer(buttonRevealTimer)
  buttonReadyTimer = clearTimer(buttonReadyTimer)
  navigationTimer = clearTimer(navigationTimer)
}

function buildWelcomeData(revealDiameterPx: number): WelcomePageData {
  return {
    ...getInitialWelcomeState(),
    revealDiameterPx,
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

    this.setData(startRevealState())

    navigationTimer = setTimeout((): void => {
      wx.reLaunch({
        url: `/${getWelcomeEntryTarget()}`,
        fail: (error: WechatMiniprogram.GeneralCallbackResult): void => {
          console.error('welcome reLaunch failed', error)
        },
      })
    }, WELCOME_TIMINGS.revealDurationMs)
  },
})
