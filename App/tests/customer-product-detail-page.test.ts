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
  assert.match(detailWxml, /customer-product-detail__nav-cell/)
  assert.match(detailWxml, /t-class="customer-product-detail__action-btn customer-product-detail__action-btn--ghost"/)
  assert.match(detailWxml, /t-class="customer-product-detail__action-btn customer-product-detail__action-btn--primary"/)
  assert.match(detailWxss, /\.customer-product-detail__footer\s*\{[\s\S]*display:\s*flex;/)
  assert.match(detailWxss, /\.customer-product-detail__footer-action-group\s*\{[\s\S]*flex:\s*1;/)
  assert.match(detailWxss, /--td-button-default-outline-color:\s*#bf5e46;/)
  assert.match(detailWxss, /--td-button-default-outline-border-color:\s*rgba\(189,\s*122,\s*106,\s*0\.24\);/)
  assert.doesNotMatch(detailWxss, /line-height:\s*124rpx;/)
})

test('raises detail hero preview area close to two-thirds of viewport', () => {
  const detailWxss = readWorkspaceFile('App/miniprogram/components/customer-product-detail/customer-product-detail.wxss')

  assert.match(detailWxss, /\.customer-product-detail__hero-image\s*\{[\s\S]*height:\s*66vh;/)
  assert.match(detailWxss, /\.customer-product-detail__cover\s*\{[\s\S]*height:\s*100%;/)
})

test('buy-now flow targets checkout instead of redirecting back to cart', () => {
  const detailPageTs = readWorkspaceFile('App/miniprogram/pages/customer/product-detail/product-detail.ts')

  assert.match(detailPageTs, /pages\/customer\/checkout\/checkout/)
})
