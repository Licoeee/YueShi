import type { OrderRecord, OrderStatus } from '../../../types/order'
import { loadStoredCustomerOrders } from '../../utils/customer-order-storage'
import { resolveCakeImageUrl } from '../../utils/customer-image-fallback'
import { formatPickupSlot } from '../../utils/customer-pickup-slot'

type CustomerOrderTabKey = 'pending-confirmation' | 'in-production' | 'ready-for-pickup' | 'completed'

interface CustomerOrderTabOption {
  label: string
  value: CustomerOrderTabKey
}

interface CustomerOrderDisplayRecord extends OrderRecord {
  statusLabel: string
  statusTheme: 'default' | 'primary' | 'warning' | 'danger'
  pickupSummary: string
  itemSummary: string
  itemQuantitySummary: string
  coverImageUrl: string
}

interface CustomerOrdersSceneData {
  activeTab: CustomerOrderTabKey
  orderTabs: CustomerOrderTabOption[]
  orders: CustomerOrderDisplayRecord[]
  visibleOrders: CustomerOrderDisplayRecord[]
}

const DEFAULT_ACTIVE_TAB: CustomerOrderTabKey = 'pending-confirmation'
const ORDER_TABS: CustomerOrderTabOption[] = [
  { label: '待确认', value: 'pending-confirmation' },
  { label: '待制作', value: 'in-production' },
  { label: '待取货', value: 'ready-for-pickup' },
  { label: '已完成', value: 'completed' },
]

function formatOrderStatus(status: OrderStatus): string {
  const statusMap: Record<OrderStatus, string> = {
    'pending-payment': '待确认',
    paid: '待确认',
    'in-production': '待制作',
    'ready-for-pickup': '待取货',
    completed: '已完成',
    cancelled: '已取消',
  }

  return statusMap[status]
}

function resolveOrderStatusTheme(status: OrderStatus): 'default' | 'primary' | 'warning' | 'danger' {
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

function resolveOrderTabKey(status: OrderStatus): CustomerOrderTabKey {
  switch (status) {
    case 'pending-payment':
    case 'paid':
    case 'cancelled':
      return 'pending-confirmation'
    case 'in-production':
      return 'in-production'
    case 'ready-for-pickup':
      return 'ready-for-pickup'
    case 'completed':
      return 'completed'
    default:
      return 'pending-confirmation'
  }
}

function mapOrderToDisplay(order: OrderRecord): CustomerOrderDisplayRecord {
  const firstItem = order.items[0]

  return {
    ...order,
    statusLabel: formatOrderStatus(order.status),
    statusTheme: resolveOrderStatusTheme(order.status),
    pickupSummary: formatPickupSlot(order.pickupSlot),
    itemSummary: order.items.map((item) => item.productName).join('、'),
    itemQuantitySummary: `共 ${order.items.reduce((total, item) => total + item.quantity, 0)} 件蛋糕`,
    coverImageUrl: firstItem === undefined ? '' : resolveCakeImageUrl(firstItem.coverImage),
  }
}

function filterOrdersByTab(
  orders: CustomerOrderDisplayRecord[],
  activeTab: CustomerOrderTabKey,
): CustomerOrderDisplayRecord[] {
  return orders.filter((order) => resolveOrderTabKey(order.status) === activeTab)
}

function isCustomerOrderTabKey(value: unknown): value is CustomerOrderTabKey {
  return (
    value === 'pending-confirmation' ||
    value === 'in-production' ||
    value === 'ready-for-pickup' ||
    value === 'completed'
  )
}

Component({
  options: {
    addGlobalClass: true,
  },

  data: {
    activeTab: DEFAULT_ACTIVE_TAB,
    orderTabs: ORDER_TABS,
    orders: [],
    visibleOrders: [],
  } as CustomerOrdersSceneData,

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
      const orders = loadStoredCustomerOrders().map(mapOrderToDisplay)
      this.setData({
        orders,
        visibleOrders: filterOrdersByTab(orders, this.data.activeTab),
      })
    },

    handleTabChange(event: WechatMiniprogram.BaseEvent): void {
      const nextTab = (event.currentTarget.dataset as { tabKey?: unknown }).tabKey
      if (!isCustomerOrderTabKey(nextTab)) {
        return
      }

      this.setData({
        activeTab: nextTab,
        visibleOrders: filterOrdersByTab(this.data.orders, nextTab),
      })
    },

    handleOrderTap(event: WechatMiniprogram.BaseEvent): void {
      const orderId = (event.currentTarget.dataset as { orderId?: unknown }).orderId
      if (typeof orderId !== 'string' || orderId.length === 0) {
        return
      }

      wx.navigateTo({
        url: `/pages/customer/order-detail/order-detail?orderId=${orderId}`,
      })
    },
  },
})
