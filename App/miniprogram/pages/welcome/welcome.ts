import type { WelcomeParticle, WelcomeStateSnapshot } from '../../utils/welcome-motion'
import {
  WELCOME_TIMINGS,
  canStartReveal,
  getInitialWelcomeState,
  getWelcomeEntryTarget,
} from '../../utils/welcome-motion'

interface WelcomePageData extends WelcomeStateSnapshot {
  particles: WelcomeParticle[]
}

interface WelcomePageMethods {
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

function buildWelcomeData(): WelcomePageData {
  return {
    ...getInitialWelcomeState(),
  }
}

Page<WelcomePageData, WelcomePageMethods>({
  data: buildWelcomeData(),

  onShow() {
    clearWelcomeTimers()
    this.setData(buildWelcomeData())

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

    this.setData({
      isButtonReady: false,
      isRevealing: true,
    })

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
