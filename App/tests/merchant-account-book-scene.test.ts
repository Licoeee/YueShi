import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'

import { workspaceRoot } from './test-workspace-root'

function readWorkspaceFile(relativePath: string): string {
  return fs.readFileSync(path.join(workspaceRoot, relativePath), 'utf8')
}

test('role-page-scene mounts merchant account book business scene', () => {
  const source = readWorkspaceFile('App/miniprogram/components/role-page-scene/role-page-scene.wxml')

  assert.match(source, /<merchant-account-book-scene/)
})

test('merchant account book scene renders fund ledger controls and trend chart', () => {
  const wxml = readWorkspaceFile('App/miniprogram/components/merchant-account-book-scene/merchant-account-book-scene.wxml')

  assert.match(wxml, /资金流水/)
  assert.match(wxml, /日/)
  assert.match(wxml, /周/)
  assert.match(wxml, /月/)
  assert.match(wxml, /导出报表/)
  assert.match(wxml, /merchant-account-book-scene__chart/)
})

test('merchant account book scene separates chart shell axes plot and point detail', () => {
  const wxml = readWorkspaceFile('App/miniprogram/components/merchant-account-book-scene/merchant-account-book-scene.wxml')
  const source = readWorkspaceFile('App/miniprogram/components/merchant-account-book-scene/merchant-account-book-scene.ts')

  assert.match(wxml, /merchant-account-book-scene__chart-shell/)
  assert.match(wxml, /merchant-account-book-scene__plot/)
  assert.match(wxml, /merchant-account-book-scene__y-axis/)
  assert.match(wxml, /merchant-account-book-scene__x-axis/)
  assert.match(wxml, /bindtap="handleChartPointTap"/)
  assert.match(wxml, /merchant-account-book-scene__point-detail/)
  assert.match(source, /selectedPointKey/)
})

test('merchant account book scene aggregates from orders and inventory ledger helpers', () => {
  const source = readWorkspaceFile('App/miniprogram/components/merchant-account-book-scene/merchant-account-book-scene.ts')
  const json = readWorkspaceFile('App/miniprogram/components/merchant-account-book-scene/merchant-account-book-scene.json')

  assert.match(source, /buildMerchantFundLedger/)
  assert.match(source, /loadStoredCustomerOrders/)
  assert.match(source, /loadStoredMerchantInventoryRecords/)
  assert.match(json, /"t-button":\s*"tdesign-miniprogram\/button\/button"/)
})

test('merchant scenes share visible merchant button tokens instead of plain white outline defaults', () => {
  const productsWxss = readWorkspaceFile('App/miniprogram/components/merchant-products-scene/merchant-products-scene.wxss')
  const ordersWxss = readWorkspaceFile('App/miniprogram/components/merchant-orders-scene/merchant-orders-scene.wxss')
  const accountWxss = readWorkspaceFile('App/miniprogram/components/merchant-account-book-scene/merchant-account-book-scene.wxss')
  const sharedWxss = readWorkspaceFile('App/miniprogram/styles/merchant-button-token.wxss')

  assert.match(productsWxss, /merchant-button-token\.wxss/)
  assert.match(ordersWxss, /merchant-button-token\.wxss/)
  assert.match(accountWxss, /merchant-button-token\.wxss/)
  assert.match(sharedWxss, /\.merchant-button-token/)
  assert.match(sharedWxss, /\.merchant-button-token--primary/)
  assert.match(sharedWxss, /\.merchant-button-token--outline/)
})
