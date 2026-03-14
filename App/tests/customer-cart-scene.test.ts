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

test('cart scene exposes a checkout summary and action button', () => {
  const wxml = readCartSceneWxml()

  assert.match(wxml, /合计/)
  assert.match(wxml, /去结算/)
  assert.match(wxml, /bind:change="handleItemCheckChange"/)
})
