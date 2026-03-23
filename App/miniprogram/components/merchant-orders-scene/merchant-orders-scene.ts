import type { OrderRecord, OrderStatus } from '../../../types/order'
import { splitCustomerOrdersByRecycleState } from '../../utils/customer-order-recycle'
import { resolveCakeImageUrl } from '../../utils/customer-image-fallback'
import {
  loadStoredCustomerOrders,
  saveStoredCustomerOrders,
} from '../../utils/customer-order-storage'
import { formatPickupSlot } from '../../utils/customer-pickup-slot'
import {
  deleteCompletedMerchantOrder,
  loadMerchantOrderAutoCleanupDays,
  moveCompletedOrdersToMerchantRecycle,
  purgeExpiredCompletedMerchantOrders,
  saveMerchantOrderAutoCleanupDays,
  splitMerchantOrdersByRecycleState,
  type MerchantOrderAutoCleanupDays,
  updateMerchantOrderStatus,
} from '../../utils/merchant-order-management'
import {
  buildMerchantOrderPipeline,
  filterMerchantOrdersByDate,
  toMerchantCalendarDateKey,
  type MerchantOrderPipelineRecord,
} from '../../utils/merchant-order-pipeline'

type MerchantOrderStatusTabKey = 'pending-confirmation' | 'in-production' | 'ready-for-pickup' | 'completed'
type MerchantOrderActionType = 'advance' | 'delete' | 'none'
type MerchantOrderPendingActionKind = 'advance' | 'delete' | ''

interface MerchantOrderTabOption {
  label: string
  value: MerchantOrderStatusTabKey
}

interface CleanupOption {
  label: string
  value: MerchantOrderAutoCleanupDays
}

interface MerchantOrderDisplayRecord extends MerchantOrderPipelineRecord {
  statusLabel: string
  statusTheme: 'default' | 'primary' | 'warning' | 'danger'
  coverImageUrl: string
  pickupSummary: string
  createdSummary: string
  itemSummary: string
  itemQuantitySummary: string
  phoneSummary: string
  actionType: MerchantOrderActionType
  nextStatus: OrderStatus | ''
}

interface MerchantOrdersSceneData {
  orders: MerchantOrderDisplayRecord[]
  visibleOrders: MerchantOrderDisplayRecord[]
  recycleOrderCount: number
  selectedDateKey: string
  selectedDateLabel: string
  calendarVisible: boolean
  notedOrderCount: number
  activeStatusTab: MerchantOrderStatusTabKey
  orderTabs: MerchantOrderTabOption[]
  orderSearchKeyword: string
  emptyDescription: string
  cleanupPopupVisible: boolean
  autoCleanupDays: MerchantOrderAutoCleanupDays
  cleanupOptions: CleanupOption[]
  selectionCircleIcons: string[]
  confirmDialogVisible: boolean
  confirmDialogTitle: string
  confirmDialogDescription: string
  confirmDialogConfirmText: string
  confirmDialogTone: 'primary' | 'danger'
  pendingActionKind: MerchantOrderPendingActionKind
  pendingActionOrderId: string
  pendingActionNextStatus: OrderStatus | ''
}

interface CalendarConfirmDetail {
  value?: unknown
}

interface PopupVisibleChangeDetail {
  visible?: unknown
}

interface InputDetail {
  value?: unknown
}

const DEFAULT_STATUS_TAB: MerchantOrderStatusTabKey = 'pending-confirmation'
const ORDER_TABS: MerchantOrderTabOption[] = [
  { label: '待确认', value: 'pending-confirmation' },
  { label: '待制作', value: 'in-production' },
  { label: '待取货', value: 'ready-for-pickup' },
  { label: '已完成', value: 'completed' },
]
const AUTO_CLEANUP_OPTIONS: CleanupOption[] = [
  { label: '关闭定时清理', value: 0 },
  { label: '3 天后自动移入回收站', value: 3 },
  { label: '7 天后自动移入回收站', value: 7 },
  { label: '15 天后自动移入回收站', value: 15 },
  { label: '30 天后自动移入回收站', value: 30 },
]
const SELECTION_CIRCLE_ICONS = [
  '/assets/icons/common/selection-circle-checked.svg',
  '/assets/icons/common/selection-circle-unchecked.svg',
]

