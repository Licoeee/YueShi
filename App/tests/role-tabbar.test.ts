import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import { workspaceRoot } from './test-workspace-root'

import {
  getRoleTabbarItems,
  getRoleTabbarItemsByPath,
  getRoleTabbarPreloadPaths,
  getRoleTabbarValueByPath,
} from '../miniprogram/utils/role-tabbar'

function readWorkspaceFile(relativePath: string): string {
  return fs.readFileSync(path.join(workspaceRoot, relativePath), 'utf8')
}

test('builds customer tabbar with home / cart / orders / profile items', () => {
  const items = getRoleTabbarItems('customer')

  assert.deepEqual(
    items.map((item) => item.value),
    ['customer-home', 'customer-cart', 'customer-orders', 'customer-profile'],
  )
  assert.deepEqual(
    items.map((item) => item.path),
    [
      '/pages/customer/home/home',
      '/pages/customer/cart/cart',
      '/pages/customer/orders/orders',
      '/pages/customer/profile/profile',
    ],
  )
  assert.deepEqual(
    items.map((item) => item.iconKey),
    ['home', 'cart', 'orders', 'profile'],
  )
  assert.deepEqual(
    items.map((item) => item.iconInactive),
    [
      '/assets/icons/tab/home-inactive.svg',
      '/assets/icons/tab/cart-inactive.svg',
      '/assets/icons/tab/orders-inactive.svg',
      '/assets/icons/tab/profile-inactive.svg',
    ],
  )
  assert.deepEqual(
    items.map((item) => item.iconActive),
    [
      '/assets/icons/tab/home-active.svg',
      '/assets/icons/tab/cart-active.svg',
      '/assets/icons/tab/orders-active.svg',
      '/assets/icons/tab/profile-active.svg',
    ],
  )
})

test('builds merchant tabbar with products / orders / account-book / inventory / profile items', () => {
  const items = getRoleTabbarItems('merchant')

  assert.deepEqual(
    items.map((item) => item.value),
    ['merchant-products', 'merchant-orders', 'merchant-account-book', 'merchant-inventory', 'merchant-profile'],
  )
  assert.deepEqual(
    items.map((item) => item.iconKey),
    ['products', 'orders', 'account-book', 'inventory', 'profile'],
  )
  assert.equal(items[3]?.iconInactive, '/assets/icons/tab/inventory-inactive.svg')
  assert.equal(items[3]?.iconActive, '/assets/icons/tab/inventory-active.svg')
})

test('builds admin tabbar with reviews / overview / profile items', () => {
  const items = getRoleTabbarItems('admin')

  assert.deepEqual(
    items.map((item) => item.value),
    ['admin-reviews', 'admin-overview', 'admin-profile'],
  )
  assert.deepEqual(
    items.map((item) => item.iconKey),
    ['reviews', 'overview', 'profile'],
  )
  assert.deepEqual(
    items.map((item) => item.iconInactive),
    ['/assets/icons/tab/reviews-inactive.svg', '/assets/icons/tab/overview-inactive.svg', '/assets/icons/tab/profile-inactive.svg'],
  )
})

test('resolves tabbar value by page path', () => {
  assert.equal(getRoleTabbarValueByPath('/pages/admin/profile/profile'), 'admin-profile')
  assert.equal(getRoleTabbarValueByPath('/pages/merchant/products/products'), 'merchant-products')
  assert.equal(getRoleTabbarValueByPath('/pages/customer/cart/cart'), 'customer-cart')
  assert.equal(getRoleTabbarValueByPath('/pages/customer/home/home'), 'customer-home')
})

test('builds preload paths for sibling pages in the same role', () => {
  assert.deepEqual(getRoleTabbarPreloadPaths('customer', '/pages/customer/home/home'), [
    '/pages/customer/cart/cart',
    '/pages/customer/orders/orders',
    '/pages/customer/profile/profile',
  ])

  assert.deepEqual(getRoleTabbarPreloadPaths('merchant', '/pages/merchant/orders/orders'), [
    '/pages/merchant/products/products',
    '/pages/merchant/account-book/account-book',
    '/pages/merchant/inventory/inventory',
    '/pages/merchant/profile/profile',
  ])
})

test('resolves role tabbar list by path and falls back to customer tabbar', () => {
  assert.equal(getRoleTabbarItemsByPath('/pages/admin/reviews/reviews')[0]?.value, 'admin-reviews')
  assert.equal(getRoleTabbarItemsByPath('/pages/merchant/orders/orders')[0]?.value, 'merchant-products')
  assert.equal(getRoleTabbarItemsByPath('/pages/unknown/path')[0]?.value, 'customer-home')
})

test('syncs tabbar highlight on page show to avoid stale active tab after returning cached pages', () => {
  const source = readWorkspaceFile('App/miniprogram/components/custom-tab-bar/custom-tab-bar.ts')

  assert.match(source, /pageLifetimes\s*:\s*\{\s*show\(\)\s*:\s*void\s*\{\s*this\.syncTabBarState\(\)/)
})

test('supports scene mode tab switching without triggering route jumps', () => {
  const source = readWorkspaceFile('App/miniprogram/components/custom-tab-bar/custom-tab-bar.ts')

  assert.match(source, /mode:\s*\{\s*type:\s*String,\s*value:\s*'route'/)
  assert.match(source, /if\s*\(\s*mode\s*===\s*'scene'\s*\)\s*\{[\s\S]*requestSceneSwitch\(/)
  assert.match(source, /dispatchSceneSwitch\([\s\S]*this\.triggerEvent\('tabchange'/)
})

test('applies a recoverable scene-switch limiter to prevent rapid-tap lockups', () => {
  const source = readWorkspaceFile('App/miniprogram/components/custom-tab-bar/custom-tab-bar.ts')

  assert.match(source, /SCENE_SWITCH_LOCK_MS/)
  assert.match(source, /requestSceneSwitch\(/)
  assert.match(source, /releaseSceneSwitchLock\(/)
})
