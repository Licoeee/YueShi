import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'

import { workspaceRoot } from './test-workspace-root'

function readWorkspaceFile(relativePath: string): string {
  return fs.readFileSync(path.join(workspaceRoot, relativePath), 'utf8')
}

test('shared search theme styles clear buttons as circular affordances in both t-search and t-input', () => {
  const searchWxss = readWorkspaceFile('App/miniprogram/miniprogram_npm/tdesign-miniprogram/search/search.wxss')
  const distSearchWxss = readWorkspaceFile('App/miniprogram/node_modules/tdesign-miniprogram/miniprogram_dist/search/search.wxss')
  const inputWxss = readWorkspaceFile('App/miniprogram/miniprogram_npm/tdesign-miniprogram/input/input.wxss')
  const distInputWxss = readWorkspaceFile('App/miniprogram/node_modules/tdesign-miniprogram/miniprogram_dist/input/input.wxss')

  assert.match(searchWxss, /\.t-search__clear\{[^}]*border-radius:/)
  assert.match(searchWxss, /\.t-search__clear\{[^}]*display:flex/)
  assert.match(distSearchWxss, /\.t-search__clear\{[^}]*border-radius:/)
  assert.match(inputWxss, /\.t-input__wrap--clearable-icon\{[^}]*border-radius:/)
  assert.match(inputWxss, /\.t-input__wrap--clearable-icon\{[^}]*display:flex/)
  assert.match(distInputWxss, /\.t-input__wrap--clearable-icon\{[^}]*border-radius:/)
})

test('merchant orders scene overrides calendar theme tokens instead of height only', () => {
  const wxss = readWorkspaceFile('App/miniprogram/components/merchant-orders-scene/merchant-orders-scene.wxss')

  assert.match(wxss, /--td-calendar-active-color/)
  assert.match(wxss, /--td-calendar-title-color/)
  assert.match(wxss, /--td-calendar-bg-color/)
})
