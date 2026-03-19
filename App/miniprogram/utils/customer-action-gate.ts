import type { CustomerLocalSession } from '../../types/customer-session'
import {
  isCustomerLoggedIn,
  requestCustomerLoginSession,
} from './customer-session'
import {
  loadStoredCustomerSession,
  saveStoredCustomerSession,
} from './customer-session-storage'

export interface CustomerActionGateDependencies {
  loadSession(): CustomerLocalSession
  saveSession(session: CustomerLocalSession): void
  requestLogin(): Promise<CustomerLocalSession | null>
  confirmLoginIntent(): Promise<boolean>
}

function requestCustomerLoginConfirmation(): Promise<boolean> {
  return new Promise<boolean>((resolve) => {
    wx.showModal({
      title: '请先登录',
      content: '加入购物车、立即购买与结算提交前需要先完成微信登录。',
      confirmText: '去登录',
      cancelText: '取消',
      success(result) {
        resolve(result.confirm === true)
      },
      fail() {
        resolve(false)
      },
    })
  })
}

function resolveDefaultDependencies(): CustomerActionGateDependencies {
  return {
    loadSession: () => loadStoredCustomerSession(),
    saveSession: (session) => {
      saveStoredCustomerSession(session)
    },
    requestLogin: () => requestCustomerLoginSession(),
    confirmLoginIntent: () => requestCustomerLoginConfirmation(),
  }
}

export async function runCustomerAuthorizedAction(
  action: () => void | Promise<void>,
  dependencies: CustomerActionGateDependencies = resolveDefaultDependencies(),
): Promise<boolean> {
  const currentSession = dependencies.loadSession()
  if (isCustomerLoggedIn(currentSession)) {
    await action()
    return true
  }

  const confirmed = await dependencies.confirmLoginIntent()
  if (!confirmed) {
    return false
  }

  const loggedInSession = await dependencies.requestLogin()
  if (loggedInSession === null || !isCustomerLoggedIn(loggedInSession)) {
    return false
  }

  dependencies.saveSession(loggedInSession)
  await action()
  return true
}
