import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'

import { workspaceRoot } from './test-workspace-root'

function readWorkspaceFile(relativePath: string): string {
  return fs.readFileSync(path.join(workspaceRoot, relativePath), 'utf8')
}

test('role-page-scene mounts merchant inventory business scene', () => {
  const source = readWorkspaceFile('App/miniprogram/components/role-page-scene/role-page-scene.wxml')

  assert.match(source, /<merchant-inventory-scene/)
})

test('merchant inventory scene uses production date and shelf life to compute expiry date', () => {
  const wxml = readWorkspaceFile('App/miniprogram/components/merchant-inventory-scene/merchant-inventory-scene.wxml')

  assert.match(wxml, /生产日期/)
  assert.match(wxml, /保质期/)
  assert.match(wxml, /过期日期/)
  assert.match(wxml, /保存入库/)
  assert.match(wxml, /disabled="\{\{!canSubmitCreate\}\}"/)
  assert.match(wxml, /t-picker-item/)
})

test('merchant inventory scene wires subscription preference prompt after successful inbound record', () => {
  const source = readWorkspaceFile('App/miniprogram/components/merchant-inventory-scene/merchant-inventory-scene.ts')
  const json = readWorkspaceFile('App/miniprogram/components/merchant-inventory-scene/merchant-inventory-scene.json')

  assert.match(source, /createMerchantInventoryRecord/)
  assert.match(source, /loadMerchantExpirySubscriptionPreference/)
  assert.match(source, /promptSubscribeIfNeeded/)
  assert.match(source, /saveMerchantExpirySubscriptionPreference/)
  assert.match(json, /"t-picker":\s*"tdesign-miniprogram\/picker\/picker"/)
  assert.match(json, /"t-popup":\s*"tdesign-miniprogram\/popup\/popup"/)
})
