import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'

import { workspaceRoot } from './test-workspace-root'

function readWorkspaceFile(relativePath: string): string {
  return fs.readFileSync(path.join(workspaceRoot, relativePath), 'utf8')
}

test('role-page-scene mounts merchant profile business scene', () => {
  const source = readWorkspaceFile('App/miniprogram/components/role-page-scene/role-page-scene.wxml')

  assert.match(source, /<merchant-profile-scene/)
})

test('merchant profile scene provides blacklist navigation entry', () => {
  const wxml = readWorkspaceFile('App/miniprogram/components/merchant-profile-scene/merchant-profile-scene.wxml')
  const source = readWorkspaceFile('App/miniprogram/components/merchant-profile-scene/merchant-profile-scene.ts')

  assert.match(wxml, /黑名单管理/)
  assert.match(source, /\/pages\/merchant\/blacklist\/blacklist/)
})
