import assert from 'node:assert/strict'
import test from 'node:test'

import type { CustomerLocalSession } from '../types/customer-session'
import { runCustomerAuthorizedAction } from '../miniprogram/utils/customer-action-gate'

function createLoggedInSession(): CustomerLocalSession {
  return {
    isLoggedIn: true,
    openIdLikeId: 'local-openid',
    nickname: '悦时顾客',
    avatarUrl: 'https://example.com/avatar.png',
    lastLoginAt: '2026-03-15T06:30:00.000Z',
  }
}

test('runCustomerAuthorizedAction executes immediately when session is already logged in', async () => {
  let executed = 0
  let requested = 0
  let confirmed = 0

  const result = await runCustomerAuthorizedAction(
    async () => {
      executed += 1
    },
    {
      loadSession: () => createLoggedInSession(),
      requestLogin: async () => {
        requested += 1
        return createLoggedInSession()
      },
      confirmLoginIntent: async () => {
        confirmed += 1
        return true
      },
      saveSession: () => {
        return
      },
    },
  )

  assert.equal(result, true)
  assert.equal(executed, 1)
  assert.equal(requested, 0)
  assert.equal(confirmed, 0)
})

test('runCustomerAuthorizedAction performs login before executing when session is logged out', async () => {
  let executed = 0
  let savedSession: CustomerLocalSession | null = null
  let requested = 0
  let confirmed = 0

  const result = await runCustomerAuthorizedAction(
    async () => {
      executed += 1
    },
    {
      loadSession: () => ({
        isLoggedIn: false,
        openIdLikeId: '',
        nickname: '微信用户',
        avatarUrl: '',
        lastLoginAt: '',
      }),
      requestLogin: async () => {
        requested += 1
        return createLoggedInSession()
      },
      confirmLoginIntent: async () => {
        confirmed += 1
        return true
      },
      saveSession: (session) => {
        savedSession = session
      },
    },
  )

  assert.equal(result, true)
  assert.equal(executed, 1)
  assert.equal(requested, 1)
  assert.equal(confirmed, 1)
  assert.equal(savedSession?.isLoggedIn, true)
})

test('runCustomerAuthorizedAction stops before login when the user cancels login guidance', async () => {
  let executed = 0
  let requested = 0
  let confirmed = 0

  const result = await runCustomerAuthorizedAction(
    async () => {
      executed += 1
    },
    {
      loadSession: () => ({
        isLoggedIn: false,
        openIdLikeId: '',
        nickname: '微信用户',
        avatarUrl: '',
        lastLoginAt: '',
      }),
      requestLogin: async () => {
        requested += 1
        return createLoggedInSession()
      },
      confirmLoginIntent: async () => {
        confirmed += 1
        return false
      },
      saveSession: () => {
        return
      },
    },
  )

  assert.equal(result, false)
  assert.equal(executed, 0)
  assert.equal(requested, 0)
  assert.equal(confirmed, 1)
})

test('runCustomerAuthorizedAction stops when the login request is cancelled', async () => {
  let executed = 0
  let requested = 0

  const result = await runCustomerAuthorizedAction(
    async () => {
      executed += 1
    },
    {
      loadSession: () => ({
        isLoggedIn: false,
        openIdLikeId: '',
        nickname: '微信用户',
        avatarUrl: '',
        lastLoginAt: '',
      }),
      requestLogin: async () => {
        requested += 1
        return null
      },
      confirmLoginIntent: async () => true,
      saveSession: () => {
        return
      },
    },
  )

  assert.equal(result, false)
  assert.equal(executed, 0)
  assert.equal(requested, 1)
})
