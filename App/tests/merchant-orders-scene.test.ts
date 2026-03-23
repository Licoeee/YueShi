import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'

import { workspaceRoot } from './test-workspace-root'

function readWorkspaceFile(relativePath: string): string {
  return fs.readFileSync(path.join(workspaceRoot, relativePath), 'utf8')
}

test('role-page-scene mounts merchant orders business scene', () => {
  const source = readWorkspaceFile('App/miniprogram/components/role-page-scene/role-page-scene.wxml')

  assert.match(source, /<merchant-orders-scene/)
})

test('merchant orders scene supports calendar filtering and note highlight cards', () => {
  const wxml = readWorkspaceFile('App/miniprogram/components/merchant-orders-scene/merchant-orders-scene.wxml')
  const wxss = readWorkspaceFile('App/miniprogram/components/merchant-orders-scene/merchant-orders-scene.wxss')
  const source = readWorkspaceFile('App/miniprogram/components/merchant-orders-scene/merchant-orders-scene.ts')

  assert.match(wxml, /t-calendar/)
  assert.match(wxml, /minDate="\{\{calendarMinDate\}\}"/)
  assert.match(wxml, /value="\{\{calendarValue\}\}"/)
  assert.match(source, /calendarMinDate:\s*resolveCalendarMinDate\(\)/)
  assert.match(source, /calendarValue:\s*resolveTodayTimestamp\(\)/)
  assert.match(wxml, /merchant-orders-scene__card--noted/)
  assert.match(wxss, /merchant-orders-scene__card--noted/)
})

test('merchant orders scene renders cover image copy block and tag stack', () => {
  const wxml = readWorkspaceFile('App/miniprogram/components/merchant-orders-scene/merchant-orders-scene.wxml')
  const source = readWorkspaceFile('App/miniprogram/components/merchant-orders-scene/merchant-orders-scene.ts')

  assert.match(wxml, /merchant-orders-scene__cover-shell/)
  assert.match(wxml, /merchant-orders-scene__card-copy/)
  assert.match(wxml, /merchant-orders-scene__tag-stack/)
  assert.match(wxml, /coverImageUrl/)
  assert.match(source, /coverImageUrl/)
})

test('merchant orders scene includes status tabs search and auto cleanup entry', () => {
  const wxml = readWorkspaceFile('App/miniprogram/components/merchant-orders-scene/merchant-orders-scene.wxml')
  const wxss = readWorkspaceFile('App/miniprogram/components/merchant-orders-scene/merchant-orders-scene.wxss')

  assert.match(wxml, /待确认/)
  assert.match(wxml, /待制作/)
  assert.match(wxml, /待取货/)
  assert.match(wxml, /已完成/)
  assert.match(wxml, /placeholder="搜索订单号、手机号、商品名称"/)
  assert.match(wxml, /定时清理/)
  assert.match(wxss, /\.merchant-orders-scene__status-tabs/)
  assert.match(wxss, /\.merchant-orders-scene__search/)
})

test('merchant orders scene uses a single controlled search clear action and no built-in clearable icon', () => {
  const wxml = readWorkspaceFile('App/miniprogram/components/merchant-orders-scene/merchant-orders-scene.wxml')
  const source = readWorkspaceFile('App/miniprogram/components/merchant-orders-scene/merchant-orders-scene.ts')

  assert.match(wxml, /merchant-orders-scene__search-clear/)
  assert.match(source, /handleClearOrderSearch/)
  assert.doesNotMatch(wxml, /clearable="\{\{true\}\}"/)
})

