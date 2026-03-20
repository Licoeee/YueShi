import type { OrderRecord } from '../../../../types/order'
import { runCustomerAuthorizedAction } from '../../../utils/customer-action-gate'
import { createLocalCustomerOrderNotifier } from '../../../utils/customer-order-notifier'
import { canCustomerCancelOrder } from '../../../utils/customer-order-detail-state'
import { isOrderInCustomerRecycleBin } from '../../../utils/customer-order-recycle'
import { canCustomerDeleteOrder, createLocalCustomerOrderRepository } from '../../../utils/customer-order-repository'
import { formatPickupSlot } from '../../../utils/customer-pickup-slot'

interface OrderDetailPageData {
  order: OrderRecord | null
  statusLabel: string
  statusTheme: 'default' | 'primary' | 'warning' | 'danger'
  pickupSummary: string
  noteDraft: string
  isEditingNote: boolean
  cancelDialogVisible: boolean
  deleteDialogVisible: boolean
}

function resolveOrderId(query: Record<string, string | undefined>): string {
  return typeof query.orderId === 'string' ? query.orderId : ''
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

function resolveOrderStatusTheme(status: OrderRecord['status']): 'default' | 'primary' | 'warning' | 'danger' {
  if (status === 'cancelled') {
    return 'danger'
  }

  if (status === 'completed') {
    return 'default'
  }

  if (status === 'pending-payment' || status === 'paid') {
    return 'warning'
  }

  return 'primary'
}

Page<
  OrderDetailPageData,
  {
    onLoad(query: Record<string, string | undefined>): Promise<void>
    syncOrder(orderId: string): Promise<void>
    handleEditNote(): void
    handleNoteInput(event: WechatMiniprogram.CustomEvent<{ value?: string }>): void
    handleSaveNote(): Promise<void>
    handleCancelEdit(): void
    handleOpenCancelDialog(): void
    handleCloseCancelDialog(): void
    handleConfirmCancel(): Promise<void>
    handleOpenDeleteDialog(): void
    handleCloseDeleteDialog(): void
    handleConfirmDelete(): Promise<void>
  }
>({
  data: {
    order: null,
    statusLabel: '',
    statusTheme: 'default',
    pickupSummary: '',
    noteDraft: '',
    isEditingNote: false,
    cancelDialogVisible: false,
    deleteDialogVisible: false,
  },

  async onLoad(query) {
    const orderId = resolveOrderId(query)
    if (orderId.length === 0) {
      wx.showToast({ title: '订单不存在', icon: 'none' })
      wx.redirectTo({ url: '/pages/customer/orders/orders' })
      return
    }

    await this.syncOrder(orderId)
  },

  async syncOrder(orderId) {
    const repository = createLocalCustomerOrderRepository(wx)
    const order = await repository.getOrderById(orderId)
    if (order === null) {
      wx.showToast({ title: '订单不存在', icon: 'none' })
      wx.redirectTo({ url: '/pages/customer/orders/orders' })
      return
    }

    if (isOrderInCustomerRecycleBin(order)) {
      wx.showToast({
        title: '订单已删除，请在删除订单查询中恢复',
        icon: 'none',
      })
      wx.redirectTo({ url: '/pages/customer/order-recycle/order-recycle' })
      return
    }

    wx.setNavigationBarTitle({ title: `订单 ${order.id}` })
    this.setData({
      order,
      statusLabel: formatOrderStatus(order.status),
      statusTheme: resolveOrderStatusTheme(order.status),
      pickupSummary: formatPickupSlot(order.pickupSlot),
      noteDraft: order.note,
      isEditingNote: false,
      cancelDialogVisible: false,
      deleteDialogVisible: false,
    })
  },

  handleEditNote() {
    const order = this.data.order
    if (order === null) {
      return
    }

    this.setData({
      noteDraft: order.note,
      isEditingNote: true,
    })
  },

  handleNoteInput(event) {
    this.setData({
      noteDraft: typeof event.detail.value === 'string' ? event.detail.value : '',
    })
  },

  async handleSaveNote() {
    const order = this.data.order
    if (order === null) {
      return
    }

    const repository = createLocalCustomerOrderRepository(wx)
    const notifier = createLocalCustomerOrderNotifier()
    const updatedOrder = await repository.updateOrderNote(order.id, this.data.noteDraft)
    await notifier.notifyOrderNoteChanged({
      orderId: updatedOrder.id,
      note: updatedOrder.note,
    })

    wx.showToast({
      title: '备注已更新',
      icon: 'success',
    })

    await this.syncOrder(updatedOrder.id)
  },

  handleCancelEdit() {
    const order = this.data.order
    this.setData({
      noteDraft: order?.note ?? '',
      isEditingNote: false,
    })
  },

  handleOpenCancelDialog() {
    const order = this.data.order
    if (order === null || !canCustomerCancelOrder(order.status)) {
      return
    }

    this.setData({
      cancelDialogVisible: true,
    })
  },

  handleCloseCancelDialog() {
    this.setData({
      cancelDialogVisible: false,
    })
  },

  async handleConfirmCancel() {
    const order = this.data.order
    if (order === null) {
      return
    }

    const repository = createLocalCustomerOrderRepository(wx)
    const updatedOrder = await repository.cancelOrder(order.id)

    wx.showToast({
      title: '订单已取消',
      icon: 'success',
    })

    await this.syncOrder(updatedOrder.id)
  },

  handleOpenDeleteDialog() {
    const order = this.data.order
    if (order === null || !canCustomerDeleteOrder(order.status)) {
      return
    }

    this.setData({
      deleteDialogVisible: true,
    })
  },

  handleCloseDeleteDialog() {
    this.setData({
      deleteDialogVisible: false,
    })
  },

  async handleConfirmDelete() {
    const order = this.data.order
    if (order === null) {
      return
    }

    const allowed = await runCustomerAuthorizedAction(async () => {
      const repository = createLocalCustomerOrderRepository(wx)
      await repository.deleteOrder(order.id)

      wx.showToast({
        title: '订单已删除',
        icon: 'success',
      })

      wx.redirectTo({
        url: '/pages/customer/orders/orders',
      })
    })

    if (!allowed) {
      wx.showToast({
        title: '请先完成微信登录',
        icon: 'none',
      })
    }
  },
})
