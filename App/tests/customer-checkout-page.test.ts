import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'

import { workspaceRoot } from './test-workspace-root'

function readWorkspaceFile(relativePath: string): string {
  return fs.readFileSync(path.join(workspaceRoot, relativePath), 'utf8')
}

test('registers the dedicated checkout route in app.json', () => {
  const appJson = readWorkspaceFile('App/miniprogram/app.json')

  assert.match(appJson, /pages\/customer\/checkout\/checkout/)
})

test('checkout page contains contact, pickup, and submit sections', () => {
  const wxml = readWorkspaceFile('App/miniprogram/pages/customer/checkout/checkout.wxml')

  assert.match(wxml, /手机号/)
  assert.match(wxml, /取货时间/)
  assert.match(wxml, /提交订单/)
})

test('checkout page carries the PRD payment guidance copy', () => {
  const source = readWorkspaceFile('App/miniprogram/pages/customer/checkout/checkout.ts')

  assert.match(source, /请在付款时备注手机号后四位，以便商家对账/)
})
