import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'

import { workspaceRoot } from './test-workspace-root'

function readWorkspaceFile(relativePath: string): string {
  return fs.readFileSync(path.join(workspaceRoot, relativePath), 'utf8')
}

test('registers the lightweight customer settings route in app.json', () => {
  const appJson = readWorkspaceFile('App/miniprogram/app.json')

  assert.match(appJson, /pages\/customer\/settings\/settings/)
})

test('customer settings page exposes login status and local cleanup sections', () => {
  const wxml = readWorkspaceFile('App/miniprogram/pages/customer/settings/settings.wxml')

  assert.match(wxml, /登录状态/)
  assert.match(wxml, /清理购物车/)
  assert.match(wxml, /手机号历史/)
  assert.match(wxml, /本地订单|订单缓存/)
})

test('customer settings page renders current account in a dedicated info block', () => {
  const wxml = readWorkspaceFile('App/miniprogram/pages/customer/settings/settings.wxml')
  const wxss = readWorkspaceFile('App/miniprogram/pages/customer/settings/settings.wxss')

  assert.match(wxml, /settings-page__account-card/)
  assert.match(wxml, /settings-page__account-name/)
  assert.doesNotMatch(wxml, /note=\"\{\{session\.nickname\}\}\"/)
  assert.match(wxss, /settings-page__account-card/)
})

test('customer settings note cells use dedicated non-truncating note class', () => {
  const wxml = readWorkspaceFile('App/miniprogram/pages/customer/settings/settings.wxml')

  assert.match(wxml, /t-class-note="settings-page__cell-note"/)
  assert.doesNotMatch(wxml, /t-class-note="app-interactive-text"/)
})
