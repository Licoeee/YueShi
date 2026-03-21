import type { MerchantOrderRecycleSource, OrderRecord } from '../../../../types/order'
import { splitCustomerOrdersByRecycleState } from '../../../utils/customer-order-recycle'
import { resolveCakeImageUrl } from '../../../utils/customer-image-fallback'
import { loadStoredCustomerOrders, saveStoredCustomerOrders } from '../../../utils/customer-order-storage'
import { formatPickupSlot } from '../../../utils/customer-pickup-slot'
import {
  clearMerchantRecycleOrders,
  loadMerchantOrderAutoCleanupDays,
  purgeExpiredCompletedMerchantOrders,
  restoreMerchantRecycledOrder,
  splitMerchantOrdersByRecycleState,
} from '../../../utils/merchant-order-management'

type MerchantRecycleDialogAction = 'clear-all' | 'delete-single' | ''

interface MerchantRecycleOrderDisplayRecord extends OrderRecord {
  sourceLabel: string
  deletedAtLabel: string
  pickupSummary: string
  itemSummary: string
  itemQuantitySummary: string
  coverImageUrl: string
  deletedAtMs: number
}

interface MerchantOrderRecyclePageData {
  recycleOrders: MerchantRecycleOrderDisplayRecord[]
  confirmDialogVisible: boolean
  confirmDialogTitle: string
  confirmDialogContent: string
  confirmDialogConfirmText: string
  pendingAction: MerchantRecycleDialogAction
  pendingOrderId: string
}

interface PopupVisibleChangeDetail {
  visible?: unknown
}

interface MerchantOrderVisibilityState {
  recycleOrders: OrderRecord[]
}

