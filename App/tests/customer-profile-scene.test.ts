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
})
