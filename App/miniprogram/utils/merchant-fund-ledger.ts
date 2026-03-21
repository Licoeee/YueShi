import type { MerchantInventoryRecord } from '../../types/merchant-inventory'
import type { OrderRecord } from '../../types/order'

export type MerchantFundRangeMode = 'day' | 'week' | 'month'

export interface MerchantFundLedgerPoint {
  key: string
  label: string
  income: number
  expense: number
}

export interface MerchantFundLedgerRecordItem {
  id: string
  type: 'income' | 'expense'
  amount: number
  title: string
  occurredAt: string
}

export interface MerchantFundLedgerResult {
  points: MerchantFundLedgerPoint[]
  totalIncome: number
  totalExpense: number
  netIncome: number
  records: MerchantFundLedgerRecordItem[]
}

interface MerchantFundBucket {
  key: string
  label: string
  income: number
  expense: number
}

function formatDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function toBucketDate(key: string): Date | null {
  const [yearText, monthText, dayText] = key.split('-')
  const year = Number(yearText)
  const month = Number(monthText)
  const day = Number(dayText)
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) {
    return null
  }

  const date = new Date(year, month - 1, day)
  if (Number.isNaN(date.getTime())) {
    return null
  }

  return date
}

function resolveWeekStart(date: Date): Date {
  const copy = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const weekday = copy.getDay()
  const mondayOffset = weekday === 0 ? -6 : 1 - weekday
  copy.setDate(copy.getDate() + mondayOffset)

  return copy
}

function buildDayBuckets(now: Date): MerchantFundBucket[] {
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    date.setDate(date.getDate() - (6 - index))
    const key = formatDateKey(date)

    return {
      key,
      label: `${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`,
      income: 0,
      expense: 0,
    }
  })
}

function buildWeekBuckets(now: Date): MerchantFundBucket[] {
  return Array.from({ length: 8 }, (_, index) => {
    const weekStart = resolveWeekStart(new Date(now.getFullYear(), now.getMonth(), now.getDate()))
    weekStart.setDate(weekStart.getDate() - (7 * (7 - index)))
    const key = formatDateKey(weekStart)

    return {
      key,
      label: `${String(weekStart.getMonth() + 1).padStart(2, '0')}/${String(weekStart.getDate()).padStart(2, '0')}`,
      income: 0,
      expense: 0,
    }
  })
}

function buildMonthBuckets(now: Date): MerchantFundBucket[] {
  return Array.from({ length: 6 }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - (5 - index), 1)
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`

    return {
      key,
      label: `${date.getMonth() + 1} 月`,
      income: 0,
      expense: 0,
    }
  })
}

function resolveOrderBucketKey(date: Date, mode: MerchantFundRangeMode): string {
  if (mode === 'month') {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
  }

  if (mode === 'week') {
    return formatDateKey(resolveWeekStart(date))
  }

  return formatDateKey(date)
}

function resolveInventoryBucketKey(date: Date, mode: MerchantFundRangeMode): string {
  return resolveOrderBucketKey(date, mode)
}

function parseIsoDate(isoText: string): Date | null {
  const date = new Date(isoText)
  if (Number.isNaN(date.getTime())) {
    return null
  }

  return date
}

function buildBuckets(mode: MerchantFundRangeMode, now: Date): MerchantFundBucket[] {
  if (mode === 'week') {
    return buildWeekBuckets(now)
  }

  if (mode === 'month') {
    return buildMonthBuckets(now)
  }

  return buildDayBuckets(now)
}

function buildIncomeRecords(orders: OrderRecord[]): MerchantFundLedgerRecordItem[] {
  return orders
    .filter((order) => order.status !== 'cancelled')
    .map((order) => ({
      id: order.id,
      type: 'income' as const,
      amount: order.totalAmount,
      title: `订单 ${order.id}`,
      occurredAt: order.createdAt,
    }))
}

function buildExpenseRecords(records: MerchantInventoryRecord[]): MerchantFundLedgerRecordItem[] {
  return records.map((record) => ({
    id: record.id,
    type: 'expense' as const,
    amount: record.costPrice,
    title: `入库 ${record.itemName}`,
    occurredAt: record.createdAt,
  }))
}

export function buildMerchantFundLedger(
  orders: OrderRecord[],
  inventoryRecords: MerchantInventoryRecord[],
  mode: MerchantFundRangeMode,
  now: Date = new Date(),
): MerchantFundLedgerResult {
  const buckets = buildBuckets(mode, now)
  const bucketMap = new Map<string, MerchantFundBucket>()
  buckets.forEach((bucket) => bucketMap.set(bucket.key, bucket))

  const incomeRecords = buildIncomeRecords(orders)
  const expenseRecords = buildExpenseRecords(inventoryRecords)

  incomeRecords.forEach((record) => {
    const date = parseIsoDate(record.occurredAt)
    if (date === null) {
      return
    }

    const key = resolveOrderBucketKey(date, mode)
    const targetBucket = bucketMap.get(key)
    if (targetBucket === undefined) {
      return
    }

    targetBucket.income += record.amount
  })

  expenseRecords.forEach((record) => {
    const date = parseIsoDate(record.occurredAt)
    if (date === null) {
      return
    }

    const key = resolveInventoryBucketKey(date, mode)
    const targetBucket = bucketMap.get(key)
    if (targetBucket === undefined) {
      return
    }

    targetBucket.expense += record.amount
  })

  const points = buckets.map((bucket) => ({
    key: bucket.key,
    label: bucket.label,
    income: bucket.income,
    expense: bucket.expense,
  }))

  const totalIncome = points.reduce((total, point) => total + point.income, 0)
  const totalExpense = points.reduce((total, point) => total + point.expense, 0)

  const records = [...incomeRecords, ...expenseRecords]
    .sort((left, right) => {
      const leftDate = parseIsoDate(left.occurredAt)
      const rightDate = parseIsoDate(right.occurredAt)
      const leftTime = leftDate?.getTime() ?? 0
      const rightTime = rightDate?.getTime() ?? 0
      return rightTime - leftTime
    })
    .slice(0, 10)

  return {
    points,
    totalIncome,
    totalExpense,
    netIncome: totalIncome - totalExpense,
    records,
  }
}

export function resolveFundChartPolyline(points: MerchantFundLedgerPoint[], key: 'income' | 'expense'): string {
  if (points.length === 0) {
    return ''
  }

  const maxValue = Math.max(
    1,
    ...points.map((point) => point.income),
    ...points.map((point) => point.expense),
  )

  const usableWidth = 740
  const usableHeight = 118
  const leftPadding = 16
  const topPadding = 8

  return points
    .map((point, index) => {
      const x = leftPadding + (usableWidth * index) / Math.max(1, points.length - 1)
      const value = key === 'income' ? point.income : point.expense
      const y = topPadding + usableHeight - (usableHeight * value) / maxValue
      return `${Math.round(x)},${Math.round(y)}`
    })
    .join(' ')
}

export function resolveFundRecordDateLabel(isoText: string): string {
  const date = parseIsoDate(isoText)
  if (date === null) {
    return '--'
  }

  const dayKey = toBucketDate(formatDateKey(date))
  if (dayKey === null) {
    return '--'
  }

  return `${String(dayKey.getMonth() + 1).padStart(2, '0')}-${String(dayKey.getDate()).padStart(2, '0')} ${String(
    date.getHours(),
  ).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}
