import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'

import { resolveTabRouteAction } from '../miniprogram/utils/tab-route-strategy'

const workspaceRoot = process.cwd()

function readWorkspaceFile(relativePath: string): string {
  return fs.readFileSync(path.join(workspaceRoot, relativePath), 'utf8')
}

test('reuses an existing tab page with navigateBack instead of recreating it', () => {
  const action = resolveTabRouteAction(
    [
      { route: 'pages/customer/home/home' },
      { route: 'pages/customer/orders/orders' },
      { route: 'pages/customer/profile/profile' },
    ],
    '/pages/customer/orders/orders',
  )

  assert.deepEqual(action, {
    type: 'navigateBack',
    delta: 1,
  })
})

test('opens a tab page with navigateTo when the target is not in the current stack', () => {
  const action = resolveTabRouteAction(
    [
      { route: 'pages/customer/home/home' },
    ],
    '/pages/customer/cart/cart',
  )

  assert.deepEqual(action, {
    type: 'navigateTo',
    url: '/pages/customer/cart/cart',
  })
})

test('keeps forward navigation semantics when the target tab is on the right even if it already exists in stack', () => {
  const action = resolveTabRouteAction(
    [
      { route: 'pages/customer/home/home' },
      { route: 'pages/customer/orders/orders' },
      { route: 'pages/customer/cart/cart' },
    ],
    '/pages/customer/orders/orders',
    {
      currentPath: '/pages/customer/cart/cart',
      orderedTabPaths: [
        '/pages/customer/home/home',
        '/pages/customer/cart/cart',
        '/pages/customer/orders/orders',
        '/pages/customer/profile/profile',
      ],
    },
  )

  assert.deepEqual(action, {
    type: 'navigateTo',
    url: '/pages/customer/orders/orders',
  })
})

test('navigates through intermediate tabs when jumping forward across multiple tab positions', () => {
  const action = resolveTabRouteAction(
    [
      { route: 'pages/customer/home/home' },
    ],
    '/pages/customer/orders/orders',
    {
      currentPath: '/pages/customer/home/home',
      orderedTabPaths: [
        '/pages/customer/home/home',
        '/pages/customer/cart/cart',
        '/pages/customer/orders/orders',
        '/pages/customer/profile/profile',
      ],
    },
  )

  assert.deepEqual(action, {
    type: 'navigateToChain',
    urls: ['/pages/customer/cart/cart', '/pages/customer/orders/orders'],
  })
})

test('falls back to reLaunch when moving left but target tab is missing from stack', () => {
  const action = resolveTabRouteAction(
    [
      { route: 'pages/customer/home/home' },
      { route: 'pages/customer/orders/orders' },
    ],
    '/pages/customer/cart/cart',
    {
      currentPath: '/pages/customer/orders/orders',
      orderedTabPaths: [
        '/pages/customer/home/home',
        '/pages/customer/cart/cart',
        '/pages/customer/orders/orders',
        '/pages/customer/profile/profile',
      ],
    },
  )

  assert.deepEqual(action, {
    type: 'reLaunch',
    url: '/pages/customer/cart/cart',
  })
})

test('falls back to reLaunch when the page stack is full and target is not reusable', () => {
  const action = resolveTabRouteAction(
    [
      { route: 'pages/customer/home/home' },
      { route: 'pages/customer/cart/cart' },
      { route: 'pages/customer/orders/orders' },
      { route: 'pages/customer/profile/profile' },
      { route: 'pages/merchant/products/products' },
      { route: 'pages/merchant/orders/orders' },
      { route: 'pages/merchant/account-book/account-book' },
      { route: 'pages/merchant/inventory/inventory' },
      { route: 'pages/merchant/profile/profile' },
      { route: 'pages/admin/reviews/reviews' },
    ],
    '/pages/admin/profile/profile',
  )

  assert.deepEqual(action, {
    type: 'reLaunch',
    url: '/pages/admin/profile/profile',
  })
})

test('marks all current role pages as custom navigation pages to avoid back-button noise during tab reuse', () => {
  const rolePageJsonPaths = [
    'App/miniprogram/pages/customer/home/home.json',
    'App/miniprogram/pages/customer/cart/cart.json',
    'App/miniprogram/pages/customer/orders/orders.json',
    'App/miniprogram/pages/customer/profile/profile.json',
    'App/miniprogram/pages/merchant/products/products.json',
    'App/miniprogram/pages/merchant/orders/orders.json',
    'App/miniprogram/pages/merchant/account-book/account-book.json',
    'App/miniprogram/pages/merchant/inventory/inventory.json',
    'App/miniprogram/pages/merchant/profile/profile.json',
    'App/miniprogram/pages/admin/reviews/reviews.json',
    'App/miniprogram/pages/admin/overview/overview.json',
    'App/miniprogram/pages/admin/profile/profile.json',
  ]

  rolePageJsonPaths.forEach((relativePath) => {
    const jsonText = readWorkspaceFile(relativePath)
    assert.match(jsonText, /"navigationStyle"\s*:\s*"custom"/)
  })
})

test('adds safe-area top padding to role pages after switching to custom navigation style', () => {
  const wxss = readWorkspaceFile('App/miniprogram/pages/role-shell.wxss')

  assert.match(
    wxss,
    /\.role-page__content\s*\{[\s\S]*padding:\s*calc\(30rpx \+ env\(safe-area-inset-top\)\)\s*30rpx\s*calc\(180rpx \+ env\(safe-area-inset-bottom\)\);/,
  )
})
