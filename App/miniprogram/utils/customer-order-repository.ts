import type { CheckoutDraftRecord, CheckoutItemRecord } from '../../types/checkout'
import type { OrderItem, OrderRecord } from '../../types/order'
import type { ProductSpecSize } from '../../types/product'
import { getCakeDetailById } from './customer-cake-catalog'
import { canCustomerCancelOrder } from './customer-order-detail-state'
import {
  canCustomerDeleteOrder,
  canCustomerRestoreDeletedOrder,
  clearOrderCustomerRecycleMeta,
  isOrderInCustomerRecycleBin,
  markOrderAsCustomerDeleted,
  purgeExpiredDeletedCustomerOrders,
} from './customer-order-recycle'
import {
  loadOrderSnapshot,
  saveOrderSnapshot,
  type OrderStorageLike,
} from './customer-order-storage'

export interface CustomerOrderRepository {
  createDraftOrder(input: CheckoutDraftRecord): Promise<OrderRecord>
  getOrderById(orderId: string): Promise<OrderRecord | null>
  updateOrderNote(orderId: string, note: string): Promise<OrderRecord>
  cancelOrder(orderId: string): Promise<OrderRecord>
  deleteOrder(orderId: string): Promise<OrderRecord>
  restoreDeletedOrder(orderId: string): Promise<OrderRecord>
}

function resolvePrimarySize(item: CheckoutItemRecord): ProductSpecSize {
  try {
    const cake = getCakeDetailById(item.productId)
    const sizePlan = cake.sizePlans.find((plan) => plan.id === item.sizePlanId)
    return sizePlan?.sizes[0] ?? '6-inch'
  } catch {
    return '6-inch'
  }
}

function toOrderItem(item: CheckoutItemRecord): OrderItem {
  return {
    productId: item.productId,
    productName: item.productName,
    specId: item.sizePlanId,
    specLabel: item.specLabel,
    layerId: item.layerId,
    sizePlanId: item.sizePlanId,
    creamId: item.creamId,
    creamLabel: item.creamLabel,
    size: resolvePrimarySize(item),
    quantity: item.quantity,
    unitPrice: item.unitPrice,
    coverImage: item.coverImage,
  }
}

function resolveCurrentCustomerOpenId(): string {
  const maybeGetApp = (globalThis as { getApp?: () => IAppOption }).getApp
  if (typeof maybeGetApp !== 'function') {
    return 'local-customer'
  }

  try {
    const app = maybeGetApp()
    return app.globalData.userIdentity?.openId ?? app.globalData.openId ?? 'local-customer'
  } catch {
    return 'local-customer'
  }
}

function buildOrderId(timestamp: number): string {
  return `order-${timestamp}`
}

function findOrderIndex(orders: OrderRecord[], orderId: string): number {
  return orders.findIndex((order) => order.id === orderId)
}

function getRequiredOrder(orders: OrderRecord[], orderId: string): {
  order: OrderRecord
  index: number
} {
  const orderIndex = findOrderIndex(orders, orderId)
  if (orderIndex < 0) {
    throw new Error(`Order "${orderId}" does not exist`)
  }

  return {
    order: orders[orderIndex],
    index: orderIndex,
  }
}

function replaceOrderAtIndex(orders: OrderRecord[], orderIndex: number, nextOrder: OrderRecord): OrderRecord[] {
  return orders.map((order, index) => (index === orderIndex ? nextOrder : order))
}

function loadOrdersWithCleanup(storage: OrderStorageLike): {
  orders: OrderRecord[]
  cleaned: boolean
} {
  const orders = loadOrderSnapshot(storage)
  const retainedOrders = purgeExpiredDeletedCustomerOrders(orders)

  return {
    orders: retainedOrders,
    cleaned: retainedOrders.length !== orders.length,
  }
}

export { canCustomerCancelOrder, canCustomerDeleteOrder }

