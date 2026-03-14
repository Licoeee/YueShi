import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import { workspaceRoot } from './test-workspace-root'

const welcomeWxmlPath = path.join(workspaceRoot, 'App/miniprogram/pages/welcome/welcome.wxml')
const welcomeWxssPath = path.join(workspaceRoot, 'App/miniprogram/pages/welcome/welcome.wxss')

function readWelcomeWxml(): string {
  return fs.readFileSync(welcomeWxmlPath, 'utf8')
}

function readWelcomeWxss(): string {
  return fs.readFileSync(welcomeWxssPath, 'utf8')
}

test('keeps the welcome page content order and animation bindings intact', () => {
  const wxml = readWelcomeWxml()

  assert.match(
    wxml,
    /<view\s+class="welcome-page__content[\s\S]*?<view\s+class="welcome-page__brand">[\s\S]*?<view\s+class="welcome-page__hero">[\s\S]*?<view\s+class="welcome-page__footer">/,
  )

  assert.match(
    wxml,
    /welcome-page__cta-shell \{\{isButtonVisible \? 'welcome-page__cta-shell--visible' : ''\}\} \{\{isButtonReady \? 'welcome-page__cta-shell--ready' : ''\}\}/,
  )
  assert.match(
    wxml,
    /welcome-page__particles \{\{isRevealing \? 'welcome-page__particles--active' : ''\}\}/,
  )
  assert.match(
    wxml,
    /welcome-page__role-loading-title">\{\{loadingRoleTitle\}\}/,
  )
  assert.match(
    wxml,
    /welcome-page__role-loading-subtitle">\{\{loadingRoleSubtitle\}\}/,
  )
  assert.doesNotMatch(
    wxml,
    /foundation-home-shell/,
  )
})

test('applies layout scheme-a vertical rhythm without top clustering', () => {
  const wxss = readWelcomeWxss()

  assert.match(
    wxss,
    /\.welcome-page__content\s*\{[\s\S]*padding:\s*calc\(136rpx \+ env\(safe-area-inset-top\)\)\s*34rpx\s*calc\(18rpx \+ env\(safe-area-inset-bottom\)\);/,
  )
  assert.match(
    wxss,
    /\.welcome-page__brand\s*\{[\s\S]*margin-top:\s*48rpx;/,
  )

  assert.match(
    wxss,
    /\.welcome-page__hero\s*\{[\s\S]*position:\s*relative;[\s\S]*justify-content:\s*flex-end;[\s\S]*flex:\s*1;[\s\S]*min-height:\s*260rpx;[\s\S]*margin-top:\s*-20rpx;[\s\S]*margin-bottom:\s*-18rpx;[\s\S]*transform:\s*none;/,
  )
  assert.doesNotMatch(
    wxss,
    /\.welcome-page__hero\s*\{[\s\S]*position:\s*absolute;[\s\S]*top:\s*50%;[\s\S]*transform:\s*translateY\(-50%\);/,
  )
  assert.doesNotMatch(
    wxss,
    /\.welcome-page__hero\s*\{[\s\S]*flex:\s*none;/,
  )

  assert.match(
    wxss,
    /\.welcome-page__footer\s*\{[\s\S]*position:\s*relative;[\s\S]*margin-top:\s*auto;[\s\S]*margin-bottom:\s*calc\(8rpx \+ env\(safe-area-inset-bottom\)\);/,
  )
  assert.doesNotMatch(
    wxss,
    /\.welcome-page__footer\s*\{[\s\S]*position:\s*absolute;[\s\S]*bottom:\s*calc\(40rpx \+ env\(safe-area-inset-bottom\)\);/,
  )
  assert.doesNotMatch(
    wxss,
    /\.welcome-page__footer\s*\{[\s\S]*margin-top:\s*0;/,
  )
})

test('keeps scheme-a hero scaling and animation hooks', () => {
  const wxss = readWelcomeWxss()

  assert.match(
    wxss,
    /\.welcome-page__hero-stage\s*\{[\s\S]*transform:\s*translateY\(42rpx\)\s*scale\(1\.34\);/,
  )
  assert.match(wxss, /\.welcome-page__title-shadow,[\s\S]*?font-size:\s*(10[0-8]|9\d)rpx;/)
  assert.match(wxss, /\.cake\s*\{[\s\S]*width:\s*488rpx;/)
  assert.match(wxss, /\.cake\s*\{[\s\S]*animation:\s*cake-float 4s ease-in-out infinite;/)
  assert.match(wxss, /\.cake__flame\s*\{[\s\S]*animation:\s*flame-pulse 1\.5s ease-in-out infinite;/)
})
