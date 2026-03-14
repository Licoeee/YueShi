import assert from 'node:assert/strict'
import test from 'node:test'

import {
  buildPickupPickerState,
  formatPickupSlot,
  resolvePickupSlotFromIndexes,
} from '../miniprogram/utils/customer-pickup-slot'

test('buildPickupPickerState returns month day and half-hour columns with a valid default slot', () => {
  const now = new Date('2026-03-14T10:20:00+08:00')
  const state = buildPickupPickerState(now)
  const slot = resolvePickupSlotFromIndexes(state.indexes, now)

  assert.equal(state.monthOptions.length > 0, true)
  assert.equal(state.dayOptions.length > 0, true)
  assert.equal(state.timeOptions.length, 48)
  assert.equal(slot?.timeLabel, '10:30')
  assert.equal(formatPickupSlot(slot ?? { month: 0, day: 0, timeLabel: '', isoText: '' }), '3月14日 10:30')
})

test('resolvePickupSlotFromIndexes rejects expired pickup slots', () => {
  const now = new Date('2026-03-14T23:50:00+08:00')

  const slot = resolvePickupSlotFromIndexes({ monthIndex: 0, dayIndex: 0, timeIndex: 0 }, now)

  assert.equal(slot, null)
})
