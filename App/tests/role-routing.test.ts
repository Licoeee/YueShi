import assert from 'node:assert/strict'
import test from 'node:test'

import {
  ROLE_DIRECTORY_STORAGE_KEY,
  createRoleSessionFromResolvedRolePayload,
  createRolePreviewSession,
  createDefaultRoleSession,
  findExplicitRoleSessionByOpenId,
  getRoleEntryPath,
  getRoleWelcomeMessage,
  parseResolvedRolePayload,
  parseRoleDirectory,
  queryRoleSessionByOpenIdWithAdapter,
  resolveRoleSessionByOpenId,
  type RoleDirectoryAdapter,
} from '../miniprogram/utils/role-routing'

test('parses role directory with normalized admin and merchant bindings', () => {
  const parsed = parseRoleDirectory({
    admins: ['  o_admin_1  ', '', 123],
    merchants: [
      { openId: ' o_merchant_1 ', shopName: '悦时烘焙' },
      { openId: ' ', shopName: '无效商家' },
    ],
  })

  assert.deepEqual(parsed, {
    admins: ['o_admin_1'],
    merchants: [{ openId: 'o_merchant_1', shopName: '悦时烘焙' }],
  })
})

test('resolves admin session when openId exists in admin directory', () => {
  const session = resolveRoleSessionByOpenId('o_admin', {
    admins: ['o_admin'],
    merchants: [{ openId: 'o_admin', shopName: '同名商家' }],
  })

  assert.deepEqual(session, {
    currentRole: 'admin',
    availableRoles: ['admin', 'merchant', 'customer'],
    isPreviewMode: false,
  })
})

test('resolves merchant session with merchant name when matching merchant openId', () => {
  const session = resolveRoleSessionByOpenId('o_merchant', {
    admins: [],
    merchants: [{ openId: 'o_merchant', shopName: '甜蜜时光' }],
  })

  assert.deepEqual(session, {
    currentRole: 'merchant',
    availableRoles: ['merchant', 'customer'],
    isPreviewMode: false,
    merchantName: '甜蜜时光',
  })
})

test('falls back to customer session when openId has no role mapping', () => {
  const session = resolveRoleSessionByOpenId('o_customer', {
    admins: [],
    merchants: [],
  })

  assert.deepEqual(session, createDefaultRoleSession())
})

test('returns null when local role directory does not explicitly match current openId', () => {
  const session = findExplicitRoleSessionByOpenId('o_customer', {
    admins: ['o_admin'],
    merchants: [{ openId: 'o_merchant', shopName: '悦时烘焙' }],
  })

  assert.equal(session, null)
})

test('prefers explicit merchant match when reading local debug override directory', () => {
  const session = findExplicitRoleSessionByOpenId('o_merchant', {
    admins: [],
    merchants: [{ openId: 'o_merchant', shopName: '悦时烘焙' }],
  })

  assert.deepEqual(session, {
    currentRole: 'merchant',
    availableRoles: ['merchant', 'customer'],
    isPreviewMode: false,
    merchantName: '悦时烘焙',
  })
})

test('reads role directory from storage adapter before resolving role', () => {
  let queriedStorageKey = ''
  const adapter: RoleDirectoryAdapter = {
    getStorageSync(key: string): unknown {
      queriedStorageKey = key

      return {
        admins: ['o_admin_from_storage'],
      }
    },
  }

  const session = queryRoleSessionByOpenIdWithAdapter('o_admin_from_storage', adapter)

  assert.equal(queriedStorageKey, ROLE_DIRECTORY_STORAGE_KEY)
  assert.equal(session.currentRole, 'admin')
})

test('parses resolved role payload returned by cloud function', () => {
  assert.deepEqual(parseResolvedRolePayload({ openId: 'o_admin', role: 'admin' }), {
    openId: 'o_admin',
    role: 'admin',
  })

  assert.deepEqual(
    parseResolvedRolePayload({
      openId: 'o_merchant',
      role: 'merchant',
      merchantName: '悦时烘焙',
    }),
    {
      openId: 'o_merchant',
      role: 'merchant',
      merchantName: '悦时烘焙',
    },
  )

  assert.equal(parseResolvedRolePayload({ openId: '', role: 'admin' }), null)
  assert.equal(parseResolvedRolePayload({ openId: 'o_admin', role: 'super-admin' }), null)
})

test('creates role session from cloud resolved role payload', () => {
  assert.deepEqual(createRoleSessionFromResolvedRolePayload({ openId: 'o_admin', role: 'admin' }), {
    currentRole: 'admin',
    availableRoles: ['admin', 'merchant', 'customer'],
    isPreviewMode: false,
  })

  assert.deepEqual(
    createRoleSessionFromResolvedRolePayload({
      openId: 'o_merchant',
      role: 'merchant',
      merchantName: '悦时烘焙',
    }),
    {
      currentRole: 'merchant',
      availableRoles: ['merchant', 'customer'],
      isPreviewMode: false,
      merchantName: '悦时烘焙',
    },
  )
})

test('builds role welcome messages according to role requirements', () => {
  const adminMessage = getRoleWelcomeMessage({
    currentRole: 'admin',
    availableRoles: ['admin'],
    isPreviewMode: false,
  })
  const merchantMessage = getRoleWelcomeMessage({
    currentRole: 'merchant',
    availableRoles: ['merchant'],
    isPreviewMode: false,
    merchantName: '悦时烘焙',
  })
  const customerMessage = getRoleWelcomeMessage({
    currentRole: 'customer',
    availableRoles: ['customer'],
    isPreviewMode: false,
  })

  assert.equal(adminMessage, '欢迎回来，最高指挥官大帅！')
  assert.equal(merchantMessage, '生意兴隆，悦时烘焙的老板！')
  assert.equal(customerMessage, null)
})

test('maps role entry paths for future tabbar isolation', () => {
  assert.equal(getRoleEntryPath('admin'), '/pages/admin/reviews/reviews')
  assert.equal(getRoleEntryPath('merchant'), '/pages/merchant/products/products')
  assert.equal(getRoleEntryPath('customer'), '/pages/customer/home/home')
})

test('creates preview session snapshots for role switch in admin profile', () => {
  assert.deepEqual(createRolePreviewSession('admin'), {
    currentRole: 'admin',
    availableRoles: ['admin', 'merchant', 'customer'],
    isPreviewMode: true,
  })

  assert.deepEqual(createRolePreviewSession('merchant', '悦时烘焙'), {
    currentRole: 'merchant',
    availableRoles: ['admin', 'merchant', 'customer'],
    isPreviewMode: true,
    merchantName: '悦时烘焙',
  })

  assert.deepEqual(createRolePreviewSession('customer'), {
    currentRole: 'customer',
    availableRoles: ['admin', 'merchant', 'customer'],
    isPreviewMode: true,
  })
})
