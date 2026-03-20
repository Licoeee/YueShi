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

interface MockCloudCallOptions {
  name: string
  data?: unknown
  success(result: { result: unknown }): void
  fail(error: unknown): void
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

function withMockedWx<T>(mockWx: unknown, run: () => Promise<T>): Promise<T> {
  const previousWx = (globalThis as { wx?: unknown }).wx
  ;(globalThis as { wx?: unknown }).wx = mockWx

  return run().finally(() => {
    if (previousWx === undefined) {
      delete (globalThis as { wx?: unknown }).wx
      return
    }

    ;(globalThis as { wx?: unknown }).wx = previousWx
  })
}

function createMockWxRuntime(
  cloudResult: unknown,
  callFunctionNames: string[],
): { runtime: unknown; storage: Record<string, unknown> } {
  const storage: Record<string, unknown> = {}

  const runtime = {
    getStorageSync(key: string): unknown {
      return storage[key]
    },
    setStorageSync(key: string, value: unknown): void {
      storage[key] = value
    },
    cloud: {
      init(): void {
        return
      },
      callFunction(options: MockCloudCallOptions): void {
        callFunctionNames.push(options.name)
        options.success({
          result: cloudResult,
        })
      },
    },
  }

  return {
    runtime,
    storage,
  }
}

test('requestCustomerLoginSession returns null when profile authorization is unavailable after cloud login handshake', async () => {
  const wechat: MockWechatLoginLike = {
    login(options) {
      options.success({ code: 'login-code-001' })
    },
    getUserProfile(options) {
      options.fail(new Error('profile denied'))
    },
  }

  const callFunctionNames: string[] = []
  const { runtime } = createMockWxRuntime(
    {
      openId: 'openid-from-customer-login',
      sessionTicket: 'ticket-001',
      loginAt: 1742025600000,
    },
    callFunctionNames,
  )

  const session = await withMockedWx(runtime, () =>
    withMockedGetApp(undefined, () => requestCustomerLoginSession(wechat, new Date('2026-03-15T08:00:00.000Z'))),
  )

  assert.equal(session, null)
  assert.deepEqual(callFunctionNames, ['customer-login'])
})

test('requestCustomerLoginSession returns null when customer-login cloud payload is invalid', async () => {
  const wechat = {
    login(options: { success(result: { code?: string }): void; fail(error: unknown): void }) {
      options.success({ code: 'login-code-fallback' })
    },
  } as unknown as MockWechatLoginLike

  const callFunctionNames: string[] = []
  const { runtime } = createMockWxRuntime(
    {
      openId: '',
      sessionTicket: '',
      loginAt: 1742027400000,
    },
    callFunctionNames,
  )

  const session = await withMockedWx(runtime, () =>
    withMockedGetApp(undefined, () => requestCustomerLoginSession(wechat, new Date('2026-03-15T08:30:00.000Z'))),
  )

  assert.equal(session, null)
  assert.deepEqual(callFunctionNames, ['customer-login'])
})

test('requestCustomerLoginSession keeps basic login when getUserProfile is unavailable but customer-login succeeds', async () => {
  const wechat = {
    login(options: { success(result: { code?: string }): void; fail(error: unknown): void }) {
      options.success({ code: 'login-code-fallback' })
    },
  } as unknown as MockWechatLoginLike

  const callFunctionNames: string[] = []
  const { runtime } = createMockWxRuntime(
    {
      openId: 'openid-from-customer-login',
      sessionTicket: 'ticket-basic',
      loginAt: 1742027400000,
    },
    callFunctionNames,
  )

  const app = {
    globalData: {},
  } as IAppOption

  const session = await withMockedWx(runtime, () =>
    withMockedGetApp(
      () => app,
      () => requestCustomerLoginSession(wechat, new Date('2026-03-15T08:30:00.000Z')),
    ),
  )

  assert.notEqual(session, null)
  assert.equal(session?.isLoggedIn, true)
  assert.equal(session?.openIdLikeId, 'openid-from-customer-login')
  assert.equal((session as { authTicket?: unknown }).authTicket, 'ticket-basic')
  assert.equal(session?.nickname, '微信用户')
  assert.equal(session?.avatarUrl, '')
  assert.equal(session?.lastLoginAt, '2026-03-15T08:30:00.000Z')
  assert.equal(app.globalData.openId, 'openid-from-customer-login')
  assert.deepEqual(callFunctionNames, ['customer-login'])
})

test('requestCustomerLoginSession resolves real openid and ticket from customer-login cloud payload', async () => {
  const wechat = {
    login(options: { success(result: { code?: string }): void; fail(error: unknown): void }) {
      options.success({ code: 'login-code-cloud-path' })
    },
  } as unknown as MockWechatLoginLike

  const callFunctionNames: string[] = []
  const { runtime } = createMockWxRuntime(
    {
      openId: 'openid-from-cloud',
      sessionTicket: 'ticket-cloud',
      loginAt: 1742028300000,
    },
    callFunctionNames,
  )

  const session = await withMockedWx(runtime, () =>
    withMockedGetApp(undefined, () => requestCustomerLoginSession(wechat, new Date('2026-03-15T08:45:00.000Z'))),
  )

  assert.notEqual(session, null)
  assert.equal(session?.openIdLikeId, 'openid-from-cloud')
  assert.equal((session as { authTicket?: unknown }).authTicket, 'ticket-cloud')
  assert.deepEqual(callFunctionNames, ['customer-login'])
})

test('requestCustomerLoginSession prefers customer-login openid over stale app identity and keeps profile payload', async () => {
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

  const callFunctionNames: string[] = []
  const { runtime } = createMockWxRuntime(
    {
      openId: 'openid-from-customer-login',
      sessionTicket: 'ticket-profile',
      loginAt: 1742029200000,
    },
    callFunctionNames,
  )

  const session = await withMockedWx(runtime, () =>
    withMockedGetApp(
      () =>
        ({
          globalData: {
            openId: 'stale-app-openid',
          },
        }) as IAppOption,
      () => requestCustomerLoginSession(wechat, new Date('2026-03-15T09:00:00.000Z')),
    ),
  )

  assert.notEqual(session, null)
  assert.equal(session?.openIdLikeId, 'openid-from-customer-login')
  assert.equal((session as { authTicket?: unknown }).authTicket, 'ticket-profile')
  assert.equal(session?.nickname, '悦时顾客')
  assert.equal(session?.avatarUrl, 'https://example.com/avatar.png')
  assert.deepEqual(callFunctionNames, ['customer-login'])
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

  const callFunctionNames: string[] = []
  const { runtime } = createMockWxRuntime(
    {
      openId: 'openid-from-customer-login',
      sessionTicket: 'ticket-never-used',
      loginAt: 1742032800000,
    },
    callFunctionNames,
  )

  const session = await withMockedWx(runtime, () =>
    withMockedGetApp(undefined, () => requestCustomerLoginSession(wechat, new Date('2026-03-15T10:00:00.000Z'))),
  )

  assert.equal(session, null)
  assert.deepEqual(callFunctionNames, [])
})

test('requestCustomerLoginSession passes wx.login code to customer-login cloud function', async () => {
  const wechat = {
    login(options: { success(result: { code?: string }): void; fail(error: unknown): void }) {
      options.success({ code: 'login-code-for-cloud' })
    },
  } as unknown as MockWechatLoginLike

  let capturedData: unknown = undefined
  const runtime = {
    getStorageSync(): unknown {
      return undefined
    },
    setStorageSync(): void {
      return
    },
    cloud: {
      init(): void {
        return
      },
      callFunction(options: MockCloudCallOptions): void {
        capturedData = options.data
        options.success({
          result: {
            openId: 'openid-from-cloud',
            sessionTicket: 'ticket-from-cloud',
            loginAt: 1742028300000,
          },
        })
      },
    },
  }

  const session = await withMockedWx(runtime, () =>
    withMockedGetApp(undefined, () => requestCustomerLoginSession(wechat, new Date('2026-03-15T08:45:00.000Z'))),
  )

  assert.notEqual(session, null)
  assert.deepEqual(capturedData, {
    loginCode: 'login-code-for-cloud',
  })
})
