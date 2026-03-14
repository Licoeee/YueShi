import assert from 'node:assert/strict'
import test from 'node:test'

import {
  releaseSceneSwitchLock,
  requestSceneSwitch,
  type SceneSwitchLimiterState,
} from '../miniprogram/utils/scene-switch-rate-limit'

function createState(overrides: Partial<SceneSwitchLimiterState> = {}): SceneSwitchLimiterState {
  return {
    isLocked: false,
    pendingRequest: null,
    ...overrides,
  }
}

test('dispatches immediately and enters locked state on first scene switch request', () => {
  const result = requestSceneSwitch(createState(), {
    targetPath: '/pages/customer/orders/orders',
    targetValue: 'customer-orders',
  })

  assert.deepEqual(result, {
    nextState: {
      isLocked: true,
      pendingRequest: null,
    },
    immediateRequest: {
      targetPath: '/pages/customer/orders/orders',
      targetValue: 'customer-orders',
    },
  })
})

test('keeps only the latest pending request while lock is active', () => {
  const firstPending = requestSceneSwitch(
    createState({
      isLocked: true,
      pendingRequest: {
        targetPath: '/pages/customer/cart/cart',
        targetValue: 'customer-cart',
      },
    }),
    {
      targetPath: '/pages/customer/profile/profile',
      targetValue: 'customer-profile',
    },
  )

  assert.deepEqual(firstPending, {
    nextState: {
      isLocked: true,
      pendingRequest: {
        targetPath: '/pages/customer/profile/profile',
        targetValue: 'customer-profile',
      },
    },
    immediateRequest: null,
  })
})

test('releases lock and dispatches pending request when current path differs', () => {
  const result = releaseSceneSwitchLock(
    createState({
      isLocked: true,
      pendingRequest: {
        targetPath: '/pages/customer/orders/orders',
        targetValue: 'customer-orders',
      },
    }),
    '/pages/customer/home/home',
  )

  assert.deepEqual(result, {
    nextState: {
      isLocked: true,
      pendingRequest: null,
    },
    immediateRequest: {
      targetPath: '/pages/customer/orders/orders',
      targetValue: 'customer-orders',
    },
  })
})

test('fully unlocks when pending request matches current path', () => {
  const result = releaseSceneSwitchLock(
    createState({
      isLocked: true,
      pendingRequest: {
        targetPath: '/pages/customer/home/home',
        targetValue: 'customer-home',
      },
    }),
    '/pages/customer/home/home',
  )

  assert.deepEqual(result, {
    nextState: {
      isLocked: false,
      pendingRequest: null,
    },
    immediateRequest: null,
  })
})