function parseInputValue(detail: unknown): string {
  if (typeof detail === 'string') {
    return detail
  }

  if (typeof detail === 'object' && detail !== null && 'value' in detail) {
    const value = (detail as InputDetail).value
    return typeof value === 'string' ? value : ''
  }

  return ''
}

function parsePopupVisible(detail: unknown): boolean {
  if (typeof detail === 'boolean') {
    return detail
  }

  if (typeof detail !== 'object' || detail === null || !('visible' in detail)) {
    return false
  }

  return (detail as PopupVisibleChangeDetail).visible === true
}

function normalizeCleanupDays(rawValue: unknown): MerchantOrderAutoCleanupDays {
  if (rawValue === 0 || rawValue === 3 || rawValue === 7 || rawValue === 15 || rawValue === 30) {
    return rawValue
  }

  if (typeof rawValue === 'string' && rawValue.length > 0) {
    const parsed = Number(rawValue)
    if (parsed === 0 || parsed === 3 || parsed === 7 || parsed === 15 || parsed === 30) {
      return parsed
    }
  }

  return 0
}

function resolveStatusLabel(status: OrderStatus): string {
  const statusLabelMap: Record<OrderStatus, string> = {
    'pending-payment': '待确认',
    paid: '待确认',
    'in-production': '待制作',
    'ready-for-pickup': '待取货',
    completed: '已完成',
    cancelled: '已取消',
  }

  return statusLabelMap[status]
}

function resolveStatusTheme(status: OrderStatus): 'default' | 'primary' | 'warning' | 'danger' {
  if (status === 'cancelled') {
    return 'danger'
  }

  if (status === 'pending-payment' || status === 'paid') {
    return 'warning'
  }

  if (status === 'completed') {
    return 'default'
  }

  return 'primary'
}

function resolveOrderTabKey(status: OrderStatus): MerchantOrderStatusTabKey | null {
  switch (status) {
    case 'pending-payment':
    case 'paid':
      return 'pending-confirmation'
    case 'in-production':
      return 'in-production'
    case 'ready-for-pickup':
      return 'ready-for-pickup'
    case 'completed':
      return 'completed'
    case 'cancelled':
    default:
      return null
  }
}

