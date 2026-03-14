import assert from 'node:assert/strict'
import test from 'node:test'

import { warmPagePaths, warmRoleTabbarPages } from '../miniprogram/utils/role-page-preload'

test('warms sibling customer tab pages only once per path', () => {
  const preloadCalls: string[] = []
  const warmedPaths = new Set<string>()

  const firstWarmPaths = warmRoleTabbarPages(
    'customer',
    '/pages/customer/home/home',
    {
      preloadPage({ url }): void {
        preloadCalls.push(url)
      },
    },
    warmedPaths,
  )

  const secondWarmPaths = warmRoleTabbarPages(
    'customer',
    '/pages/customer/home/home',
    {
      preloadPage({ url }): void {
        preloadCalls.push(url)
      },
    },
    warmedPaths,
  )

  assert.deepEqual(firstWarmPaths, [
    '/pages/customer/cart/cart',
    '/pages/customer/orders/orders',
    '/pages/customer/profile/profile',
  ])
  assert.deepEqual(secondWarmPaths, [])
  assert.deepEqual(preloadCalls, [
    '/pages/customer/cart/cart',
    '/pages/customer/orders/orders',
    '/pages/customer/profile/profile',
  ])
})

test('warms all merchant tab pages when current path is empty for welcome prefetch', () => {
  const preloadCalls: string[] = []

  const warmedPaths = warmRoleTabbarPages(
    'merchant',
    '',
    {
      preloadPage({ url }): void {
        preloadCalls.push(url)
      },
    },
    new Set<string>(),
  )

  assert.deepEqual(warmedPaths, [
    '/pages/merchant/products/products',
    '/pages/merchant/orders/orders',
    '/pages/merchant/account-book/account-book',
    '/pages/merchant/inventory/inventory',
    '/pages/merchant/profile/profile',
  ])
  assert.deepEqual(preloadCalls, warmedPaths)
})

test('skips warming when preloadPage is unavailable', () => {
  assert.deepEqual(warmPagePaths(['/pages/customer/home/home'], {}), [])
})
