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

function readCartPageWxml(): string {
  return fs.readFileSync(
    path.join(workspaceRoot, 'App/miniprogram/pages/customer/cart/cart.wxml'),
    'utf8',
  )
}

test('renders checked cart items and an empty-state fallback', () => {
  const wxml = readCartSceneWxml()

  assert.match(wxml, /customer-cart-scene__cover/)
  assert.match(wxml, /customer-cart-scene__swipe-action/)
  assert.match(wxml, /handleItemTouchStart/)
  assert.match(wxml, /handleItemTouchMove/)
  assert.match(wxml, /handleItemTouchEnd/)
  assert.doesNotMatch(wxml, /t-swipe-cell/)
  assert.match(wxml, /空购物车|暂无蛋糕/)
})

test('cart scene exposes a checkout summary and action button', () => {
  const wxml = readCartSceneWxml()

  assert.match(wxml, /handleToggleAll/)
  assert.match(wxml, /handleSwipeAction/)
  assert.match(wxml, /合计/)
  assert.match(wxml, /去结算/)
  assert.match(wxml, /customer-cart-scene__summary-price/)
})

test('cart scene keeps a fixed-width toggle action and stable summary regions', () => {
  const wxml = readCartSceneWxml()
  const wxss = fs.readFileSync(
    path.join(workspaceRoot, 'App/miniprogram/components/customer-cart-scene/customer-cart-scene.wxss'),
    'utf8',
  )

  assert.match(wxml, /customer-cart-scene__summary-toggle/)
  assert.doesNotMatch(wxml, /取消全选/)
  assert.match(wxml, /customer-cart-scene__summary-main/)
  assert.match(wxml, /customer-cart-scene__summary-copy/)
  assert.match(wxss, /customer-cart-scene__summary-toggle/)
  assert.match(wxss, /customer-cart-scene__summary-price-value/)
  assert.match(wxss, /customer-cart-scene__summary-cta/)
})

test('cart scene uses an order-detail style dialog before deleting an item', () => {
  const componentWxml = readCartSceneWxml()
  const pageWxml = readCartPageWxml()
  const source = fs.readFileSync(
    path.join(workspaceRoot, 'App/miniprogram/pages/customer/cart/cart.ts'),
    'utf8',
  )

  assert.doesNotMatch(componentWxml, /<t-dialog/)
  assert.match(pageWxml, /<t-dialog/)
  assert.match(pageWxml, /title="删除商品"/)
  assert.match(pageWxml, /confirmBtn="确认删除"/)
  assert.match(pageWxml, /cancelBtn="我再想想"/)
  assert.match(pageWxml, /bind:confirm="handleConfirmDelete"/)
  assert.match(pageWxml, /bind:cancel="handleCloseDeleteDialog"/)
  assert.match(source, /deleteDialogVisible/)
  assert.match(source, /pendingDeleteItemId/)
})

test('cart scene emits a cross-component delete request event for page-level dialog ownership', () => {
  const source = fs.readFileSync(
    path.join(workspaceRoot, 'App/miniprogram/components/customer-cart-scene/customer-cart-scene.ts'),
    'utf8',
  )

  assert.match(
    source,
    /this\.triggerEvent\(\s*'sceneaction',\s*\{\s*action:\s*'request-cart-delete',\s*itemId,\s*\},\s*\{\s*bubbles:\s*true,\s*composed:\s*true,\s*\}\s*\)/s,
  )
})
