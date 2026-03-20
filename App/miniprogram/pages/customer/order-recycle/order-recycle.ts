import type { OrderRecord } from '../../../../types/order'
import {
  getCustomerOrderRecycleDeadlineMs,
  getCustomerOrderRecycleDeletedAtMs,
  getCustomerOrderRecycleRemainingMs,
  splitCustomerOrdersByRecycleState,
} from '../../../utils/customer-order-recycle'
import { runCustomerAuthorizedAction } from '../../../utils/customer-action-gate'
import { createLocalCustomerOrderRepository } from '../../../utils/customer-order-repository'
import { resolveCakeImageUrl } from '../../../utils/customer-image-fallback'
import { formatPickupSlot } from '../../../utils/customer-pickup-slot'
import { loadStoredCustomerOrders, saveStoredCustomerOrders } from '../../../utils/customer-order-storage'

interface DeletedOrderDisplayRecord extends OrderRecord {
  statusLabel: string
  deletedAtLabel: string
  recoverDeadlineLabel: string
  recoverRemainingLabel: string
  canRestore: boolean
  pickupSummary: string
  itemSummary: string
  itemQuantitySummary: string
  coverImageUrl: string
  deletedAtMs: number
}

interface CustomerOrderRecyclePageData {
  deletedOrders: DeletedOrderDisplayRecord[]
}

function formatOrderStatus(status: OrderRecord['status']): string {
  const statusMap: Record<OrderRecord['status'], string> = {
    'pending-payment': '待确认',
    paid: '待确认',
    'in-production': '待制作',
    'ready-for-pickup': '待取货',
    completed: '已完成',
    cancelled: '已取消',
  }

  return statusMap[status]
}

function formatLocalDateTime(ms: number): string {
  const date = new Date(ms)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hour = String(date.getHours()).padStart(2, '0')
  const minute = String(date.getMinutes()).padStart(2, '0')
  return `${year}-${month}-${day} ${hour}:${minute}`
}

function formatRecoverRemaining(remainingMs: number): string {
  if (remainingMs <= 0) {
    return '恢复期已结束'
  }

  const remainingHours = Math.ceil(remainingMs / (60 * 60 * 1000))
  if (remainingHours <= 24) {
    return `剩余 ${remainingHours} 小时`
  }

  const remainingDays = Math.ceil(remainingHours / 24)
  return `剩余 ${remainingDays} 天`
}

function mapDeletedOrderToDisplay(order: OrderRecord): DeletedOrderDisplayRecord {
  const deletedAtMs = getCustomerOrderRecycleDeletedAtMs(order) ?? Date.now()
  const recoverDeadlineMs = getCustomerOrderRecycleDeadlineMs(order) ?? deletedAtMs
  const remainingMs = getCustomerOrderRecycleRemainingMs(order)
  const canRestore = remainingMs > 0
  const firstItem = order.items[0]

  return {
    ...order,
    statusLabel: formatOrderStatus(order.status),
    deletedAtLabel: formatLocalDateTime(deletedAtMs),
    recoverDeadlineLabel: formatLocalDateTime(recoverDeadlineMs),
    recoverRemainingLabel: formatRecoverRemaining(remainingMs),
    canRestore,
    pickupSummary: formatPickupSlot(order.pickupSlot),
    itemSummary: order.items.map((item) => item.productName).join('、'),
    itemQuantitySummary: `共 ${order.items.reduce((total, item) => total + item.quantity, 0)} 件蛋糕`,
    coverImageUrl: firstItem === undefined ? '' : resolveCakeImageUrl(firstItem.coverImage),
    deletedAtMs,
  }
}

Page<
  CustomerOrderRecyclePageData,
  {
    onShow(): void
    syncDeletedOrders(): void
    handleRestoreTap(event: WechatMiniprogram.BaseEvent): Promise<void>
  }
>({
  data: {
    deletedOrders: [],
  },

  onShow() {
    this.syncDeletedOrders()
  },

  syncDeletedOrders() {
    const storedOrders = loadStoredCustomerOrders()
    const { retainedOrders, recycleOrders } = splitCustomerOrdersByRecycleState(storedOrders)
    if (retainedOrders.length !== storedOrders.length) {
      saveStoredCustomerOrders(retainedOrders)
    }

    const deletedOrders = recycleOrders
      .map(mapDeletedOrderToDisplay)
      .sort((left, right) => right.deletedAtMs - left.deletedAtMs)
    this.setData({
      deletedOrders,
    })
  },

  async handleRestoreTap(event) {
    const dataset = event.currentTarget.dataset as { orderId?: unknown; canRestore?: unknown }
    const orderId = dataset.orderId
    const canRestore = dataset.canRestore === true
    if (typeof orderId !== 'string' || orderId.length === 0) {
      return
    }

    if (!canRestore) {
      wx.showToast({
        title: '恢复期已结束',
        icon: 'none',
      })
      return
    }

    const allowed = await runCustomerAuthorizedAction(async () => {
      try {
        const repository = createLocalCustomerOrderRepository(wx)
        await repository.restoreDeletedOrder(orderId)
        wx.showToast({
          title: '订单已恢复',
          icon: 'success',
        })
      } catch {
        wx.showToast({
          title: '订单恢复失败',
          icon: 'none',
        })
      }

      this.syncDeletedOrders()
    })

    if (!allowed) {
      wx.showToast({
        title: '请先完成微信登录',
        icon: 'none',
      })
    }
  },
})
