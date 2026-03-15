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
}

function resolveDefaultDependencies(): CustomerActionGateDependencies {
  return {
    loadSession: () => loadStoredCustomerSession(),
    saveSession: (session) => {
      saveStoredCustomerSession(session)
    },
    requestLogin: () => requestCustomerLoginSession(),
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

  const loggedInSession = await dependencies.requestLogin()
  if (loggedInSession === null || !isCustomerLoggedIn(loggedInSession)) {
    return false
  }

  dependencies.saveSession(loggedInSession)
  await action()
  return true
}
