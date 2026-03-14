import assert from 'node:assert/strict'
import test from 'node:test'

import {
  buildPreviewableRolePageState,
  buildRolePageDataPatch,
  buildRolePageState,
} from '../miniprogram/utils/role-page-runtime-state'

test('builds the default role page state from the fallback role when no session exists', () => {
  assert.deepEqual(buildRolePageState(undefined, 'customer'), {
    activeRole: 'customer',
    isPreviewMode: false,
  })
})

test('builds previewable role page state with admin return flag for preview sessions', () => {
  assert.deepEqual(
    buildPreviewableRolePageState(
      {
        currentRole: 'merchant',
        availableRoles: ['admin', 'merchant', 'customer'],
        isPreviewMode: true,
      },
      'merchant',
    ),
    {
      activeRole: 'merchant',
      isPreviewMode: true,
      canBackToAdmin: true,
    },
  )
})

test('returns null when the next role page state does not change the current data', () => {
  const nextState = buildRolePageState(
    {
      currentRole: 'customer',
      availableRoles: ['customer'],
      isPreviewMode: false,
    },
    'customer',
  )

  assert.equal(
    buildRolePageDataPatch(
      {
        activeRole: 'customer',
        isPreviewMode: false,
      },
      nextState,
    ),
    null,
  )
})

test('returns only changed fields when previewable role page state changes', () => {
  const nextState = buildPreviewableRolePageState(
    {
      currentRole: 'customer',
      availableRoles: ['admin', 'customer'],
      isPreviewMode: true,
    },
    'customer',
  )

  assert.deepEqual(
    buildRolePageDataPatch(
      {
        activeRole: 'customer',
        isPreviewMode: false,
        canBackToAdmin: false,
      },
      nextState,
    ),
    {
      isPreviewMode: true,
      canBackToAdmin: true,
    },
  )
})
