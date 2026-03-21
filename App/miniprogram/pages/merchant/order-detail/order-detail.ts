import type { OrderRecord } from '../../../../types/order'
import { splitCustomerOrdersByRecycleState } from '../../../utils/customer-order-recycle'
import { resolveCakeImageUrl } from '../../../utils/customer-image-fallback'
import { loadStoredCustomerOrders, saveStoredCustomerOrders } from '../../../utils/customer-order-storage'
import { formatPickupSlot } from '../../../utils/customer-pickup-slot'
import {
  loadMerchantOrderAutoCleanupDays,
  purgeExpiredCompletedMerchantOrders,
  splitMerchantOrdersByRecycleState,
} from '../../../utils/merchant-order-management'

type FontSizeValue = 14 | 16 | 18 | 20 | 24 | 28
type ZoomPopupKind = 'text' | 'fields'

interface PickerOption {
  label: string
  value: string
}

interface ZoomFieldEntry {
  label: string
  value: string
}

type MerchantOrderDetailItemView = OrderRecord['items'][number] & {
  coverImageUrl: string
}

interface MerchantOrderDetailPageData {
  order: OrderRecord | null
  itemViews: MerchantOrderDetailItemView[]
  statusLabel: string
  statusTheme: 'default' | 'primary' | 'warning' | 'danger'
  pickupSummary: string
  createdSummary: string
  coverImageUrl: string
  zoomPopupVisible: boolean
  zoomPopupTitle: string
  zoomPopupKind: ZoomPopupKind
  zoomPopupTextContent: string
  zoomPopupFields: ZoomFieldEntry[]
  fontSizeMode: FontSizeValue
  fontSizeOptions: PickerOption[]
  fontSizePickerVisible: boolean
  fontSizePickerValue: string[]
}

interface PopupVisibleChangeDetail {
  visible?: unknown
}

interface PickerPickDetail {
  column?: unknown
  index?: unknown
}

interface PickerConfirmColumn {
  column?: unknown
  index?: unknown
}

interface PickerConfirmDetail {
  columns?: PickerConfirmColumn[]
}

interface MerchantOrderVisibilityState {
  activeOrders: OrderRecord[]
  recycleOrders: OrderRecord[]
}

interface ZoomPopupPayload {
  title: string
  kind: ZoomPopupKind
  textContent: string
  fields: ZoomFieldEntry[]
}

const FONT_SIZE_OPTIONS: PickerOption[] = [
  { label: '14', value: '14' },
  { label: '16', value: '16' },
  { label: '18', value: '18' },
  { label: '20', value: '20' },
  { label: '24', value: '24' },
  { label: '28', value: '28' },
]
const DEFAULT_FONT_SIZE: FontSizeValue = 16

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

function formatDateTime(isoText: string): string {
  const date = new Date(isoText)
  if (Number.isNaN(date.getTime())) {
    return '未知时间'
  }

  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
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

function normalizeFontSizeMode(rawValue: unknown): FontSizeValue {
  if (rawValue === 14 || rawValue === 16 || rawValue === 18 || rawValue === 20 || rawValue === 24 || rawValue === 28) {
    return rawValue
  }

  if (typeof rawValue === 'string' && rawValue.length > 0) {
    const parsed = Number(rawValue)
    if (parsed === 14 || parsed === 16 || parsed === 18 || parsed === 20 || parsed === 24 || parsed === 28) {
      return parsed
    }
  }

  return DEFAULT_FONT_SIZE
}

function buildFontSizePickerValue(fontSizeMode: FontSizeValue): string[] {
  return [String(fontSizeMode)]
}

function normalizeItemIndex(rawValue: unknown): number {
  if (typeof rawValue === 'number' && Number.isInteger(rawValue) && rawValue >= 0) {
    return rawValue
  }

  if (typeof rawValue === 'string' && rawValue.length > 0) {
    const parsed = Number(rawValue)
    return Number.isInteger(parsed) && parsed >= 0 ? parsed : -1
  }

  return -1
}

function normalizePickerIndex(rawValue: unknown): number {
  return typeof rawValue === 'number' && Number.isInteger(rawValue) && rawValue >= 0 ? rawValue : -1
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
    activeOrders: merchantVisibility.activeOrders,
    recycleOrders: merchantVisibility.recycleOrders,
  }
}

function buildItemViews(order: OrderRecord): MerchantOrderDetailItemView[] {
  return order.items.map((item) => ({
    ...item,
    coverImageUrl: resolveCakeImageUrl(item.coverImage),
  }))
}

function resolveContactSummary(order: OrderRecord): string {
  const consigneeText = order.contact.consignee?.trim()
  return consigneeText !== undefined && consigneeText.length > 0
    ? `${consigneeText}\n${order.contact.phone}`
    : order.contact.phone
}

