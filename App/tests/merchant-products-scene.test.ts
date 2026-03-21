import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'

import { workspaceRoot } from './test-workspace-root'

function readWorkspaceFile(relativePath: string): string {
  return fs.readFileSync(path.join(workspaceRoot, relativePath), 'utf8')
}

test('role-page-scene mounts merchant products business scene', () => {
  const source = readWorkspaceFile('App/miniprogram/components/role-page-scene/role-page-scene.wxml')

  assert.match(source, /<merchant-products-scene/)
})

test('merchant products scene includes waterfall cards, batch actions, and recycle popup', () => {
  const wxml = readWorkspaceFile('App/miniprogram/components/merchant-products-scene/merchant-products-scene.wxml')

  assert.match(wxml, /新增商品/)
  assert.match(wxml, /回收站/)
  assert.match(wxml, /批量编辑/)
  assert.match(wxml, /退出编辑/)
  assert.match(wxml, /ID \{\{item.id\}\}/)
  assert.match(wxml, /t-popup/)
  assert.match(wxml, /上传图片/)
  assert.match(wxml, /奶油类型/)
})

test('merchant products scene renders multi-select cream controls and multi-image preview rail', () => {
  const wxml = readWorkspaceFile('App/miniprogram/components/merchant-products-scene/merchant-products-scene.wxml')
  const source = readWorkspaceFile('App/miniprogram/components/merchant-products-scene/merchant-products-scene.ts')

  assert.match(wxml, /t-checkbox-group value="\{\{productCreamTypes\}\}"/)
  assert.match(source, /label: '裸蛋糕'/)
  assert.match(wxml, /productImageUrls/)
  assert.match(wxml, /设为首图/)
  assert.match(source, /handlePreviewProductImage/)
  assert.match(source, /handleRemoveProductImage/)
  assert.match(source, /handleSetPrimaryProductImage/)
})

test('merchant products scene renders layer selection price adjustment groups and select-all controls', () => {
  const wxml = readWorkspaceFile('App/miniprogram/components/merchant-products-scene/merchant-products-scene.wxml')
  const source = readWorkspaceFile('App/miniprogram/components/merchant-products-scene/merchant-products-scene.ts')
  const types = readWorkspaceFile('App/types/merchant-product.d.ts')

  assert.match(wxml, /基础价格/)
  assert.match(wxml, /尺寸加价/)
  assert.match(wxml, /层数选择/)
  assert.match(wxml, /层数加价/)
  assert.match(wxml, /奶油加价/)
  assert.match(wxml, /handleToggleAllSpecSizes/)
  assert.match(wxml, /handleToggleAllLayers/)
  assert.match(wxml, /handleToggleAllCreamTypes/)
  assert.match(types, /type MerchantProductLayer =/)
  assert.match(source, /handleProductLayerChange/)
})

test('merchant products scene uses themed validation dialog and required marks instead of toast-only validation', () => {
  const wxml = readWorkspaceFile('App/miniprogram/components/merchant-products-scene/merchant-products-scene.wxml')
  const wxss = readWorkspaceFile('App/miniprogram/components/merchant-products-scene/merchant-products-scene.wxss')
  const source = readWorkspaceFile('App/miniprogram/components/merchant-products-scene/merchant-products-scene.ts')

  assert.match(wxml, /merchant-products-scene__required-mark/)
  assert.match(wxml, /validationDialogVisible/)
  assert.match(wxml, /merchant-products-scene__dialog-shell/)
  assert.match(wxss, /\.merchant-products-scene__required-mark/)
  assert.match(wxss, /\.merchant-products-scene__dialog-shell/)
  assert.match(source, /collectMissingRequiredFields/)
  assert.match(source, /validationMissingFields/)
})

test('merchant products scene exposes two action rows and a search input', () => {
  const wxml = readWorkspaceFile('App/miniprogram/components/merchant-products-scene/merchant-products-scene.wxml')

  assert.match(wxml, /merchant-products-scene__action-grid/)
  assert.match(wxml, /merchant-products-scene__action-row merchant-products-scene__action-row--primary/)
  assert.match(wxml, /merchant-products-scene__action-row merchant-products-scene__action-row--secondary/)
  assert.match(wxml, /placeholder="搜索商品名称、ID、规格"/)
})