test('merchant orders scene rebuilds visible orders with explicit keyword patch on search clear', () => {
  const source = readWorkspaceFile('App/miniprogram/components/merchant-orders-scene/merchant-orders-scene.ts')

  assert.match(source, /handleOrderSearchChange\([\s\S]*orderSearchKeyword[\s\S]*buildVisibleOrdersPatch\(this\.data\.orders, this\.data\.selectedDateKey, orderSearchKeyword, this\.data\.activeStatusTab\)/)
  assert.match(source, /handleClearOrderSearch\(\): void[\s\S]*orderSearchKeyword:\s*''[\s\S]*buildVisibleOrdersPatch\(this\.data\.orders, this\.data\.selectedDateKey, '', this\.data\.activeStatusTab\)/)
})

test('merchant orders scene includes order detail entry and cleanup recycle actions', () => {
  const wxml = readWorkspaceFile('App/miniprogram/components/merchant-orders-scene/merchant-orders-scene.wxml')
  const source = readWorkspaceFile('App/miniprogram/components/merchant-orders-scene/merchant-orders-scene.ts')

  assert.match(wxml, /立即清空/)
  assert.match(wxml, /回收站/)
  assert.match(wxml, /bindtap="handleOpenOrderDetail"/)
  assert.match(source, /handleOpenOrderDetail/)
  assert.match(source, /handleInstantCleanup/)
  assert.match(source, /handleOpenRecyclePage/)
})

test('merchant orders scene separates recycle entry from cleanup settings and removes passive utility copy', () => {
  const wxml = readWorkspaceFile('App/miniprogram/components/merchant-orders-scene/merchant-orders-scene.wxml')
  const wxss = readWorkspaceFile('App/miniprogram/components/merchant-orders-scene/merchant-orders-scene.wxss')

  assert.doesNotMatch(wxml, /merchant-orders-scene__utility-note/)
  assert.doesNotMatch(wxml, /merchant-orders-scene__utility-meta/)
  assert.match(wxml, /merchant-orders-scene__recycle-entry/)
  assert.match(wxss, /merchant-orders-scene__recycle-entry/)
})

test('merchant orders scene renders merchant status actions and completed delete action', () => {
  const wxml = readWorkspaceFile('App/miniprogram/components/merchant-orders-scene/merchant-orders-scene.wxml')
  const source = readWorkspaceFile('App/miniprogram/components/merchant-orders-scene/merchant-orders-scene.ts')

  assert.match(wxml, /确认付款/)
  assert.match(wxml, /制作完成/)
  assert.match(wxml, /已取货/)
  assert.match(wxml, /删除订单/)
  assert.match(source, /activeStatusTab/)
  assert.match(source, /orderSearchKeyword/)
  assert.match(source, /merchant-order-management/)
})

test('merchant orders scene uses a themed action confirm dialog for status transitions and delete', () => {
  const wxml = readWorkspaceFile('App/miniprogram/components/merchant-orders-scene/merchant-orders-scene.wxml')
  const wxss = readWorkspaceFile('App/miniprogram/components/merchant-orders-scene/merchant-orders-scene.wxss')
  const source = readWorkspaceFile('App/miniprogram/components/merchant-orders-scene/merchant-orders-scene.ts')

  assert.match(wxml, /confirmDialogVisible/)
  assert.match(wxml, /merchant-orders-scene__dialog-shell/)
  assert.match(wxml, /merchant-orders-scene__dialog-actions/)
  assert.match(wxss, /\.merchant-orders-scene__dialog-shell/)
  assert.match(wxss, /\.merchant-orders-scene__dialog-actions/)
  assert.match(source, /pendingActionKind/)
  assert.match(source, /handleConfirmActionDialog/)
  assert.match(source, /openActionDialog/)
  assert.doesNotMatch(wxml, /<t-dialog/)
})

test('merchant orders scene loads and sorts orders through merchant pipeline helpers and merchant order management', () => {
  const source = readWorkspaceFile('App/miniprogram/components/merchant-orders-scene/merchant-orders-scene.ts')
  const json = readWorkspaceFile('App/miniprogram/components/merchant-orders-scene/merchant-orders-scene.json')

  assert.match(source, /loadStoredCustomerOrders/)
  assert.match(source, /buildMerchantOrderPipeline/)
  assert.match(source, /filterMerchantOrdersByDate/)
  assert.match(source, /loadMerchantOrderAutoCleanupDays/)
  assert.match(source, /updateMerchantOrderStatus/)
  assert.match(source, /deleteCompletedMerchantOrder/)
  assert.match(json, /"shared-search-shell":\s*"\/components\/shared-search-shell\/shared-search-shell"/)
  assert.match(json, /"t-calendar":\s*"tdesign-miniprogram\/calendar\/calendar"/)
  assert.match(json, /"t-popup":\s*"tdesign-miniprogram\/popup\/popup"/)
})
