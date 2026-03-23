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

function readHomeSceneTs(): string {
  return fs.readFileSync(
    path.join(workspaceRoot, 'App/miniprogram/components/customer-home-scene/customer-home-scene.ts'),
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

test('customer home scene uses a single custom round clear action instead of TDesign built-in clearable icon', () => {
  const wxml = readHomeSceneWxml()
  const source = readHomeSceneTs()

  assert.match(wxml, /customer-home-scene__search-clear/)
  assert.match(source, /handleClearSearch/)
  assert.doesNotMatch(wxml, /<t-search/)
  assert.doesNotMatch(wxml, /clearable="\{\{true\}\}"/)
})

test('customer home scene syncs feed with explicit keyword input instead of immediately rereading stale state', () => {
  const source = readHomeSceneTs()

  assert.match(source, /syncFeed\(keyword\?: string\)/)
  assert.match(source, /const resolvedKeyword = keyword \?\? this\.data\.keyword/)
  assert.match(source, /this\.syncFeed\(keyword\)/)
  assert.match(source, /this\.syncFeed\(''\)/)
  assert.doesNotMatch(source, /this\.setData\(\{\s*keyword:\s*extractSearchKeyword\(event\.detail\),\s*\}\)\s*this\.syncFeed\(\)/s)
})
