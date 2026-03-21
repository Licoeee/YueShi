import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'

import { workspaceRoot } from './test-workspace-root'

function readWorkspaceFile(relativePath: string): string {
  return fs.readFileSync(path.join(workspaceRoot, relativePath), 'utf8')
}

test('registers merchant blacklist route in app.json', () => {
  const appJson = readWorkspaceFile('App/miniprogram/app.json')

  assert.match(appJson, /pages\/merchant\/blacklist\/blacklist/)
})

test('merchant blacklist page exposes openid add and remove dialog actions', () => {
  const wxml = readWorkspaceFile('App/miniprogram/pages/merchant/blacklist/blacklist.wxml')

  assert.match(wxml, /OpenID/)
  assert.match(wxml, /拉黑用户/)
  assert.match(wxml, /解除拉黑/)
  assert.match(wxml, /t-dialog/)
})

test('merchant blacklist page wires storage helpers for marking and unmarking openid', () => {
  const source = readWorkspaceFile('App/miniprogram/pages/merchant/blacklist/blacklist.ts')
  const json = readWorkspaceFile('App/miniprogram/pages/merchant/blacklist/blacklist.json')

  assert.match(source, /addOpenIdToMerchantBlacklist/)
  assert.match(source, /removeOpenIdFromMerchantBlacklist/)
  assert.match(source, /loadMerchantBlacklistSnapshot/)
  assert.match(source, /handleConfirmRemoveOpenId/)
  assert.match(json, /"t-dialog":\s*"tdesign-miniprogram\/dialog\/dialog"/)
})
