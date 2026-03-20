import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'

import { workspaceRoot } from './test-workspace-root'

function readHomeSceneWxml(): string {
  return fs.readFileSync(
    path.join(workspaceRoot, 'App/miniprogram/components/customer-home-scene/customer-home-scene.wxml'),
    'utf8',
  )
}

test('binds card taps to the product detail preview and omits the old add-cart icon', () => {
  const wxml = readHomeSceneWxml()

  assert.match(wxml, /bindtap="handleProductTap"/)
  assert.doesNotMatch(wxml, /cart-add/)
  assert.doesNotMatch(wxml, /加入购物车/)
})

test('mounts the preview-only customer product sheet from the home scene', () => {
  const wxml = readHomeSceneWxml()

  assert.match(wxml, /<customer-product-sheet/)
  assert.match(wxml, /bind:lift="handleSheetLift"/)
})
