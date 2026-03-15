import assert from 'node:assert/strict'
import test from 'node:test'

import {
  clampSwipeOffset,
  getSwipeDirection,
  resolveSwipeEndState,
  resolveSwipeOffset,
} from '../miniprogram/utils/customer-cart-swipe'

test('getSwipeDirection prefers horizontal drags once the minimum distance is reached', () => {
  assert.equal(getSwipeDirection({ deltaX: -24, deltaY: 8, minDistance: 10 }), 'horizontal')
})

test('getSwipeDirection returns vertical for scroll-first gestures and empty for short drags', () => {
  assert.equal(getSwipeDirection({ deltaX: 6, deltaY: 18, minDistance: 10 }), 'vertical')
  assert.equal(getSwipeDirection({ deltaX: 6, deltaY: 4, minDistance: 10 }), '')
})

test('resolveSwipeOffset keeps offsets within the delete action width', () => {
  assert.equal(resolveSwipeOffset({ startOffset: 0, deltaX: -40, actionWidth: 72 }), 40)
  assert.equal(resolveSwipeOffset({ startOffset: 0, deltaX: -120, actionWidth: 72 }), 72)
  assert.equal(resolveSwipeOffset({ startOffset: 56, deltaX: 80, actionWidth: 72 }), 0)
})

test('resolveSwipeEndState opens only after passing the threshold', () => {
  assert.equal(resolveSwipeEndState({ startOffset: 0, offset: 28, actionWidth: 100, thresholdRatio: 0.3 }), 'closed')
  assert.equal(resolveSwipeEndState({ startOffset: 0, offset: 31, actionWidth: 100, thresholdRatio: 0.3 }), 'open')
})

test('resolveSwipeEndState allows a mostly open item to stay open after a small closing drag', () => {
  assert.equal(resolveSwipeEndState({ startOffset: 100, offset: 76, actionWidth: 100, thresholdRatio: 0.3 }), 'open')
  assert.equal(resolveSwipeEndState({ startOffset: 100, offset: 64, actionWidth: 100, thresholdRatio: 0.3 }), 'closed')
})

test('clampSwipeOffset mirrors the resolver bounds', () => {
  assert.equal(clampSwipeOffset(-8, 88), 0)
  assert.equal(clampSwipeOffset(108, 88), 88)
})
