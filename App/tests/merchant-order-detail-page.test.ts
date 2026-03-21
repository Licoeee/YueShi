import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'

import { workspaceRoot } from './test-workspace-root'

function readWorkspaceFile(relativePath: string): string {
  return fs.readFileSync(path.join(workspaceRoot, relativePath), 'utf8')
}

test('merchant order detail page supports field zoom popup and font-size switching', () => {
  const wxml = readWorkspaceFile('App/miniprogram/pages/merchant/order-detail/order-detail.wxml')
  const source = readWorkspaceFile('App/miniprogram/pages/merchant/order-detail/order-detail.ts')
  const wxss = readWorkspaceFile('App/miniprogram/pages/merchant/order-detail/order-detail.wxss')
  const json = readWorkspaceFile('App/miniprogram/pages/merchant/order-detail/order-detail.json')

  assert.match(wxml, /merchant-order-detail-page__zoom-trigger/)
  assert.match(wxml, /merchant-order-detail-page__zoom-popup/)
  assert.match(wxml, /merchant-order-detail-page__font-picker/)
  assert.match(wxml, /merchant-order-detail-page__zoom-stage/)
  assert.match(wxml, /merchant-order-detail-page__zoom-card/)
  assert.match(wxml, /merchant-order-detail-page__zoom-copy-shell/)
  assert.match(wxml, /merchant-order-detail-page__zoom-copy-frame/)
  assert.match(wxml, /merchant-order-detail-page__zoom-field-label/)
  assert.match(wxml, /merchant-order-detail-page__zoom-field-value/)
  assert.match(source, /fontSizeMode/)
  assert.match(source, /handleOpenZoomPopup/)
  assert.match(source, /handleFontSizeChange/)
  assert.match(source, /handlePreviewOrderImages/)
  assert.match(source, /wx\.previewImage\(/)
  assert.match(source, /14/)
  assert.match(source, /16/)
  assert.match(source, /18/)
  assert.doesNotMatch(wxml, /标准|大字|特大/)
  assert.match(wxss, /\.merchant-order-detail-page__zoom-stage[\s\S]*justify-content:\s*center/)
  assert.match(wxss, /\.merchant-order-detail-page__zoom-card[\s\S]*border-radius:/)
  assert.match(wxss, /\.merchant-order-detail-page__zoom-copy-shell[\s\S]*justify-content:\s*center/)
  assert.match(wxss, /\.merchant-order-detail-page__zoom-copy-shell[\s\S]*align-items:\s*center/)
  assert.match(wxss, /\.merchant-order-detail-page__zoom-copy-frame[\s\S]*display:\s*inline-flex/)
  assert.match(wxml, /class="merchant-order-detail-page__zoom-copy"[\s\S]*>\{\{zoomPopupTextContent\}\}<\/text>/)
  assert.match(json, /"t-popup":\s*"tdesign-miniprogram\/popup\/popup"/)
  assert.match(json, /"t-picker":\s*"tdesign-miniprogram\/picker\/picker"/)
  assert.match(json, /"t-picker-item":\s*"tdesign-miniprogram\/picker-item\/picker-item"/)
})
