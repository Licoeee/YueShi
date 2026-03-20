import type { PickupSlot } from '../../types/order'

export interface PickupPickerOption {
  value: string
  label: string
}

export interface PickupPickerIndexes {
  monthIndex: number
  dayIndex: number
  timeIndex: number
}

export interface PickupPickerState {
  monthOptions: PickupPickerOption[]
  dayOptions: PickupPickerOption[]
  timeOptions: PickupPickerOption[]
  indexes: PickupPickerIndexes
}

interface PickupDayOption extends PickupPickerOption {
  year: number
  month: number
  day: number
}

const HALF_HOUR_IN_MS = 30 * 60 * 1000

function clampIndex(index: number | undefined, length: number, fallback: number): number {
  if (!Number.isInteger(index)) {
    return fallback
  }

  if (length <= 0) {
    return 0
  }

  return Math.min(Math.max(index as number, 0), length - 1)
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate()
}

function buildMonthOptions(): PickupPickerOption[] {
  return Array.from({ length: 12 }, (_, index) => {
    const month = index + 1
    return {
      value: String(month),
      label: `${month} 月`,
    }
  })
}

function buildDayOptions(year: number, month: number): PickupDayOption[] {
  const dayCount = getDaysInMonth(year, month)

  return Array.from({ length: dayCount }, (_, index) => {
    const day = index + 1
    const monthText = String(month).padStart(2, '0')
    const dayText = String(day).padStart(2, '0')

    return {
      value: `${year}-${monthText}-${dayText}`,
      label: `${day} 日`,
      year,
      month,
      day,
    }
  })
}

function buildTimeOptions(): PickupPickerOption[] {
  const options: PickupPickerOption[] = []

  for (let hour = 0; hour < 24; hour += 1) {
    for (let minute = 0; minute < 60; minute += 30) {
      const label = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
      options.push({
        value: label,
        label,
      })
    }
  }

  return options
}

function resolveNextValidPickupDate(now: Date): Date {
  return new Date(Math.ceil(now.getTime() / HALF_HOUR_IN_MS) * HALF_HOUR_IN_MS)
}

function resolveMonthIndex(monthOptions: PickupPickerOption[], targetDate: Date): number {
  const targetMonthValue = String(targetDate.getMonth() + 1)
  const matchedIndex = monthOptions.findIndex((item) => item.value === targetMonthValue)
  return matchedIndex >= 0 ? matchedIndex : 0
}

function resolveDayIndex(dayOptions: PickupDayOption[], targetDate: Date): number {
  const targetDayValue = `${targetDate.getFullYear()}-${String(targetDate.getMonth() + 1).padStart(2, '0')}-${String(
    targetDate.getDate(),
  ).padStart(2, '0')}`
  const matchedIndex = dayOptions.findIndex((item) => item.value === targetDayValue)
  return matchedIndex >= 0 ? matchedIndex : 0
}

function resolveTimeIndex(targetDate: Date): number {
  return targetDate.getHours() * 2 + Math.floor(targetDate.getMinutes() / 30)
}

export function buildPickupPickerState(now: Date, nextIndexes?: Partial<PickupPickerIndexes>): PickupPickerState {
  const year = now.getFullYear()
  const monthOptions = buildMonthOptions()
  const timeOptions = buildTimeOptions()
  const defaultDate = resolveNextValidPickupDate(now)
  const defaultMonthIndex = resolveMonthIndex(monthOptions, defaultDate)
  const selectedMonthIndex = clampIndex(nextIndexes?.monthIndex, monthOptions.length, defaultMonthIndex)
  const selectedMonth = Number(monthOptions[selectedMonthIndex]?.value ?? defaultDate.getMonth() + 1)
  const dayOptions = buildDayOptions(year, selectedMonth)
  const defaultDayIndex = resolveDayIndex(dayOptions, defaultDate)
  const selectedDayIndex = clampIndex(nextIndexes?.dayIndex, dayOptions.length, defaultDayIndex)
  const selectedDay = dayOptions[selectedDayIndex]
  const isDefaultDay = selectedDay?.value === dayOptions[defaultDayIndex]?.value
  const defaultTimeIndex = isDefaultDay ? resolveTimeIndex(defaultDate) : 0
  const selectedTimeIndex = clampIndex(nextIndexes?.timeIndex, timeOptions.length, defaultTimeIndex)

  return {
    monthOptions,
    dayOptions,
    timeOptions,
    indexes: {
      monthIndex: selectedMonthIndex,
      dayIndex: selectedDayIndex,
      timeIndex: selectedTimeIndex,
    },
  }
}

export function resolvePickupSlotFromIndexes(indexes: PickupPickerIndexes, now: Date): PickupSlot | null {
  const pickerState = buildPickupPickerState(now, indexes)
  const selectedDay = pickerState.dayOptions[pickerState.indexes.dayIndex]
  const selectedTime = pickerState.timeOptions[pickerState.indexes.timeIndex]

  if (selectedDay === undefined || selectedTime === undefined) {
    return null
  }

  const [yearText, monthText, dayText] = selectedDay.value.split('-')
  const [hourText, minuteText] = selectedTime.value.split(':')
  const pickupDate = new Date(
    Number(yearText),
    Number(monthText) - 1,
    Number(dayText),
    Number(hourText),
    Number(minuteText),
    0,
    0,
  )

  if (pickupDate.getTime() < now.getTime()) {
    return null
  }

  return {
    month: Number(monthText),
    day: Number(dayText),
    timeLabel: selectedTime.label,
    isoText: pickupDate.toISOString(),
  }
}

export function formatPickupSlot(slot: PickupSlot): string {
  return `${slot.month}月${slot.day}日 ${slot.timeLabel}`
}
