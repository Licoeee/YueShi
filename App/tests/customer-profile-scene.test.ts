import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'

import { workspaceRoot } from './test-workspace-root'

function readWorkspaceFile(relativePath: string): string {
  return fs.readFileSync(path.join(workspaceRoot, relativePath), 'utf8')
}

test('role page scene exposes a dedicated customer-profile render branch', () => {
  const source = readWorkspaceFile('App/miniprogram/components/role-page-scene/role-page-scene.ts')
  const wxml = readWorkspaceFile('App/miniprogram/components/role-page-scene/role-page-scene.wxml')

  assert.match(source, /customer-profile/)
  assert.match(wxml, /customer-profile-scene/)
})

test('customer profile scene contains avatar, login actions, and settings entry', () => {
  const wxml = readWorkspaceFile('App/miniprogram/components/customer-profile-scene/customer-profile-scene.wxml')

  assert.match(wxml, /头像|avatar/i)
  assert.match(wxml, /微信登录/)
  assert.match(wxml, /退出登录/)
  assert.match(wxml, /设置/)
  assert.match(wxml, /删除订单/)
})

test('customer profile scene keeps delete-order entry outside local-account note section', () => {
  const wxml = readWorkspaceFile('App/miniprogram/components/customer-profile-scene/customer-profile-scene.wxml')
  const localAccountSection =
    wxml.match(
      /<view class="glass-card customer-profile-scene__section">[\s\S]*?<text class="customer-profile-scene__section-title">本地账号说明<\/text>[\s\S]*?<\/t-cell-group>/,
    )?.[0] ?? ''

  assert.match(wxml, /customer-profile-scene__recycle-section/)
  assert.match(wxml, /customer-profile-scene__recycle-entry-button/)
  assert.equal(localAccountSection.includes('删除订单'), false)
})

test('customer profile scene places delete-order section above local-account section', () => {
  const wxml = readWorkspaceFile('App/miniprogram/components/customer-profile-scene/customer-profile-scene.wxml')
  const recycleIndex = wxml.indexOf('customer-profile-scene__recycle-section')
  const localAccountIndex = wxml.indexOf('本地账号说明')

  assert.equal(recycleIndex >= 0, true)
  assert.equal(localAccountIndex >= 0, true)
  assert.equal(recycleIndex < localAccountIndex, true)
})

test('customer profile action buttons use dedicated warm-theme classes', () => {
  const wxml = readWorkspaceFile('App/miniprogram/components/customer-profile-scene/customer-profile-scene.wxml')
  const wxss = readWorkspaceFile('App/miniprogram/components/customer-profile-scene/customer-profile-scene.wxss')

  assert.match(wxml, /customer-profile-scene__action-button/)
  assert.match(wxml, /customer-profile-scene__action-button--outline/)
  assert.match(wxml, /customer-profile-scene__action-button--\{\{session\.isLoggedIn \? 'disabled' : 'primary'\}\}/)
  assert.match(wxss, /customer-profile-scene__action-button/)
})

test('customer profile note cells use dedicated non-truncating note class', () => {
  const wxml = readWorkspaceFile('App/miniprogram/components/customer-profile-scene/customer-profile-scene.wxml')

  assert.match(wxml, /t-class-note="customer-profile-scene__cell-note"/)
  assert.doesNotMatch(wxml, /t-class-note="app-interactive-text"/)
})
