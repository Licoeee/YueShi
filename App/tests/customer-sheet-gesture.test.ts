import assert from 'node:assert/strict'
import test from 'node:test'

import { shouldLiftToDetail } from '../miniprogram/utils/customer-sheet-gesture'

test('returns true when the user swipes up inside the detail area past the threshold', () => {
  assert.equal(shouldLiftToDetail({ startY: 480, endY: 372, threshold: 72 }), true)
})

test('returns false for short or downward swipes', () => {
  assert.equal(shouldLiftToDetail({ startY: 480, endY: 452, threshold: 72 }), false)
  assert.equal(shouldLiftToDetail({ startY: 372, endY: 420, threshold: 72 }), false)
})
