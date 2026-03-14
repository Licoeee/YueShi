import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'

import { workspaceRoot } from './test-workspace-root'

function readCartSceneWxml(): string {
  return fs.readFileSync(
    path.join(workspaceRoot, 'App/miniprogram/components/customer-cart-scene/customer-cart-scene.wxml'),
    'utf8',
  )
}

test('renders checked cart items and an empty-state fallback', () => {
  const wxml = readCartSceneWxml()

  assert.match(wxml, /checked="{{item.checked}}"/)
  assert.match(wxml, /空购物车|暂无蛋糕/)
})