test('merchant products scene keeps waterfall layout outside checkbox-group wrapper', () => {
  const wxml = readWorkspaceFile('App/miniprogram/components/merchant-products-scene/merchant-products-scene.wxml')

  assert.doesNotMatch(wxml, /<t-checkbox-group wx:else value="\{\{selectedProductIds\}\}" bind:change="handleBatchSelectionChange">/)
  assert.match(wxml, /class="merchant-products-scene__waterfall"/)
  assert.match(wxml, /class="merchant-products-scene__selection"/)
})

test('merchant products scene separates toolbar button sizing from card actions', () => {
  const wxml = readWorkspaceFile('App/miniprogram/components/merchant-products-scene/merchant-products-scene.wxml')
  const wxss = readWorkspaceFile('App/miniprogram/components/merchant-products-scene/merchant-products-scene.wxss')

  assert.match(wxml, /merchant-products-scene__toolbar-btn/)
  assert.match(wxml, /merchant-products-scene__card-btn/)
  assert.match(wxss, /\.merchant-products-scene__toolbar-btn/)
  assert.match(wxss, /\.merchant-products-scene__card-btn/)
})

test('merchant products scene keeps edit delete actions in a stable action rail', () => {
  const wxml = readWorkspaceFile('App/miniprogram/components/merchant-products-scene/merchant-products-scene.wxml')
  const wxss = readWorkspaceFile('App/miniprogram/components/merchant-products-scene/merchant-products-scene.wxss')

  assert.match(wxml, /merchant-products-scene__card-actions/)
  assert.match(wxml, /merchant-products-scene__card-action-cell/)
  assert.match(wxml, /merchant-products-scene__card-action-shell/)
  assert.match(wxss, /\.merchant-products-scene__card-action-cell/)
  assert.match(wxss, /\.merchant-products-scene__card-action-shell/)
})

test('merchant products scene uses consistent round selection controls and scrollable popup body', () => {
  const wxml = readWorkspaceFile('App/miniprogram/components/merchant-products-scene/merchant-products-scene.wxml')
  const wxss = readWorkspaceFile('App/miniprogram/components/merchant-products-scene/merchant-products-scene.wxss')

  assert.match(wxml, /handleToggleProductSelection/)
  assert.match(wxml, /icon="\{\{selectionCircleIcons\}\}"/)
  assert.match(wxml, /scroll-view class="merchant-products-scene__popup-scroll" scroll-y/)
  assert.match(wxml, /class="merchant-products-scene__popup-shell/)
  assert.match(wxss, /\.merchant-products-scene__popup-shell/)
  assert.match(wxss, /\.merchant-products-scene__popup-scroll/)
})

test('merchant products scene uses a multi-phase batch edit state machine', () => {
  const source = readWorkspaceFile('App/miniprogram/components/merchant-products-scene/merchant-products-scene.ts')

  assert.match(source, /type BatchEditPhase = 'idle' \| 'selecting' \| 'editing'/)
  assert.match(source, /batchEditPhase/)
  assert.match(source, /productSearchKeyword/)
  assert.match(source, /handleBatchEditTrigger/)
  assert.match(source, /handleExitBatchEdit/)
  assert.doesNotMatch(source, /batchEditMode/)
})

test('merchant products scene uses storage helpers for CRUD, batch edit, and id counter', () => {
  const source = readWorkspaceFile('App/miniprogram/components/merchant-products-scene/merchant-products-scene.ts')
  const json = readWorkspaceFile('App/miniprogram/components/merchant-products-scene/merchant-products-scene.json')

  assert.match(source, /MERCHANT_PRODUCT_ID_COUNTER_KEY/)
  assert.match(source, /createMerchantProduct/)
  assert.match(source, /updateMerchantProduct/)
  assert.match(source, /deleteMerchantProduct/)
  assert.match(source, /batchEditMerchantProducts/)
  assert.match(source, /restoreMerchantProduct/)
  assert.match(json, /"t-popup":\s*"tdesign-miniprogram\/popup\/popup"/)
  assert.match(json, /"t-radio-group":\s*"tdesign-miniprogram\/radio-group\/radio-group"/)
})
