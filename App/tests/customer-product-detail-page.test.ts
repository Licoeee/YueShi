import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'

import { workspaceRoot } from './test-workspace-root'

function readWorkspaceFile(relativePath: string): string {
  return fs.readFileSync(path.join(workspaceRoot, relativePath), 'utf8')
}

test('full detail page keeps the four bottom actions and does not rely on the half-sheet footer', () => {
  const source = readWorkspaceFile('App/miniprogram/pages/customer/product-detail/product-detail.wxml')

  assert.match(source, /首页/)
  assert.match(source, /购物车/)
  assert.match(source, /加入购物车/)
  assert.match(source, /立即购买/)
})

test('registers the dedicated product detail route in app.json', () => {
  const appJson = readWorkspaceFile('App/miniprogram/app.json')

  assert.match(appJson, /pages\/customer\/product-detail\/product-detail/)
})

test('uses grouped footer layout in detail component to prevent action overlap', () => {
  const detailWxml = readWorkspaceFile('App/miniprogram/components/customer-product-detail/customer-product-detail.wxml')
  const detailWxss = readWorkspaceFile('App/miniprogram/components/customer-product-detail/customer-product-detail.wxss')

  assert.match(detailWxml, /customer-product-detail__footer-nav-group/)
  assert.match(detailWxml, /customer-product-detail__footer-action-group/)
  assert.match(detailWxss, /grid-template-columns:\s*272rpx\s*minmax\(0,\s*1fr\);/)
})
