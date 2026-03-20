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
  assert.match(wxml, /checkout-page__item-cover/)
  assert.match(wxml, /历史手机号/)
})

test('checkout page carries the PRD payment guidance copy', () => {
  const source = readWorkspaceFile('App/miniprogram/pages/customer/checkout/checkout.ts')

  assert.match(source, /请在付款时备注手机号后四位，以便商家对账/)
  assert.match(source, /savePhoneToHistory/)
  assert.match(source, /runCustomerAuthorizedAction/)
})

test('checkout footer keeps a dedicated right-aligned action area', () => {
  const wxss = readWorkspaceFile('App/miniprogram/pages/customer/checkout/checkout.wxss')

  assert.match(wxss, /checkout-page__footer-main/)
  assert.match(wxss, /checkout-page__submit-button/)
})

test('checkout page separates phone history entry from the input row', () => {
  const wxml = readWorkspaceFile('App/miniprogram/pages/customer/checkout/checkout.wxml')
  const wxss = readWorkspaceFile('App/miniprogram/pages/customer/checkout/checkout.wxss')

  assert.match(wxml, /checkout-page__contact-input/)
  assert.match(wxml, /checkout-page__history-entry/)
  assert.match(wxss, /checkout-page__history-entry/)
  assert.match(wxss, /checkout-page__history-copy/)
})

test('checkout page exposes invalid pickup hints and disables submit when pickup is invalid', () => {
  const wxml = readWorkspaceFile('App/miniprogram/pages/customer/checkout/checkout.wxml')
  const source = readWorkspaceFile('App/miniprogram/pages/customer/checkout/checkout.ts')

  assert.match(wxml, /checkout-page__pickup-warning/)
  assert.match(wxml, /checkout-page__submit-button--\{\{submitDisabled \? 'disabled' : 'primary'\}\}/)
  assert.match(source, /submitDisabled/)
  assert.match(source, /pickupWarning/)
})
