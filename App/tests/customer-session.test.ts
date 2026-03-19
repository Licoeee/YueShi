import assert from 'node:assert/strict'
import test from 'node:test'

import { requestCustomerLoginSession } from '../miniprogram/utils/customer-session'

interface MockWechatLoginLike {
  login(options: {
    success(result: { code?: string }): void
    fail(error: unknown): void
  }): void
  getUserProfile(options: {
    desc: string
    success(result: { userInfo?: { nickName?: string; avatarUrl?: string } }): void
    fail(error: unknown): void
  }): void
}

function withMockedGetApp<T>(factory: (() => IAppOption) | undefined, run: () => Promise<T>): Promise<T> {
  const previousGetApp = (globalThis as { getApp?: (() => IAppOption) | undefined }).getApp

  if (factory === undefined) {
    delete (globalThis as { getApp?: () => IAppOption }).getApp
  } else {
    ;(globalThis as { getApp?: () => IAppOption }).getApp = factory
  }

  return run().finally(() => {
    if (previousGetApp === undefined) {
      delete (globalThis as { getApp?: () => IAppOption }).getApp
      return
    }

    ;(globalThis as { getApp?: () => IAppOption }).getApp = previousGetApp
  })
}

test('requestCustomerLoginSession returns null when profile authorization is unavailable', async () => {
  const wechat: MockWechatLoginLike = {
    login(options) {
      options.success({ code: 'login-code-001' })
    },
    getUserProfile(options) {
      options.fail(new Error('profile denied'))
    },
  }

  const session = await withMockedGetApp(undefined, () =>
    requestCustomerLoginSession(wechat, new Date('2026-03-15T08:00:00.000Z')),
  )

  assert.equal(session, null)
})

test('requestCustomerLoginSession keeps basic login when getUserProfile is unavailable', async () => {
  const wechat = {
    login(options: { success(result: { code?: string }): void; fail(error: unknown): void }) {
      options.success({ code: 'login-code-fallback' })
    },
  } as unknown as MockWechatLoginLike

  const session = await withMockedGetApp(undefined, () =>
    requestCustomerLoginSession(wechat, new Date('2026-03-15T08:30:00.000Z')),
  )

  assert.notEqual(session, null)
  assert.equal(session?.isLoggedIn, true)
  assert.equal(session?.openIdLikeId, 'login-code-fallback')
  assert.equal(session?.nickname, '微信用户')
  assert.equal(session?.avatarUrl, '')
  assert.equal(session?.lastLoginAt, '2026-03-15T08:30:00.000Z')
})

test('requestCustomerLoginSession prefers app identity and profile payload when both are available', async () => {
  const wechat: MockWechatLoginLike = {
    login(options) {
      options.success({ code: 'temporary-code' })
    },
    getUserProfile(options) {
      options.success({
        userInfo: {
          nickName: '悦时顾客',
          avatarUrl: 'https://example.com/avatar.png',
        },
      })
    },
  }

  const session = await withMockedGetApp(
    () =>
      ({
        globalData: {
          openId: 'openid-from-app',
        },
      }) as IAppOption,
    () => requestCustomerLoginSession(wechat, new Date('2026-03-15T09:00:00.000Z')),
  )

  assert.notEqual(session, null)
  assert.equal(session?.openIdLikeId, 'openid-from-app')
  assert.equal(session?.nickname, '悦时顾客')
  assert.equal(session?.avatarUrl, 'https://example.com/avatar.png')
})

test('requestCustomerLoginSession returns null when wx.login itself fails', async () => {
  const wechat: MockWechatLoginLike = {
    login(options) {
      options.fail(new Error('login failed'))
    },
    getUserProfile(options) {
      options.success({
        userInfo: {
          nickName: '不会生效',
          avatarUrl: 'https://example.com/avatar.png',
        },
      })
    },
  }

  const session = await withMockedGetApp(undefined, () =>
    requestCustomerLoginSession(wechat, new Date('2026-03-15T10:00:00.000Z')),
  )

  assert.equal(session, null)
})
