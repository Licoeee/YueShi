import assert from 'node:assert/strict'
import test from 'node:test'

import {
  clearCustomerSessionSnapshot,
  createMemoryCustomerSessionStorage,
  loadCustomerSessionSnapshot,
  saveCustomerSessionSnapshot,
} from '../miniprogram/utils/customer-session-storage'

test('loadCustomerSessionSnapshot returns a logged-out session by default', () => {
  const storage = createMemoryCustomerSessionStorage()
  const session = loadCustomerSessionSnapshot(storage)

  assert.equal(session.isLoggedIn, false)
  assert.equal(session.nickname, '微信用户')
})

test('saveCustomerSessionSnapshot persists a local customer login session', () => {
  const storage = createMemoryCustomerSessionStorage()

  saveCustomerSessionSnapshot(storage, {
    isLoggedIn: true,
    openIdLikeId: 'local-openid',
    authTicket: 'ticket-local',
    nickname: '悦时顾客',
    avatarUrl: 'https://example.com/avatar.png',
    lastLoginAt: '2026-03-15T06:30:00.000Z',
  })

  const session = loadCustomerSessionSnapshot(storage)

  assert.equal(session.isLoggedIn, true)
  assert.equal(session.nickname, '悦时顾客')
  assert.equal(session.avatarUrl, 'https://example.com/avatar.png')
})

test('clearCustomerSessionSnapshot removes only the stored session state', () => {
  const storage = createMemoryCustomerSessionStorage()

  saveCustomerSessionSnapshot(storage, {
    isLoggedIn: true,
    openIdLikeId: 'local-openid',
    authTicket: 'ticket-local',
    nickname: '悦时顾客',
    avatarUrl: 'https://example.com/avatar.png',
    lastLoginAt: '2026-03-15T06:30:00.000Z',
  })

  clearCustomerSessionSnapshot(storage)

  const session = loadCustomerSessionSnapshot(storage)
  assert.equal(session.isLoggedIn, false)
  assert.equal(session.avatarUrl, '')
})