function formatDateTime(isoText: string): string {
  const date = new Date(isoText)
  if (Number.isNaN(date.getTime())) {
    return '未知时间'
  }

  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

function resolveRecycleSourceLabel(source: MerchantOrderRecycleSource): string {
  switch (source) {
    case 'manual':
      return '手动删除'
    case 'auto-cleanup':
      return '定时清理'
    case 'instant-clear':
      return '立即清空'
    default:
      return '订单回收站'
  }
}

function mergeOrdersById(baseOrders: OrderRecord[], patchedOrders: OrderRecord[]): OrderRecord[] {
  const patchedOrderMap = new Map(patchedOrders.map((order) => [order.id, order]))
  return baseOrders.map((order) => patchedOrderMap.get(order.id) ?? order)
}

function loadMerchantOrderVisibilityState(now: Date): MerchantOrderVisibilityState {
  const storedOrders = loadStoredCustomerOrders()
  const customerVisibility = splitCustomerOrdersByRecycleState(storedOrders, now.getTime())
  const cleanedActiveOrders = purgeExpiredCompletedMerchantOrders(
    customerVisibility.activeOrders,
    loadMerchantOrderAutoCleanupDays(),
    now,
  )
  const nextOrders = mergeOrdersById(customerVisibility.retainedOrders, cleanedActiveOrders)
  const hasOrderPatched = nextOrders.some((order, index) => order !== customerVisibility.retainedOrders[index])

  if (customerVisibility.retainedOrders.length !== storedOrders.length || hasOrderPatched) {
    saveStoredCustomerOrders(nextOrders)
  }

  const merchantVisibility = splitMerchantOrdersByRecycleState(cleanedActiveOrders)
  return {
    recycleOrders: merchantVisibility.recycleOrders,
  }
}

function mapRecycleOrderToDisplay(order: OrderRecord): MerchantRecycleOrderDisplayRecord {
  const deletedAt = order.merchantRecycleMeta?.deletedAt ?? order.updatedAt
  return {
    ...order,
    sourceLabel: resolveRecycleSourceLabel(order.merchantRecycleMeta?.source ?? 'manual'),
    deletedAtLabel: formatDateTime(deletedAt),
    pickupSummary: formatPickupSlot(order.pickupSlot),
    itemSummary: order.items.map((item) => item.productName).join('、'),
    itemQuantitySummary: `共 ${order.items.reduce((total, item) => total + item.quantity, 0)} 件商品`,
    coverImageUrl: resolveCakeImageUrl(order.items[0]?.coverImage),
    deletedAtMs: Date.parse(deletedAt),
  }
}

Page<
  MerchantOrderRecyclePageData,
  {
    onShow(): void
    syncRecycleOrders(): void
    handleRestoreOrder(event: WechatMiniprogram.BaseEvent): void
    handleDeleteOrderPermanently(event: WechatMiniprogram.BaseEvent): void
    handleClearRecycle(): void
    handleConfirmDialogVisibleChange(event: WechatMiniprogram.CustomEvent<PopupVisibleChangeDetail>): void
    handleCloseConfirmDialog(): void
    handleConfirmDialog(): void
  }
>({
  data: {
    recycleOrders: [],
    confirmDialogVisible: false,
    confirmDialogTitle: '',
    confirmDialogContent: '',
    confirmDialogConfirmText: '确认',
    pendingAction: '',
    pendingOrderId: '',
  },

  onShow() {
    this.syncRecycleOrders()
  },

  syncRecycleOrders() {
    const merchantVisibility = loadMerchantOrderVisibilityState(new Date())
    const recycleOrders = merchantVisibility.recycleOrders
      .map(mapRecycleOrderToDisplay)
      .sort((left, right) => {
        const leftMs = Number.isFinite(left.deletedAtMs) ? left.deletedAtMs : 0
        const rightMs = Number.isFinite(right.deletedAtMs) ? right.deletedAtMs : 0
        return rightMs - leftMs
      })

    this.setData({
      recycleOrders,
    })
  },

  handleRestoreOrder(event) {
    const orderId = (event.currentTarget.dataset as { orderId?: unknown }).orderId
    if (typeof orderId !== 'string' || orderId.length === 0) {
      return
    }

    restoreMerchantRecycledOrder(wx, orderId)
    wx.showToast({
      title: '订单已恢复',
      icon: 'success',
    })
    this.syncRecycleOrders()
  },

  handleDeleteOrderPermanently(event) {
    const orderId = (event.currentTarget.dataset as { orderId?: unknown }).orderId
    if (typeof orderId !== 'string' || orderId.length === 0) {
      return
    }

    this.setData({
      confirmDialogVisible: true,
      confirmDialogTitle: '彻底删除',
      confirmDialogContent: '确认彻底删除这条订单吗？删除后无法恢复。',
      confirmDialogConfirmText: '彻底删除',
      pendingAction: 'delete-single',
      pendingOrderId: orderId,
    })
  },

  handleClearRecycle() {
    if (this.data.recycleOrders.length === 0) {
      wx.showToast({
        title: '回收站已空',
        icon: 'none',
      })
      return
    }

    this.setData({
      confirmDialogVisible: true,
      confirmDialogTitle: '清空回收站',
      confirmDialogContent: '确认清空回收站中的全部订单吗？该操作不可恢复。',
      confirmDialogConfirmText: '清空回收站',
      pendingAction: 'clear-all',
      pendingOrderId: '',
    })
  },

  handleConfirmDialogVisibleChange(event) {
    const detail = event.detail
    const visible =
      typeof detail === 'boolean'
        ? detail
        : typeof detail === 'object' && detail !== null && 'visible' in detail
          ? detail.visible === true
          : false

    if (!visible) {
      this.handleCloseConfirmDialog()
    }
  },

  handleCloseConfirmDialog() {
    this.setData({
      confirmDialogVisible: false,
      confirmDialogTitle: '',
      confirmDialogContent: '',
      confirmDialogConfirmText: '确认',
      pendingAction: '',
      pendingOrderId: '',
    })
  },

  handleConfirmDialog() {
    if (this.data.pendingAction === 'clear-all') {
      const removedOrders = clearMerchantRecycleOrders(wx)
      this.handleCloseConfirmDialog()
      this.syncRecycleOrders()
      wx.showToast({
        title: removedOrders.length === 0 ? '回收站已空' : `已清空 ${removedOrders.length} 条订单`,
        icon: removedOrders.length === 0 ? 'none' : 'success',
      })
      return
    }

    if (this.data.pendingAction === 'delete-single' && this.data.pendingOrderId.length > 0) {
      clearMerchantRecycleOrders(wx, [this.data.pendingOrderId])
      this.handleCloseConfirmDialog()
      this.syncRecycleOrders()
      wx.showToast({
        title: '订单已彻底删除',
        icon: 'success',
      })
      return
    }

    this.handleCloseConfirmDialog()
  },
})