function resolvePreviewImageUrls(itemViews: MerchantOrderDetailItemView[]): string[] {
  return itemViews
    .map((item) => item.coverImageUrl)
    .filter((url, index, urls) => url.length > 0 && urls.indexOf(url) === index)
}

function buildItemZoomFields(item: MerchantOrderDetailItemView): ZoomFieldEntry[] {
  return [
    { label: '规格', value: item.specLabel || '未填写' },
    { label: '奶油', value: item.creamLabel || '未填写' },
    { label: '数量', value: `x${item.quantity}` },
    { label: '单价', value: `¥${item.unitPrice}` },
  ]
}

function resolveZoomPopupPayload(
  order: OrderRecord,
  itemViews: MerchantOrderDetailItemView[],
  fieldKey: string,
  itemIndex: number,
): ZoomPopupPayload | null {
  switch (fieldKey) {
    case 'order-id':
      return {
        title: '订单号',
        kind: 'text',
        textContent: order.id,
        fields: [],
      }
    case 'pickup-time':
      return {
        title: '取货时间',
        kind: 'text',
        textContent: formatPickupSlot(order.pickupSlot),
        fields: [],
      }
    case 'created-at':
      return {
        title: '下单时间',
        kind: 'text',
        textContent: formatDateTime(order.createdAt),
        fields: [],
      }
    case 'contact':
      return {
        title: '联系人',
        kind: 'text',
        textContent: resolveContactSummary(order),
        fields: [],
      }
    case 'note':
      return {
        title: '订单备注',
        kind: 'text',
        textContent: order.note.trim().length > 0 ? order.note : '暂无备注',
        fields: [],
      }
    case 'amount':
      return {
        title: '订单金额',
        kind: 'text',
        textContent: `¥${order.totalAmount}`,
        fields: [],
      }
    case 'item': {
      const targetItem = itemViews[itemIndex]
      if (targetItem === undefined) {
        return null
      }

      return {
        title: targetItem.productName,
        kind: 'fields',
        textContent: '',
        fields: buildItemZoomFields(targetItem),
      }
    }
    default:
      return null
  }
}

Page<
  MerchantOrderDetailPageData,
  {
    currentOrderId: string
    committedFontSizeMode: FontSizeValue
    onLoad(query: Record<string, string | undefined>): void
    onShow(): void
    syncOrder(orderId: string): void
    handlePreviewOrderImages(event: WechatMiniprogram.BaseEvent): void
    handleOpenZoomPopup(event: WechatMiniprogram.BaseEvent): void
    handleZoomPopupVisibleChange(event: WechatMiniprogram.CustomEvent<PopupVisibleChangeDetail>): void
    handleCloseZoomPopup(): void
    handleOpenFontSizePicker(): void
    handleFontSizeChange(event: WechatMiniprogram.CustomEvent<PickerPickDetail>): void
    handleFontSizeConfirm(event: WechatMiniprogram.CustomEvent<PickerConfirmDetail>): void
    handleFontSizeCancel(): void
  }
