import assert from 'node:assert/strict'
import test from 'node:test'

import {
  OPENID_IDENTITY_STORAGE_KEY,
  bootstrapOpenIdWithAdapter,
  extractOpenIdFromCloudPayload,
  parseCachedUserIdentity,
  type CachedUserIdentity,
  type OpenIdBootstrapAdapter,
} from '../miniprogram/utils/openid-bootstrap'

interface AdapterState {
  storage: Record<string, unknown>
  cloudResult: unknown
  cloudCallCount: number
  nowValue: number
}

function createAdapter(state: AdapterState): OpenIdBootstrapAdapter {
  return {
    getStorageSync(key: string): unknown {
      return state.storage[key]
    },
    setStorageSync(key: string, value: CachedUserIdentity): void {
      state.storage[key] = value
    },
    async callFunction(name: string): Promise<unknown> {
      assert.equal(name, 'get-user-openid')
      state.cloudCallCount += 1
      return state.cloudResult
    },
    now(): number {
      return state.nowValue
    },
  }
}

test('parses valid cached identity snapshot', () => {
  const parsed = parseCachedUserIdentity({
    openId: 'o_test_openid',
    fetchedAt: 123456,
  })

  assert.deepEqual(parsed, {
    openId: 'o_test_openid',
    fetchedAt: 123456,
  })
})

test('rejects invalid cached identity payload', () => {
  assert.equal(parseCachedUserIdentity(null), null)
  assert.equal(parseCachedUserIdentity({}), null)
  assert.equal(parseCachedUserIdentity({ openId: '  ', fetchedAt: 123 }), null)
  assert.equal(parseCachedUserIdentity({ openId: 'o_test', fetchedAt: '123' }), null)
})

test('extracts openId from cloud payload', () => {
  assert.equal(extractOpenIdFromCloudPayload({ openId: 'o_cloud' }), 'o_cloud')
  assert.equal(extractOpenIdFromCloudPayload({ openId: '   ' }), null)
  assert.equal(extractOpenIdFromCloudPayload({}), null)
  assert.equal(extractOpenIdFromCloudPayload('o_cloud'), null)
})

test('returns cached identity without calling cloud function', async () => {
  const state: AdapterState = {
    storage: {
      [OPENID_IDENTITY_STORAGE_KEY]: {
        openId: 'o_cached',
        fetchedAt: 456,
      },
    },
    cloudResult: { openId: 'o_cloud' },
    cloudCallCount: 0,
    nowValue: 999,
  }

  const identity = await bootstrapOpenIdWithAdapter(createAdapter(state))

  assert.deepEqual(identity, {
    openId: 'o_cached',
    fetchedAt: 456,
  })
  assert.equal(state.cloudCallCount, 0)
})

test('fetches openId from cloud and writes cache when local cache is missing', async () => {
  const state: AdapterState = {
    storage: {},
    cloudResult: { openId: 'o_fetched' },
    cloudCallCount: 0,
    nowValue: 789,
  }

  const identity = await bootstrapOpenIdWithAdapter(createAdapter(state))
  assert.deepEqual(identity, {
    openId: 'o_fetched',
    fetchedAt: 789,
  })
  assert.equal(state.cloudCallCount, 1)
  assert.deepEqual(state.storage[OPENID_IDENTITY_STORAGE_KEY], {
    openId: 'o_fetched',
    fetchedAt: 789,
  })
})

test('returns null when cloud payload does not contain valid openId', async () => {
  const state: AdapterState = {
    storage: {},
    cloudResult: { openId: '' },
    cloudCallCount: 0,
    nowValue: 100,
  }

  const identity = await bootstrapOpenIdWithAdapter(createAdapter(state))
  assert.equal(identity, null)
  assert.equal(state.cloudCallCount, 1)
  assert.equal(state.storage[OPENID_IDENTITY_STORAGE_KEY], undefined)
})
