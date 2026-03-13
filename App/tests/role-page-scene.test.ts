import assert from 'node:assert/strict'
import test from 'node:test'

import { getRoleTabbarItems } from '../miniprogram/utils/role-tabbar'
import { getRolePageScene } from '../miniprogram/utils/role-page-scenes'

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
