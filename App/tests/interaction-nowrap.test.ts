import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'

const workspaceRoot = process.cwd()

function readWorkspaceFile(relativePath: string): string {
  return fs.readFileSync(path.join(workspaceRoot, relativePath), 'utf8')
}

test('renders tabbar labels with an explicit single-line text wrapper', () => {
  const wxml = readWorkspaceFile('App/miniprogram/components/custom-tab-bar/custom-tab-bar.wxml')

  assert.match(
    wxml,
    /<text class="custom-tab-bar__label">\{\{item\.label\}\}<\/text>/,
  )
})

test('forces tabbar labels into a single line with truncation-safe styles', () => {
  const wxss = readWorkspaceFile('App/miniprogram/components/custom-tab-bar/custom-tab-bar.wxss')

  assert.match(
    wxss,
    /\.custom-tab-bar__label\s*\{[\s\S]*white-space:\s*nowrap;[\s\S]*overflow:\s*hidden;[\s\S]*text-overflow:\s*ellipsis;/,
  )
})

test('tightens tabbar proportions while keeping labels larger and readable', () => {
  const wxss = readWorkspaceFile('App/miniprogram/components/custom-tab-bar/custom-tab-bar.wxss')

  assert.match(
    wxss,
    /\.custom-tab-bar__panel\s*\{[\s\S]*--td-tab-bar-height:\s*72rpx;/,
  )
  assert.match(
    wxss,
    /\.custom-tab-bar__item\s*\{[\s\S]*height:\s*72rpx;[\s\S]*margin:\s*10rpx 0;[\s\S]*padding:\s*0 12rpx;/,
  )
  assert.match(
    wxss,
    /\.custom-tab-bar__label\s*\{[\s\S]*font-size:\s*26rpx;[\s\S]*line-height:\s*34rpx;/,
  )
})

test('keeps role pages visually continuous with a page-level background fallback', () => {
  const wxss = readWorkspaceFile('App/miniprogram/pages/role-shell.wxss')

  assert.match(
    wxss,
    /page\s*\{[\s\S]*background:\s*linear-gradient\(180deg,\s*#fff5f7 0%,\s*#ffe5d6 100%\);/,
  )
  assert.match(
    wxss,
    /\.role-page\s*\{[\s\S]*background:\s*linear-gradient\(180deg,\s*#fff5f7 0%,\s*#ffe5d6 100%\);/,
  )
})

test('defines a shared single-line interaction text utility for buttons and operation entries', () => {
  const wxss = readWorkspaceFile('App/miniprogram/app.wxss')

  assert.match(
    wxss,
    /\.app-interactive-text\s*\{[\s\S]*white-space:\s*nowrap;[\s\S]*overflow:\s*hidden;[\s\S]*text-overflow:\s*ellipsis;/,
  )
})

test('applies single-line interaction text rules to shared role scene and operation cells', () => {
  const rolePageSceneWxml = readWorkspaceFile('App/miniprogram/components/role-page-scene/role-page-scene.wxml')
  const foundationShellWxml = readWorkspaceFile('App/miniprogram/components/foundation-home-shell/foundation-home-shell.wxml')

  assert.match(rolePageSceneWxml, /t-class-title="app-interactive-text"/)
  assert.match(foundationShellWxml, /t-class-title="app-interactive-text"/)
})
