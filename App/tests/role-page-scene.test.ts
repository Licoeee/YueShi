import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import { workspaceRoot } from './test-workspace-root'

import { getRoleTabbarItems } from '../miniprogram/utils/role-tabbar'
import { getRolePageScene } from '../miniprogram/utils/role-page-scenes'

function readWorkspaceFile(relativePath: string): string {
  return fs.readFileSync(path.join(workspaceRoot, relativePath), 'utf8')
}

test('provides a shared scene definition for every current role tab page', () => {
  const allPaths = [
    ...getRoleTabbarItems('customer'),
    ...getRoleTabbarItems('merchant'),
    ...getRoleTabbarItems('admin'),
  ].map((item) => item.path)

  allPaths.forEach((path) => {
    const scene = getRolePageScene(path)

    assert.equal(scene.path, path)
    assert.equal(scene.title.length > 0, true)
    assert.equal(scene.sections.length > 0, true)
  })
})

test('keeps admin profile scene switcher as a dedicated shared scene section', () => {
  const scene = getRolePageScene('/pages/admin/profile/profile')

  assert.equal(scene.sections.some((section) => section.kind === 'admin-role-switcher'), true)
})

test('keeps preview return action available in merchant and customer profile scenes', () => {
  const merchantScene = getRolePageScene('/pages/merchant/profile/profile')
  const customerScene = getRolePageScene('/pages/customer/profile/profile')

  assert.equal(merchantScene.sections.some((section) => section.kind === 'preview-return'), true)
  assert.equal(customerScene.sections.some((section) => section.kind === 'preview-return'), true)
})

test('throws for unknown role scene paths so transition previews cannot silently drift', () => {
  assert.throws(() => getRolePageScene('/pages/unknown/path'))
})

test('binds all role pages to scene-mode tab switching to avoid cross-page route flashing', () => {
  const rolePageWxmlPaths = [
    'App/miniprogram/pages/customer/home/home.wxml',
    'App/miniprogram/pages/customer/cart/cart.wxml',
    'App/miniprogram/pages/customer/orders/orders.wxml',
    'App/miniprogram/pages/customer/profile/profile.wxml',
    'App/miniprogram/pages/merchant/products/products.wxml',
    'App/miniprogram/pages/merchant/orders/orders.wxml',
    'App/miniprogram/pages/merchant/account-book/account-book.wxml',
    'App/miniprogram/pages/merchant/inventory/inventory.wxml',
    'App/miniprogram/pages/merchant/profile/profile.wxml',
    'App/miniprogram/pages/admin/reviews/reviews.wxml',
    'App/miniprogram/pages/admin/overview/overview.wxml',
    'App/miniprogram/pages/admin/profile/profile.wxml',
  ]

  rolePageWxmlPaths.forEach((relativePath) => {
    const source = readWorkspaceFile(relativePath)

    assert.match(source, /mode="scene"/)
    assert.match(source, /scenePath="\{\{scenePath\}\}"/)
    assert.match(source, /bind:tabchange="handleTabChange"/)
  })
})

test('renders customer business scenes instead of placeholder cards for home, cart, and orders', () => {
  const source = readWorkspaceFile('App/miniprogram/components/role-page-scene/role-page-scene.wxml')

  assert.match(source, /<customer-home-scene/)
  assert.match(source, /<customer-cart-scene/)
  assert.match(source, /<customer-orders-scene/)
})

test('wraps customer scenes with a top safe-area shell to avoid status-bar overlap', () => {
  const wxml = readWorkspaceFile('App/miniprogram/components/role-page-scene/role-page-scene.wxml')
  const wxss = readWorkspaceFile('App/miniprogram/components/role-page-scene/role-page-scene.wxss')

  assert.match(wxml, /role-page-scene__customer-shell/)
  assert.match(wxss, /padding:\s*calc\(14rpx \+ env\(safe-area-inset-top\) \+ 88rpx\)\s*30rpx\s*0;/)
})

test('forwards cart delete requests to the page with a bubbling composed sceneaction event', () => {
  const source = readWorkspaceFile('App/miniprogram/components/role-page-scene/role-page-scene.ts')

  assert.match(
    source,
    /handleChildSceneAction[\s\S]*this\.triggerEvent\(\s*'sceneaction',\s*event\.detail,\s*\{\s*bubbles:\s*true,\s*composed:\s*true,\s*\}\s*\)/,
  )
})

test('customer scene host pages keep cart delete dialog handling in scene mode', () => {
  const homeWxml = readWorkspaceFile('App/miniprogram/pages/customer/home/home.wxml')
  const ordersWxml = readWorkspaceFile('App/miniprogram/pages/customer/orders/orders.wxml')
  const profileWxml = readWorkspaceFile('App/miniprogram/pages/customer/profile/profile.wxml')
  const homeTs = readWorkspaceFile('App/miniprogram/pages/customer/home/home.ts')
  const ordersTs = readWorkspaceFile('App/miniprogram/pages/customer/orders/orders.ts')
  const profileTs = readWorkspaceFile('App/miniprogram/pages/customer/profile/profile.ts')

  assert.match(homeWxml, /cartRefreshTick="\{\{cartRefreshTick\}\}"/)
  assert.match(ordersWxml, /cartRefreshTick="\{\{cartRefreshTick\}\}"/)
  assert.match(profileWxml, /cartRefreshTick="\{\{cartRefreshTick\}\}"/)
  assert.match(homeWxml, /<t-dialog/)
  assert.match(ordersWxml, /<t-dialog/)
  assert.match(profileWxml, /<t-dialog/)
  assert.match(homeTs, /request-cart-delete/)
  assert.match(ordersTs, /request-cart-delete/)
  assert.match(profileTs, /request-cart-delete/)
})