export function createLocalCustomerOrderRepository(storage: OrderStorageLike): CustomerOrderRepository {
  return {
    async createDraftOrder(input: CheckoutDraftRecord): Promise<OrderRecord> {
      const timestamp = Date.now()
      const nowText = new Date(timestamp).toISOString()
      const nextOrder: OrderRecord = {
        id: buildOrderId(timestamp),
        customerOpenId: resolveCurrentCustomerOpenId(),
        merchantOpenId: 'local-merchant',
        status: 'pending-payment',
        items: input.items.map(toOrderItem),
        contact: {
          phone: input.contact.phone,
          phoneTail: input.contact.phone.slice(-4),
        },
        pickupSlot: input.pickupSlot,
        note: '',
        hasNote: false,
        totalAmount: input.totalAmount,
        createdAt: nowText,
        updatedAt: nowText,
      }

      const { orders: previousOrders } = loadOrdersWithCleanup(storage)
      saveOrderSnapshot(storage, [nextOrder, ...previousOrders])

      return nextOrder
    },

    async getOrderById(orderId: string): Promise<OrderRecord | null> {
      const { orders, cleaned } = loadOrdersWithCleanup(storage)
      if (cleaned) {
        saveOrderSnapshot(storage, orders)
      }

      return orders.find((order) => order.id === orderId) ?? null
    },

    async updateOrderNote(orderId: string, note: string): Promise<OrderRecord> {
      const { orders } = loadOrdersWithCleanup(storage)
      const { order, index } = getRequiredOrder(orders, orderId)
      if (isOrderInCustomerRecycleBin(order)) {
        throw new Error(`Order "${orderId}" has been deleted by customer`)
      }

      const nextNote = note.trim()
      const nextOrder: OrderRecord = {
        ...order,
        note: nextNote,
        hasNote: nextNote.length > 0,
        updatedAt: new Date().toISOString(),
      }

      saveOrderSnapshot(storage, replaceOrderAtIndex(orders, index, nextOrder))
      return nextOrder
    },

    async cancelOrder(orderId: string): Promise<OrderRecord> {
      const { orders } = loadOrdersWithCleanup(storage)
      const { order, index } = getRequiredOrder(orders, orderId)
      if (isOrderInCustomerRecycleBin(order)) {
        throw new Error(`Order "${orderId}" has been deleted by customer`)
      }

      if (!canCustomerCancelOrder(order.status)) {
        throw new Error(`Order "${orderId}" cannot be cancelled by customer`)
      }

      const nextOrder: OrderRecord = {
        ...order,
        status: 'cancelled',
        updatedAt: new Date().toISOString(),
      }

      saveOrderSnapshot(storage, replaceOrderAtIndex(orders, index, nextOrder))
      return nextOrder
    },

    async deleteOrder(orderId: string): Promise<OrderRecord> {
      const { orders } = loadOrdersWithCleanup(storage)
      const { order, index } = getRequiredOrder(orders, orderId)
      if (isOrderInCustomerRecycleBin(order)) {
        throw new Error(`Order "${orderId}" has already been deleted`)
      }

      if (!canCustomerDeleteOrder(order.status)) {
        throw new Error(`Order "${orderId}" cannot be deleted by customer`)
      }

      const nextOrder = markOrderAsCustomerDeleted(order)
      saveOrderSnapshot(storage, replaceOrderAtIndex(orders, index, nextOrder))
      return nextOrder
    },

    async restoreDeletedOrder(orderId: string): Promise<OrderRecord> {
      const { orders } = loadOrdersWithCleanup(storage)
      const { order, index } = getRequiredOrder(orders, orderId)
      if (!isOrderInCustomerRecycleBin(order)) {
        throw new Error(`Order "${orderId}" is not in customer recycle bin`)
      }

      if (!canCustomerRestoreDeletedOrder(order)) {
        throw new Error(`Order "${orderId}" has exceeded the restore window`)
      }

      const nextOrder = clearOrderCustomerRecycleMeta(order)
      saveOrderSnapshot(storage, replaceOrderAtIndex(orders, index, nextOrder))
      return nextOrder
    },
  }
}
