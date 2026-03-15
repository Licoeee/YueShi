import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'

import { workspaceRoot } from './test-workspace-root'

function readOrdersSceneFile(extension: 'wxml' | 'ts' | 'wxss'): string {
  return fs.readFileSync(
    path.join(workspaceRoot, `App/miniprogram/components/customer-orders-scene/customer-orders-scene.${extension}`),
    'utf8',
  )
}

function readOrdersSceneJson(): string {
  return fs.readFileSync(
    path.join(workspaceRoot, 'App/miniprogram/components/customer-orders-scene/customer-orders-scene.json'),
    'utf8',
  )
}

test('customer orders scene renders empty and populated order states', () => {
  const wxml = readOrdersSceneFile('wxml')

  assert.match(wxml, /暂无订单|空订单/)
  assert.match(wxml, /\{\{item\.statusLabel\}\}/)
  assert.match(wxml, /取货时间/)
})

test('customer orders scene refreshes from local order storage on attach and show', () => {
  const source = readOrdersSceneFile('ts')

  assert.match(source, /attached\(\): void\s*\{\s*this\.syncOrders\(\)/)
  assert.match(source, /show\(\): void\s*\{\s*this\.syncOrders\(\)/)
})

test('customer orders scene exposes four status filter tags with TDesign bindings', () => {
  const wxml = readOrdersSceneFile('wxml')
  const json = readOrdersSceneJson()

  assert.doesNotMatch(wxml, /<t-tabs/)
  assert.doesNotMatch(wxml, /<t-tab-panel/)
  assert.match(wxml, /wx:for="\{\{orderTabs\}\}"/)
  assert.match(wxml, /data-tab-key="\{\{item\.value\}\}"/)
  assert.match(wxml, /bindtap="handleTabChange"/)
  assert.match(wxml, /<t-tag[\s\S]*theme="\{\{activeTab === item\.value \? 'primary' : 'default'\}\}"/)
  assert.match(wxml, /t-class="customer-orders-scene__filter-tag"/)
  assert.match(wxml, /\{\{item\.label\}\}/)
  assert.match(json, /"t-tag":\s*"tdesign-miniprogram\/tag\/tag"/)
  assert.doesNotMatch(json, /"t-tabs":/)
  assert.doesNotMatch(json, /"t-tab-panel":/)
})

test('customer orders scene tracks the active tab and derives visible orders', () => {
  const source = readOrdersSceneFile('ts')

  assert.match(source, /activeTab:/)
  assert.match(source, /orderTabs:/)
  assert.match(source, /visibleOrders:/)
  assert.match(source, /function resolveOrderTabKey\(status: OrderStatus\)/)
  assert.match(source, /handleTabChange\(/)
})

test('customer orders scene exposes tappable cards that route to detail', () => {
  const wxml = readOrdersSceneFile('wxml')

  assert.match(wxml, /bindtap="handleOrderTap"/)
  assert.match(wxml, /customer-orders-scene__cover/)
})

test('customer orders scene keeps a dedicated note-highlight card modifier', () => {
  const wxss = readOrdersSceneFile('wxss')

  assert.match(wxss, /customer-orders-scene__card--noted/)
  assert.match(wxss, /customer-orders-scene__tab-item--active/)
})

test('customer orders scene stretches the four status filters into equal-width columns', () => {
  const wxss = readOrdersSceneFile('wxss')

  assert.match(wxss, /\.customer-orders-scene__tab-item\s*\{[\s\S]*flex:\s*1;/)
  assert.match(wxss, /\.customer-orders-scene__tab-item\s*\{[\s\S]*min-width:\s*0;/)
  assert.match(wxss, /\.customer-orders-scene__tab-item \.t-tag\s*\{[\s\S]*width:\s*100%;/)
})
