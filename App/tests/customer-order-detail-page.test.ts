import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'

import { workspaceRoot } from './test-workspace-root'

function readWorkspaceFile(relativePath: string): string {
  return fs.readFileSync(path.join(workspaceRoot, relativePath), 'utf8')
}

test('registers the customer order detail route in app.json', () => {
  assert.match(readWorkspaceFile('App/miniprogram/app.json'), /pages\/customer\/order-detail\/order-detail/)
})

test('order detail page contains note editing and cancel-order sections', () => {
  const wxml = readWorkspaceFile('App/miniprogram/pages/customer/order-detail/order-detail.wxml')

  assert.match(wxml, /订单备注/)
  assert.match(wxml, /取消订单/)
  assert.match(wxml, /删除订单/)
  assert.match(wxml, /order-detail-page__item-cover/)
})

test('order detail page uses cancellation guard logic for locked statuses', () => {
  const source = readWorkspaceFile('App/miniprogram/pages/customer/order-detail/order-detail.ts')

  assert.match(source, /canCustomerCancelOrder/)
})

test('order detail page invokes repository delete flow for terminal statuses', () => {
  const source = readWorkspaceFile('App/miniprogram/pages/customer/order-detail/order-detail.ts')

  assert.match(source, /canCustomerDeleteOrder/)
  assert.match(source, /runCustomerAuthorizedAction/)
  assert.match(source, /deleteOrder\(/)
  assert.match(source, /请先完成微信登录/)
  assert.match(source, /order-recycle|orders\/orders/)
})

test('order detail page keeps a dedicated save-note action', () => {
  const wxml = readWorkspaceFile('App/miniprogram/pages/customer/order-detail/order-detail.wxml')
  const wxss = readWorkspaceFile('App/miniprogram/pages/customer/order-detail/order-detail.wxss')

  assert.match(wxml, /保存备注/)
  assert.match(wxml, /编辑备注/)
  assert.match(wxss, /white-space:\s*nowrap/)
})

test('order detail action buttons use dedicated TDesign style classes', () => {
  const wxml = readWorkspaceFile('App/miniprogram/pages/customer/order-detail/order-detail.wxml')
  const wxss = readWorkspaceFile('App/miniprogram/pages/customer/order-detail/order-detail.wxss')

  assert.match(wxml, /order-detail-page__action-button/)
  assert.match(wxml, /order-detail-page__action-button--danger/)
  assert.match(wxss, /order-detail-page__action-button/)
})
