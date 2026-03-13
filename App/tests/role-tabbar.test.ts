import assert from 'node:assert/strict'
import test from 'node:test'

import {
  getRoleTabbarItems,
  getRoleTabbarItemsByPath,
  getRoleTabbarPreloadPaths,
  getRoleTabbarValueByPath,
} from '../miniprogram/utils/role-tabbar'

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
})

test('builds merchant tabbar with products / orders / account-book / inventory / profile items', () => {
  const items = getRoleTabbarItems('merchant')

  assert.deepEqual(
    items.map((item) => item.value),
    ['merchant-products', 'merchant-orders', 'merchant-account-book', 'merchant-inventory', 'merchant-profile'],
  )
})

test('builds admin tabbar with reviews / overview / profile items', () => {
  const items = getRoleTabbarItems('admin')

  assert.deepEqual(
    items.map((item) => item.value),
    ['admin-reviews', 'admin-overview', 'admin-profile'],
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
