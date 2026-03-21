import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'

import { workspaceRoot } from './test-workspace-root'

function readWorkspaceFile(relativePath: string): string {
  return fs.readFileSync(path.join(workspaceRoot, relativePath), 'utf8')
}

test('merchant order recycle page supports restore and clear actions', () => {
  const wxml = readWorkspaceFile('App/miniprogram/pages/merchant/order-recycle/order-recycle.wxml')
  const source = readWorkspaceFile('App/miniprogram/pages/merchant/order-recycle/order-recycle.ts')

  assert.match(wxml, /清空回收站/)
  assert.match(wxml, /恢复订单/)
  assert.match(wxml, /彻底删除/)
  assert.match(source, /handleRestoreOrder/)
  assert.match(source, /handleClearRecycle/)
  assert.match(source, /handleDeleteOrderPermanently/)
})

test('merchant order recycle page removes subtitle and centers themed clear action', () => {
  const wxml = readWorkspaceFile('App/miniprogram/pages/merchant/order-recycle/order-recycle.wxml')
  const wxss = readWorkspaceFile('App/miniprogram/pages/merchant/order-recycle/order-recycle.wxss')

  assert.doesNotMatch(wxml, /merchant-order-recycle-page__subtitle/)
  assert.match(wxml, /merchant-order-recycle-page__clear-action/)
  assert.match(wxss, /\.merchant-order-recycle-page__clear-action/)
  assert.match(wxss, /\.merchant-order-recycle-page__clear-btn/)
})

test('merchant order recycle page uses themed confirm popup instead of default dialog', () => {
  const wxml = readWorkspaceFile('App/miniprogram/pages/merchant/order-recycle/order-recycle.wxml')
  const wxss = readWorkspaceFile('App/miniprogram/pages/merchant/order-recycle/order-recycle.wxss')

  assert.match(wxml, /merchant-order-recycle-page__dialog-shell/)
  assert.match(wxml, /merchant-order-recycle-page__dialog-actions/)
  assert.match(wxss, /\.merchant-order-recycle-page__dialog-shell/)
  assert.match(wxss, /\.merchant-order-recycle-page__dialog-actions/)
  assert.doesNotMatch(wxml, /<t-dialog/)
})
