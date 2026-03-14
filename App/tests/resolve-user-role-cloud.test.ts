import assert from 'node:assert/strict'
import test from 'node:test'

const roleDirectoryModule = require('../cloudfunctions/resolve-user-role/role-directory.js')

test('falls back to the first role directory document when default id is missing', () => {
  const fallbackDocument = roleDirectoryModule.pickRoleDirectoryDocument([
    {
      _id: 'role_directory',
      admins: ['ox08W7bvWsm3neWGioriCaZ-CHAQ'],
      merchants: [],
    },
  ])

  assert.deepEqual(fallbackDocument, {
    _id: 'role_directory',
    admins: ['ox08W7bvWsm3neWGioriCaZ-CHAQ'],
    merchants: [],
  })
})

test('still prefers the default role directory document when it exists', () => {
  const preferredDocument = roleDirectoryModule.pickRoleDirectoryDocument([
    {
      _id: 'role_directory',
      admins: ['o_fallback'],
      merchants: [],
    },
    {
      _id: 'default',
      admins: ['o_default'],
      merchants: [],
    },
  ])

  assert.deepEqual(preferredDocument, {
    _id: 'default',
    admins: ['o_default'],
    merchants: [],
  })
})