function formatDateTime(isoText: string): string {
  const date = new Date(isoText)
  if (Number.isNaN(date.getTime())) {
    return '未知时间'
  }

  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

function resolveOrderCoverImage(order: MerchantOrderPipelineRecord): string {
  return resolveCakeImageUrl(order.items[0]?.coverImage)
}

function resolveItemQuantitySummary(order: MerchantOrderPipelineRecord): string {
  const totalQuantity = order.items.reduce((count, item) => count + item.quantity, 0)
  return `${order.items.length} 款商品 · 共 ${totalQuantity} 件`
}

function resolveOrderAction(status: OrderStatus): Pick<MerchantOrderDisplayRecord, 'actionType' | 'nextStatus'> {
  switch (status) {
    case 'pending-payment':
    case 'paid':
      return {
        actionType: 'advance',
        nextStatus: 'in-production',
      }
    case 'in-production':
      return {
        actionType: 'advance',
        nextStatus: 'ready-for-pickup',
      }
    case 'ready-for-pickup':
      return {
        actionType: 'advance',
        nextStatus: 'completed',
      }
    case 'completed':
      return {
        actionType: 'delete',
        nextStatus: '',
      }
    case 'cancelled':
    default:
      return {
        actionType: 'none',
        nextStatus: '',
      }
  }
}

function mapOrderToDisplay(order: MerchantOrderPipelineRecord): MerchantOrderDisplayRecord {
  return {
    ...order,
    statusLabel: resolveStatusLabel(order.status),
    statusTheme: resolveStatusTheme(order.status),
    coverImageUrl: resolveOrderCoverImage(order),
    pickupSummary: formatPickupSlot(order.pickupSlot),
    createdSummary: formatDateTime(order.createdAt),
    itemSummary: order.items.map((item) => item.productName).join('、'),
    itemQuantitySummary: resolveItemQuantitySummary(order),
    phoneSummary: order.contact.phone,
    ...resolveOrderAction(order.status),
  }
}

function filterOrdersByKeyword<T extends MerchantOrderDisplayRecord>(orders: T[], keyword: string): T[] {
  const normalizedKeyword = keyword.trim().toLocaleLowerCase()
  if (normalizedKeyword.length === 0) {
    return orders
  }

  return orders.filter((order) => {
    const haystacks = [order.id, order.phoneSummary, order.itemSummary, order.note]
    return haystacks.some((field) => field.toLocaleLowerCase().includes(normalizedKeyword))
  })
}

function filterOrdersByStatusTab<T extends MerchantOrderDisplayRecord>(
  orders: T[],
  activeStatusTab: MerchantOrderStatusTabKey,
): T[] {
  return orders.filter((order) => resolveOrderTabKey(order.status) === activeStatusTab)
}

function buildVisibleOrdersPatch(
  orders: MerchantOrderDisplayRecord[],
  selectedDateKey: string,
  orderSearchKeyword: string,
  activeStatusTab: MerchantOrderStatusTabKey,
): Pick<MerchantOrdersSceneData, 'visibleOrders' | 'emptyDescription'> {
  const dateFilteredOrders = filterMerchantOrdersByDate(orders, selectedDateKey)
  const keywordFilteredOrders = filterOrdersByKeyword(dateFilteredOrders, orderSearchKeyword)
  const visibleOrders = filterOrdersByStatusTab(keywordFilteredOrders, activeStatusTab)

  return {
    visibleOrders,
    emptyDescription: orders.length === 0 ? '暂无订单' : '当前筛选条件暂无订单',
  }
}

function resolveSelectedDateLabel(dateKey: string): string {
  return dateKey.length > 0 ? dateKey : '全部日期'
}

function normalizeNextStatus(rawValue: unknown): OrderStatus | null {
  if (rawValue === 'in-production' || rawValue === 'ready-for-pickup' || rawValue === 'completed') {
    return rawValue
  }

  return null
}

function resolveAdvanceSuccessMessage(nextStatus: OrderStatus): string {
  switch (nextStatus) {
    case 'in-production':
      return '已转入待制作'
    case 'ready-for-pickup':
      return '已转入待取货'
    case 'completed':
      return '已转入已完成'
    default:
      return '订单状态已更新'
  }
}

function buildAdvanceDialogCopy(nextStatus: OrderStatus): { title: string; description: string; confirmText: string } {
  switch (nextStatus) {
    case 'in-production':
      return {
        title: '确认付款',
        description: '确认已完成付款后，这笔订单会流转到待制作。',
        confirmText: '确认付款',
      }
    case 'ready-for-pickup':
      return {
        title: '制作完成',
        description: '确认制作完成后，这笔订单会流转到待取货。',
        confirmText: '制作完成',
      }
    case 'completed':
      return {
        title: '确认取货',
        description: '确认顾客已取货后，这笔订单会流转到已完成。',
        confirmText: '已取货',
      }
    default:
      return {
        title: '确认操作',
        description: '确认执行这次订单状态流转吗？',
        confirmText: '确认',
      }
  }
}

function mergeOrdersById(baseOrders: OrderRecord[], patchedOrders: OrderRecord[]): OrderRecord[] {
  const patchedOrderMap = new Map(patchedOrders.map((order) => [order.id, order]))

  return baseOrders.map((order) => patchedOrderMap.get(order.id) ?? order)
}

Component({
  options: {
    addGlobalClass: true,
  },

  data: {
    orders: [],
    visibleOrders: [],
    recycleOrderCount: 0,
    selectedDateKey: '',
    selectedDateLabel: '全部日期',
    calendarVisible: false,
    notedOrderCount: 0,
    activeStatusTab: DEFAULT_STATUS_TAB,
    orderTabs: ORDER_TABS,
    orderSearchKeyword: '',
    emptyDescription: '暂无订单',
    cleanupPopupVisible: false,
    autoCleanupDays: 0,
    cleanupOptions: AUTO_CLEANUP_OPTIONS,
    selectionCircleIcons: [...SELECTION_CIRCLE_ICONS],
    confirmDialogVisible: false,
    confirmDialogTitle: '',
    confirmDialogDescription: '',
    confirmDialogConfirmText: '确认',
    confirmDialogTone: 'primary',
    pendingActionKind: '',
    pendingActionOrderId: '',
    pendingActionNextStatus: '',
  } as MerchantOrdersSceneData,

  lifetimes: {
    attached(): void {
      this.syncOrders()
    },
  },

  pageLifetimes: {
    show(): void {
      this.syncOrders()
    },
  },

  methods: {
    syncOrders(): void {
      const now = new Date()
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
      const pipelineOrders = buildMerchantOrderPipeline(merchantVisibility.activeOrders)
      const orders = pipelineOrders.map(mapOrderToDisplay)
      const autoCleanupDays = loadMerchantOrderAutoCleanupDays()

      this.setData({
        orders,
        recycleOrderCount: merchantVisibility.recycleOrders.length,
        notedOrderCount: orders.filter((order) => order.hasNote).length,
        autoCleanupDays,
        ...buildVisibleOrdersPatch(orders, this.data.selectedDateKey, this.data.orderSearchKeyword, this.data.activeStatusTab),
      })
    },

    handleStatusTabChange(event: WechatMiniprogram.BaseEvent): void {
      const nextTab = (event.currentTarget.dataset as { tabKey?: unknown }).tabKey
      if (
        nextTab !== 'pending-confirmation' &&
        nextTab !== 'in-production' &&
        nextTab !== 'ready-for-pickup' &&
        nextTab !== 'completed'
      ) {
        return
      }

      this.setData({
        activeStatusTab: nextTab,
        ...buildVisibleOrdersPatch(this.data.orders, this.data.selectedDateKey, this.data.orderSearchKeyword, nextTab),
      })
    },

    handleOrderSearchChange(event: WechatMiniprogram.CustomEvent<InputDetail>): void {
      const orderSearchKeyword = parseInputValue(event.detail)
      this.setData({
        orderSearchKeyword,
        ...buildVisibleOrdersPatch(this.data.orders, this.data.selectedDateKey, orderSearchKeyword, this.data.activeStatusTab),
      })
    },

    handleClearOrderSearch(): void {
      this.setData({
        orderSearchKeyword: '',
        ...buildVisibleOrdersPatch(this.data.orders, this.data.selectedDateKey, '', this.data.activeStatusTab),
      })
    },

    handleOpenCalendar(): void {
      this.setData({
        calendarVisible: true,
      })
    },

    handleCalendarClose(): void {
      this.setData({
        calendarVisible: false,
      })
    },

    handleCalendarConfirm(event: WechatMiniprogram.CustomEvent<CalendarConfirmDetail>): void {
      const selectedDateKey = toMerchantCalendarDateKey(event.detail.value)

      this.setData({
        calendarVisible: false,
        selectedDateKey,
        selectedDateLabel: resolveSelectedDateLabel(selectedDateKey),
        ...buildVisibleOrdersPatch(this.data.orders, selectedDateKey, this.data.orderSearchKeyword, this.data.activeStatusTab),
      })
    },

    handleClearDateFilter(): void {
      this.setData({
        selectedDateKey: '',
        selectedDateLabel: '全部日期',
        ...buildVisibleOrdersPatch(this.data.orders, '', this.data.orderSearchKeyword, this.data.activeStatusTab),
      })
    },

    handleOpenCleanupPopup(): void {
      this.setData({
        cleanupPopupVisible: true,
      })
    },

    handleCleanupPopupVisibleChange(event: WechatMiniprogram.CustomEvent<PopupVisibleChangeDetail>): void {
      this.setData({
        cleanupPopupVisible: parsePopupVisible(event.detail),
      })
    },

    handleAutoCleanupChange(event: WechatMiniprogram.CustomEvent<{ value?: unknown }>): void {
      const autoCleanupDays = normalizeCleanupDays(event.detail.value)
      saveMerchantOrderAutoCleanupDays(wx, autoCleanupDays)
      this.setData({
        autoCleanupDays,
      })
      this.syncOrders()
      wx.showToast({
        title: autoCleanupDays === 0 ? '已关闭定时清理' : `已设置 ${autoCleanupDays} 天定时清理`,
        icon: 'success',
      })
    },

    handleInstantCleanup(): void {
      const movedOrders = moveCompletedOrdersToMerchantRecycle(wx, 'instant-clear')
      this.setData({
        cleanupPopupVisible: false,
      })
      this.syncOrders()
      wx.showToast({
        title: movedOrders.length === 0 ? '当前没有可清理订单' : `已清理 ${movedOrders.length} 条订单`,
        icon: movedOrders.length === 0 ? 'none' : 'success',
      })
    },

    handleOpenRecyclePage(): void {
      wx.navigateTo({
        url: '/pages/merchant/order-recycle/order-recycle',
      })
    },

    handleOpenOrderDetail(event: WechatMiniprogram.BaseEvent): void {
      const orderId = (event.currentTarget.dataset as { orderId?: unknown }).orderId
      if (typeof orderId !== 'string' || orderId.length === 0) {
        return
      }

      wx.navigateTo({
        url: `/pages/merchant/order-detail/order-detail?orderId=${orderId}`,
      })
    },

    openActionDialog(input: {
      actionKind: MerchantOrderPendingActionKind
      orderId: string
      title: string
      description: string
      confirmText: string
      tone: 'primary' | 'danger'
      nextStatus?: OrderStatus | ''
    }): void {
      this.setData({
        confirmDialogVisible: true,
        confirmDialogTitle: input.title,
        confirmDialogDescription: input.description,
        confirmDialogConfirmText: input.confirmText,
        confirmDialogTone: input.tone,
        pendingActionKind: input.actionKind,
        pendingActionOrderId: input.orderId,
        pendingActionNextStatus: input.nextStatus ?? '',
      })
    },

    handleActionDialogVisibleChange(event: WechatMiniprogram.CustomEvent<PopupVisibleChangeDetail>): void {
      if (parsePopupVisible(event.detail)) {
        return
      }

      this.handleCloseActionDialog()
    },

    handleCardActionTap(event: WechatMiniprogram.BaseEvent): void {
      const dataset = event.currentTarget.dataset as {
        orderId?: unknown
        actionType?: unknown
        nextStatus?: unknown
      }
      const orderId = dataset.orderId
      if (typeof orderId !== 'string' || orderId.length === 0) {
        return
      }

      if (dataset.actionType === 'delete') {
        this.openActionDialog({
          actionKind: 'delete',
          orderId,
          title: '删除订单',
          description: '确认将这条已完成订单移入回收站吗？移入后仍可在回收站中恢复。',
          confirmText: '移入回收站',
          tone: 'danger',
        })
        return
      }

      const nextStatus = normalizeNextStatus(dataset.nextStatus)
      if (dataset.actionType !== 'advance' || nextStatus === null) {
        return
      }

      const dialogCopy = buildAdvanceDialogCopy(nextStatus)
      this.openActionDialog({
        actionKind: 'advance',
        orderId,
        title: dialogCopy.title,
        description: dialogCopy.description,
        confirmText: dialogCopy.confirmText,
        tone: 'primary',
        nextStatus,
      })
    },

    handleCloseActionDialog(): void {
      this.setData({
        confirmDialogVisible: false,
        confirmDialogTitle: '',
        confirmDialogDescription: '',
        confirmDialogConfirmText: '确认',
        confirmDialogTone: 'primary',
        pendingActionKind: '',
        pendingActionOrderId: '',
        pendingActionNextStatus: '',
      })
    },

    handleConfirmActionDialog(): void {
      const orderId = this.data.pendingActionOrderId
      if (orderId.length === 0) {
        this.handleCloseActionDialog()
        return
      }

      if (this.data.pendingActionKind === 'delete') {
        deleteCompletedMerchantOrder(wx, orderId)
        this.handleCloseActionDialog()
        this.syncOrders()
        wx.showToast({
          title: '已移入回收站',
          icon: 'success',
        })
        return
      }

      const nextStatus = this.data.pendingActionNextStatus
      if (this.data.pendingActionKind === 'advance' && nextStatus !== '') {
        updateMerchantOrderStatus(wx, orderId, nextStatus)
        this.handleCloseActionDialog()
        this.syncOrders()
        wx.showToast({
          title: resolveAdvanceSuccessMessage(nextStatus),
          icon: 'success',
        })
        return
      }

      this.handleCloseActionDialog()
    },
  },
})
