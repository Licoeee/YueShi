import assert from 'node:assert/strict'
import test from 'node:test'

import { buildCustomTabBarSyncResult } from '../miniprogram/utils/custom-tab-bar-state'
import { getRoleTabbarItems } from '../miniprogram/utils/role-tabbar'

test('skips tabbar setData and warm work when derived state is unchanged', () => {
  const items = getRoleTabbarItems('customer')

  assert.deepEqual(
    buildCustomTabBarSyncResult({
      roleFromProperty: 'customer',
      roleFromGlobal: 'customer',
      currentPath: '/pages/customer/home/home',
      currentItems: items,
      currentValue: 'customer-home',
      lastWarmRoleType: 'customer',
      lastWarmPath: '/pages/customer/home/home',
    }),
    {
      roleType: 'customer',
      currentPath: '/pages/customer/home/home',
      dataPatch: null,
      shouldWarm: false,
    },
  )
})

test('returns a minimal patch and warm signal when the selected tab changes', () => {
  const items = getRoleTabbarItems('customer')

  assert.deepEqual(
    buildCustomTabBarSyncResult({
      roleFromProperty: 'customer',
      roleFromGlobal: 'customer',
      currentPath: '/pages/customer/orders/orders',
      currentItems: items,
      currentValue: 'customer-home',
      lastWarmRoleType: 'customer',
      lastWarmPath: '/pages/customer/home/home',
    }),
    {
      roleType: 'customer',
      currentPath: '/pages/customer/orders/orders',
      dataPatch: {
        currentValue: 'customer-orders',
      },
      shouldWarm: true,
    },
  )
})

test('rebuilds items when the role source changes', () => {
  assert.deepEqual(
    buildCustomTabBarSyncResult({
      roleFromProperty: '',
      roleFromGlobal: 'merchant',
      currentPath: '/pages/merchant/orders/orders',
      currentItems: getRoleTabbarItems('customer'),
      currentValue: 'customer-home',
      lastWarmRoleType: 'customer',
      lastWarmPath: '/pages/customer/home/home',
    }),
    {
      roleType: 'merchant',
      currentPath: '/pages/merchant/orders/orders',
      dataPatch: {
        items: getRoleTabbarItems('merchant'),
        currentValue: 'merchant-orders',
      },
      shouldWarm: true,
    },
  )
})
