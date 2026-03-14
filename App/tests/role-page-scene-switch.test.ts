import assert from 'node:assert/strict'
import test from 'node:test'

import {
  buildRolePageSceneSwitchPatch,
  type RolePageSceneSwitchState,
} from '../miniprogram/utils/role-page-scene-switch'

function createState(overrides: Partial<RolePageSceneSwitchState> = {}): RolePageSceneSwitchState {
  return {
    scenePath: '/pages/customer/home/home',
    sceneDirection: 'none',
    sceneMotionTick: 0,
    ...overrides,
  }
}

test('returns null when scene switch detail does not contain a valid target path', () => {
  assert.equal(buildRolePageSceneSwitchPatch(createState(), { path: '' }), null)
  assert.equal(buildRolePageSceneSwitchPatch(createState(), {}), null)
})

test('returns null when target path equals current scene path', () => {
  assert.equal(
    buildRolePageSceneSwitchPatch(createState(), {
      path: '/pages/customer/home/home',
      direction: 'forward',
    }),
    null,
  )
})

test('builds a scene patch with direction and motion tick increment', () => {
  assert.deepEqual(
    buildRolePageSceneSwitchPatch(createState({ sceneMotionTick: 3 }), {
      path: '/pages/customer/orders/orders',
      direction: 'forward',
    }),
    {
      scenePath: '/pages/customer/orders/orders',
      sceneDirection: 'forward',
      sceneMotionTick: 4,
    },
  )
})

test('falls back to none direction when detail direction is invalid', () => {
  assert.deepEqual(
    buildRolePageSceneSwitchPatch(createState(), {
      path: '/pages/customer/cart/cart',
      direction: 'invalid',
    }),
    {
      scenePath: '/pages/customer/cart/cart',
      sceneDirection: 'none',
      sceneMotionTick: 1,
    },
  )
})
