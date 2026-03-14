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
