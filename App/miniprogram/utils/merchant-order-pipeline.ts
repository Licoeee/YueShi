import type { OrderRecord } from '../../types/order'

export interface MerchantOrderPipelineRecord extends OrderRecord {
  pickupTimestamp: number
  pickupDateKey: string
}

function padNumber(value: number): string {
  return String(value).padStart(2, '0')
}

function formatDateKey(date: Date): string {
  return `${date.getFullYear()}-${padNumber(date.getMonth() + 1)}-${padNumber(date.getDate())}`
}

function resolvePickupDate(order: OrderRecord): Date | null {
  const pickupDate = new Date(order.pickupSlot.isoText)
  if (Number.isNaN(pickupDate.getTime())) {
    return null
  }

  return pickupDate
}

function resolvePickupTimestamp(order: OrderRecord): number {
  const pickupDate = resolvePickupDate(order)
  if (pickupDate === null) {
    return Number.MAX_SAFE_INTEGER
  }

  return pickupDate.getTime()
}

function resolvePickupDateKey(order: OrderRecord): string {
  const pickupDate = resolvePickupDate(order)
  if (pickupDate === null) {
    return ''
  }

  return formatDateKey(pickupDate)
}

function isValidDateKey(dateKey: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(dateKey)
}

export function buildMerchantOrderPipeline(orders: OrderRecord[]): MerchantOrderPipelineRecord[] {
  const pipelineOrders = orders.map((order) => ({
    ...order,
    pickupTimestamp: resolvePickupTimestamp(order),
    pickupDateKey: resolvePickupDateKey(order),
  }))

  pipelineOrders.sort((leftOrder, rightOrder) => leftOrder.pickupTimestamp - rightOrder.pickupTimestamp)

  return pipelineOrders
}

export function filterMerchantOrdersByDate<T extends MerchantOrderPipelineRecord>(
  orders: T[],
  selectedDateKey: string,
): T[] {
  if (!isValidDateKey(selectedDateKey)) {
    return orders
  }

  return orders.filter((order) => order.pickupDateKey === selectedDateKey)
}

export function toMerchantCalendarDateKey(rawValue: unknown): string {
  if (Array.isArray(rawValue) && rawValue.length > 0) {
    return toMerchantCalendarDateKey(rawValue[0])
  }

  if (rawValue instanceof Date && !Number.isNaN(rawValue.getTime())) {
    return formatDateKey(rawValue)
  }

  if (typeof rawValue === 'number' && Number.isFinite(rawValue)) {
    return formatDateKey(new Date(rawValue))
  }

  if (typeof rawValue === 'string' && isValidDateKey(rawValue)) {
    return rawValue
  }

  if (typeof rawValue === 'object' && rawValue !== null) {
    const maybeDate = (rawValue as { value?: unknown }).value
    return toMerchantCalendarDateKey(maybeDate)
  }

  return ''
}
