import assert from 'node:assert/strict'
import test from 'node:test'

import type { CachedUserIdentity } from '../miniprogram/utils/openid-bootstrap'
import { ROLE_DIRECTORY_STORAGE_KEY } from '../miniprogram/utils/role-routing'
import {
  RESOLVE_USER_ROLE_CLOUD_FUNCTION_NAME,
  bootstrapRoleSessionWithAdapter,
  type RoleBootstrapAdapter,
  type RoleBootstrapApp,
} from '../miniprogram/utils/role-bootstrap'

interface AdapterState {
  identity: CachedUserIdentity | null
  storage: Record<string, unknown>
  cloudResult: Promise<unknown> | unknown
  bootstrapOpenIdCallCount: number
  callFunctionNames: string[]
}

function createApp(): RoleBootstrapApp {
  return {
    globalData: {},
  }
}

function createAdapter(state: AdapterState): RoleBootstrapAdapter {
  return {
    async bootstrapOpenId(): Promise<CachedUserIdentity | null> {
      state.bootstrapOpenIdCallCount += 1

      return state.identity
    },
    getStorageSync(key: string): unknown {
      return state.storage[key]
    },
    setStorageSync(key: string, value: CachedUserIdentity): void {
      state.storage[key] = value
    },
    async callFunction(name: string): Promise<unknown> {
      state.callFunctionNames.push(name)

      return state.cloudResult
    },
    now(): number {
      return 999
    },
  }
}

test('returns existing global role session without extra bootstrap work', async () => {
  const app = createApp()
  app.globalData.roleSession = {
    currentRole: 'admin',
    availableRoles: ['admin', 'merchant', 'customer'],
    isPreviewMode: false,
  }

  const state: AdapterState = {
    identity: null,
    storage: {},
    cloudResult: null,
    bootstrapOpenIdCallCount: 0,
    callFunctionNames: [],
  }

  const session = await bootstrapRoleSessionWithAdapter(app, createAdapter(state))

  assert.deepEqual(session, app.globalData.roleSession)
  assert.equal(state.bootstrapOpenIdCallCount, 0)
  assert.deepEqual(state.callFunctionNames, [])
})

test('uses matching local role directory as debug override before cloud resolution', async () => {
  const app = createApp()
  const state: AdapterState = {
    identity: {
      openId: 'o_admin',
      fetchedAt: 123,
    },
    storage: {
      [ROLE_DIRECTORY_STORAGE_KEY]: {
        admins: ['o_admin'],
        merchants: [],
      },
    },
    cloudResult: {
      openId: 'o_admin',
      role: 'customer',
    },
    bootstrapOpenIdCallCount: 0,
    callFunctionNames: [],
  }

  const session = await bootstrapRoleSessionWithAdapter(app, createAdapter(state))

  assert.deepEqual(session, {
    currentRole: 'admin',
    availableRoles: ['admin', 'merchant', 'customer'],
    isPreviewMode: false,
  })
  assert.equal(state.bootstrapOpenIdCallCount, 1)
  assert.deepEqual(state.callFunctionNames, [])
})

test('falls back to cloud resolved role when local directory does not match current openId', async () => {
  const app = createApp()
  const state: AdapterState = {
    identity: {
      openId: 'o_merchant',
      fetchedAt: 456,
    },
    storage: {
      [ROLE_DIRECTORY_STORAGE_KEY]: {
        admins: ['o_other_admin'],
        merchants: [{ openId: 'o_other_merchant', shopName: '别家店铺' }],
      },
    },
    cloudResult: {
      openId: 'o_merchant',
      role: 'merchant',
      merchantName: '悦时烘焙',
    },
    bootstrapOpenIdCallCount: 0,
    callFunctionNames: [],
  }

  const session = await bootstrapRoleSessionWithAdapter(app, createAdapter(state))

  assert.deepEqual(session, {
    currentRole: 'merchant',
    availableRoles: ['merchant', 'customer'],
    isPreviewMode: false,
    merchantName: '悦时烘焙',
  })
  assert.equal(state.bootstrapOpenIdCallCount, 1)
  assert.deepEqual(state.callFunctionNames, [RESOLVE_USER_ROLE_CLOUD_FUNCTION_NAME])
  assert.deepEqual(app.globalData.roleSession, session)
})

test('reuses the same in-flight role bootstrap promise across concurrent callers', async () => {
  const app = createApp()
  let resolveCloudResult: ((value: unknown) => void) | undefined
  const cloudResult = new Promise<unknown>((resolve) => {
    resolveCloudResult = resolve
  })

  const state: AdapterState = {
    identity: {
      openId: 'o_admin',
      fetchedAt: 789,
    },
    storage: {
      [ROLE_DIRECTORY_STORAGE_KEY]: {
        admins: [],
        merchants: [],
      },
    },
    cloudResult,
    bootstrapOpenIdCallCount: 0,
    callFunctionNames: [],
  }

  const adapter = createAdapter(state)
  const firstTask = bootstrapRoleSessionWithAdapter(app, adapter)
  const secondTask = bootstrapRoleSessionWithAdapter(app, adapter)
  await Promise.resolve()

  assert.equal(firstTask, secondTask)
  assert.equal(state.bootstrapOpenIdCallCount, 1)
  assert.deepEqual(state.callFunctionNames, [RESOLVE_USER_ROLE_CLOUD_FUNCTION_NAME])
  assert.notEqual(app.globalData.roleSessionPromise, undefined)

  resolveCloudResult?.({
    openId: 'o_admin',
    role: 'admin',
  })

  const [firstSession, secondSession] = await Promise.all([firstTask, secondTask])

  assert.deepEqual(firstSession, {
    currentRole: 'admin',
    availableRoles: ['admin', 'merchant', 'customer'],
    isPreviewMode: false,
  })
  assert.deepEqual(secondSession, firstSession)
  assert.equal(app.globalData.roleSessionPromise, undefined)
})