>({
  data: {
    order: null,
    itemViews: [],
    statusLabel: '',
    statusTheme: 'default',
    pickupSummary: '',
    createdSummary: '',
    coverImageUrl: '',
    zoomPopupVisible: false,
    zoomPopupTitle: '',
    zoomPopupKind: 'text',
    zoomPopupTextContent: '',
    zoomPopupFields: [],
    fontSizeMode: DEFAULT_FONT_SIZE,
    fontSizeOptions: [...FONT_SIZE_OPTIONS],
    fontSizePickerVisible: false,
    fontSizePickerValue: buildFontSizePickerValue(DEFAULT_FONT_SIZE),
  },

  currentOrderId: '',
  committedFontSizeMode: DEFAULT_FONT_SIZE,

  onLoad(query) {
    const orderId = resolveOrderId(query)
    if (orderId.length === 0) {
      wx.showToast({ title: '订单不存在', icon: 'none' })
      wx.redirectTo({ url: '/pages/merchant/orders/orders' })
      return
    }

    this.currentOrderId = orderId
    this.syncOrder(orderId)
  },

  onShow() {
    if (this.currentOrderId.length > 0) {
      this.syncOrder(this.currentOrderId)
    }
  },

  syncOrder(orderId) {
    const now = new Date()
    const merchantVisibility = loadMerchantOrderVisibilityState(now)
    const order = merchantVisibility.activeOrders.find((item) => item.id === orderId) ?? null

    if (order === null) {
      const recycledOrder = merchantVisibility.recycleOrders.find((item) => item.id === orderId)
      if (recycledOrder !== undefined) {
        wx.showToast({ title: '订单已移入回收站', icon: 'none' })
        wx.redirectTo({ url: '/pages/merchant/order-recycle/order-recycle' })
        return
      }

      wx.showToast({ title: '订单不存在', icon: 'none' })
      wx.redirectTo({ url: '/pages/merchant/orders/orders' })
      return
    }

    const itemViews = buildItemViews(order)
    this.committedFontSizeMode = DEFAULT_FONT_SIZE
    wx.setNavigationBarTitle({ title: `订单 ${order.id}` })
    this.setData({
      order,
      itemViews,
      statusLabel: formatOrderStatus(order.status),
      statusTheme: resolveOrderStatusTheme(order.status),
      pickupSummary: formatPickupSlot(order.pickupSlot),
      createdSummary: formatDateTime(order.createdAt),
      coverImageUrl: itemViews[0]?.coverImageUrl ?? '',
      zoomPopupVisible: false,
      zoomPopupTitle: '',
      zoomPopupKind: 'text',
      zoomPopupTextContent: '',
      zoomPopupFields: [],
      fontSizeMode: DEFAULT_FONT_SIZE,
      fontSizePickerVisible: false,
      fontSizePickerValue: buildFontSizePickerValue(DEFAULT_FONT_SIZE),
    })
  },

  handlePreviewOrderImages(event) {
    const previewImageUrls = resolvePreviewImageUrls(this.data.itemViews)
    if (previewImageUrls.length === 0) {
      wx.showToast({
        title: '暂无可查看图片',
        icon: 'none',
      })
      return
    }

    const itemIndex = normalizeItemIndex((event.currentTarget.dataset as { itemIndex?: unknown }).itemIndex)
    const currentImage = previewImageUrls[itemIndex] ?? previewImageUrls[0]

    wx.previewImage({
      current: currentImage,
      urls: previewImageUrls,
    })
  },

  handleOpenZoomPopup(event) {
    const order = this.data.order
    if (order === null) {
      return
    }

    const dataset = event.currentTarget.dataset as {
      fieldKey?: unknown
      itemIndex?: unknown
    }
    const fieldKey = typeof dataset.fieldKey === 'string' ? dataset.fieldKey : ''
    const itemIndex = normalizeItemIndex(dataset.itemIndex)
    const payload = resolveZoomPopupPayload(order, this.data.itemViews, fieldKey, itemIndex)

    if (payload === null) {
      return
    }

    this.setData({
      zoomPopupVisible: true,
      zoomPopupTitle: payload.title,
      zoomPopupKind: payload.kind,
      zoomPopupTextContent: payload.textContent,
      zoomPopupFields: payload.fields,
      fontSizePickerVisible: false,
      fontSizePickerValue: buildFontSizePickerValue(this.data.fontSizeMode),
    })
  },

  handleZoomPopupVisibleChange(event) {
    if (!parsePopupVisible(event.detail)) {
      this.handleCloseZoomPopup()
    }
  },

  handleCloseZoomPopup() {
    this.setData({
      zoomPopupVisible: false,
      zoomPopupTitle: '',
      zoomPopupKind: 'text',
      zoomPopupTextContent: '',
      zoomPopupFields: [],
      fontSizePickerVisible: false,
    })
  },

  handleOpenFontSizePicker() {
    this.committedFontSizeMode = this.data.fontSizeMode
    this.setData({
      fontSizePickerVisible: true,
      fontSizePickerValue: buildFontSizePickerValue(this.data.fontSizeMode),
    })
  },

  handleFontSizeChange(event) {
    const columnIndex = normalizePickerIndex(event.detail.column)
    if (columnIndex > 0) {
      return
    }

    const optionIndex = normalizePickerIndex(event.detail.index)
    if (optionIndex < 0) {
      return
    }

    const nextFontSize = normalizeFontSizeMode(FONT_SIZE_OPTIONS[optionIndex]?.value)
    this.setData({
      fontSizeMode: nextFontSize,
      fontSizePickerValue: buildFontSizePickerValue(nextFontSize),
    })
  },

  handleFontSizeConfirm(event) {
    const pickedColumn = Array.isArray(event.detail.columns)
      ? event.detail.columns.find((column) => normalizePickerIndex(column.column) === 0)
      : undefined
    const optionIndex = normalizePickerIndex(pickedColumn?.index)
    const nextFontSize =
      optionIndex >= 0 ? normalizeFontSizeMode(FONT_SIZE_OPTIONS[optionIndex]?.value) : this.data.fontSizeMode

    this.committedFontSizeMode = nextFontSize
    this.setData({
      fontSizeMode: nextFontSize,
      fontSizePickerVisible: false,
      fontSizePickerValue: buildFontSizePickerValue(nextFontSize),
    })
  },

  handleFontSizeCancel() {
    this.setData({
      fontSizeMode: this.committedFontSizeMode,
      fontSizePickerVisible: false,
      fontSizePickerValue: buildFontSizePickerValue(this.committedFontSizeMode),
    })
  },
})
