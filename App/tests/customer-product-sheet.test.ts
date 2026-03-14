import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'

import { workspaceRoot } from './test-workspace-root'

function readWorkspaceFile(relativePath: string): string {
  return fs.readFileSync(path.join(workspaceRoot, relativePath), 'utf8')
}

test('uses a two-thirds preview sheet with click-to-zoom images instead of swiper', () => {
  const wxml = readWorkspaceFile('App/miniprogram/components/customer-product-sheet/customer-product-sheet.wxml')
  const wxss = readWorkspaceFile('App/miniprogram/components/customer-product-sheet/customer-product-sheet.wxss')

  assert.match(wxml, /customer-product-sheet__gallery/)
  assert.match(wxml, /bindtap="handlePreviewImage"/)
  assert.doesNotMatch(wxml, /<t-swiper/)
  assert.match(wxss, /height:\s*66vh;/)
  assert.match(wxss, /grid-template-rows:\s*248rpx\s*1fr;/)
})
