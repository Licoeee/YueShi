import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'

import { workspaceRoot } from './test-workspace-root'

function readWorkspaceFile(relativePath: string): string {
  return fs.readFileSync(path.join(workspaceRoot, relativePath), 'utf8')
}

test('registers the customer order recycle route in app.json', () => {
  const appJson = readWorkspaceFile('App/miniprogram/app.json')

  assert.match(appJson, /pages\/customer\/order-recycle\/order-recycle/)
})

test('customer order recycle page renders recycle title, restore button, and empty state', () => {
  const wxml = readWorkspaceFile('App/miniprogram/pages/customer/order-recycle/order-recycle.wxml')

  assert.match(wxml, /删除订单|订单回收站/)
  assert.match(wxml, /恢复订单/)
  assert.match(wxml, /t-empty/)
  assert.match(wxml, /垃圾桶/)
  assert.doesNotMatch(wxml, /<t-icon/)
})

test('customer order recycle page restores orders via repository and refreshes list', () => {
  const source = readWorkspaceFile('App/miniprogram/pages/customer/order-recycle/order-recycle.ts')

  assert.match(source, /splitCustomerOrdersByRecycleState/)
  assert.match(source, /createLocalCustomerOrderRepository/)
  assert.match(source, /restoreDeletedOrder\(/)
  assert.match(source, /runCustomerAuthorizedAction/)
  assert.match(source, /请先完成微信登录/)
})

test('customer order recycle page declares required TDesign components', () => {
  const pageJson = readWorkspaceFile('App/miniprogram/pages/customer/order-recycle/order-recycle.json')
  const wxml = readWorkspaceFile('App/miniprogram/pages/customer/order-recycle/order-recycle.wxml')
  const wxss = readWorkspaceFile('App/miniprogram/pages/customer/order-recycle/order-recycle.wxss')

  assert.match(pageJson, /"t-button":\s*"tdesign-miniprogram\/button\/button"/)
  assert.match(pageJson, /"t-empty":\s*"tdesign-miniprogram\/empty\/empty"/)
  assert.match(pageJson, /"t-tag":\s*"tdesign-miniprogram\/tag\/tag"/)
  assert.match(wxml, /t-class="order-recycle-page__restore-button"/)
  assert.match(wxml, /block="\{\{true\}\}"/)
  assert.match(wxss, /--td-button-primary-bg-color/)
  assert.match(wxss, /--td-button-primary-active-bg-color/)
  assert.match(wxss, /--td-button-primary-disabled-bg/)
})
