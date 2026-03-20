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

  assert.equal(state.monthOptions.length, 12)
  assert.equal(state.dayOptions.length, 31)
  assert.equal(state.timeOptions.length, 48)
  assert.equal(slot?.timeLabel, '10:30')
  assert.equal(formatPickupSlot(slot ?? { month: 0, day: 0, timeLabel: '', isoText: '' }), '3月14日 10:30')
})

test('buildPickupPickerState uses the correct day count for 30-day and leap-year months', () => {
  const aprilState = buildPickupPickerState(new Date('2026-04-10T10:20:00+08:00'), { monthIndex: 3 })
  const leapFebruaryState = buildPickupPickerState(new Date('2028-02-10T10:20:00+08:00'), { monthIndex: 1 })

  assert.equal(aprilState.dayOptions.length, 30)
  assert.equal(leapFebruaryState.dayOptions.length, 29)
})

test('resolvePickupSlotFromIndexes rejects expired pickup slots', () => {
  const now = new Date('2026-03-14T23:50:00+08:00')

  const slot = resolvePickupSlotFromIndexes({ monthIndex: 2, dayIndex: 13, timeIndex: 0 }, now)

  assert.equal(slot, null)
})
