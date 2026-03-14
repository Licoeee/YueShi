import type { RoleType } from '../../types/role'

export interface RoleTabbarItem {
  value: string
  label: string
  path: string
  iconKey: RoleTabbarIconKey
  iconInactive: string
  iconActive: string
}

export type RoleTabbarIconKey =
  | 'home'
  | 'cart'
  | 'orders'
  | 'profile'
  | 'products'
  | 'account-book'
  | 'inventory'
  | 'reviews'
  | 'overview'

const CUSTOMER_TABBAR_ITEMS: RoleTabbarItem[] = [
  {
    value: 'customer-home',
    label: '首页',
    path: '/pages/customer/home/home',
    iconKey: 'home',
    iconInactive: '/assets/icons/tab/home-inactive.svg',
    iconActive: '/assets/icons/tab/home-active.svg',
  },
  {
    value: 'customer-cart',
    label: '购物车',
    path: '/pages/customer/cart/cart',
    iconKey: 'cart',
    iconInactive: '/assets/icons/tab/cart-inactive.svg',
    iconActive: '/assets/icons/tab/cart-active.svg',
  },
  {
    value: 'customer-orders',
    label: '订单',
    path: '/pages/customer/orders/orders',
    iconKey: 'orders',
    iconInactive: '/assets/icons/tab/orders-inactive.svg',
    iconActive: '/assets/icons/tab/orders-active.svg',
  },
  {
    value: 'customer-profile',
    label: '我的',
    path: '/pages/customer/profile/profile',
    iconKey: 'profile',
    iconInactive: '/assets/icons/tab/profile-inactive.svg',
    iconActive: '/assets/icons/tab/profile-active.svg',
  },
]

const MERCHANT_TABBAR_ITEMS: RoleTabbarItem[] = [
  {
    value: 'merchant-products',
    label: '商品管理',
    path: '/pages/merchant/products/products',
    iconKey: 'products',
    iconInactive: '/assets/icons/tab/products-inactive.svg',
    iconActive: '/assets/icons/tab/products-active.svg',
  },
  {
    value: 'merchant-orders',
    label: '订单管理',
    path: '/pages/merchant/orders/orders',
    iconKey: 'orders',
    iconInactive: '/assets/icons/tab/orders-inactive.svg',
    iconActive: '/assets/icons/tab/orders-active.svg',
  },
  {
    value: 'merchant-account-book',
    label: '账本',
    path: '/pages/merchant/account-book/account-book',
    iconKey: 'account-book',
    iconInactive: '/assets/icons/tab/account-book-inactive.svg',
    iconActive: '/assets/icons/tab/account-book-active.svg',
  },
  {
    value: 'merchant-inventory',
    label: '商品库存',
    path: '/pages/merchant/inventory/inventory',
    iconKey: 'inventory',
    iconInactive: '/assets/icons/tab/inventory-inactive.svg',
    iconActive: '/assets/icons/tab/inventory-active.svg',
  },
  {
    value: 'merchant-profile',
    label: '我的',
    path: '/pages/merchant/profile/profile',
    iconKey: 'profile',
    iconInactive: '/assets/icons/tab/profile-inactive.svg',
    iconActive: '/assets/icons/tab/profile-active.svg',
  },
]

const ADMIN_TABBAR_ITEMS: RoleTabbarItem[] = [
  {
    value: 'admin-reviews',
    label: '商家审核',
    path: '/pages/admin/reviews/reviews',
    iconKey: 'reviews',
    iconInactive: '/assets/icons/tab/reviews-inactive.svg',
    iconActive: '/assets/icons/tab/reviews-active.svg',
  },
  {
    value: 'admin-overview',
    label: '数据概览',
    path: '/pages/admin/overview/overview',
    iconKey: 'overview',
    iconInactive: '/assets/icons/tab/overview-inactive.svg',
    iconActive: '/assets/icons/tab/overview-active.svg',
  },
  {
    value: 'admin-profile',
    label: '我的',
    path: '/pages/admin/profile/profile',
    iconKey: 'profile',
    iconInactive: '/assets/icons/tab/profile-inactive.svg',
    iconActive: '/assets/icons/tab/profile-active.svg',
  },
]

const TABBAR_BY_ROLE: Record<RoleType, RoleTabbarItem[]> = {
  admin: ADMIN_TABBAR_ITEMS,
  merchant: MERCHANT_TABBAR_ITEMS,
  customer: CUSTOMER_TABBAR_ITEMS,
}

const ALL_TABBAR_ITEMS = [...CUSTOMER_TABBAR_ITEMS, ...MERCHANT_TABBAR_ITEMS, ...ADMIN_TABBAR_ITEMS]

function normalizePath(path: string): string {
  const queryStartIndex = path.indexOf('?')
  if (queryStartIndex < 0) {
    return path
  }

  return path.slice(0, queryStartIndex)
}

function isRoleType(value: unknown): value is RoleType {
  return value === 'admin' || value === 'merchant' || value === 'customer'
}

function getRoleTypeByPath(path: string): RoleType | null {
  const normalizedPath = normalizePath(path)
  const matchedItem = ALL_TABBAR_ITEMS.find((item) => item.path === normalizedPath)
  if (matchedItem === undefined) {
    return null
  }

  const [rolePrefix] = matchedItem.value.split('-')
  if (!isRoleType(rolePrefix)) {
    return null
  }

  return rolePrefix
}

export function getRoleTabbarItems(roleType: RoleType): RoleTabbarItem[] {
  return TABBAR_BY_ROLE[roleType]
}

export function getRoleTabbarItemsByPath(path: string): RoleTabbarItem[] {
  const roleType = getRoleTypeByPath(path)
  if (roleType === null) {
    return TABBAR_BY_ROLE.customer
  }

  return TABBAR_BY_ROLE[roleType]
}

export function getRoleTabbarValueByPath(path: string): string | null {
  const normalizedPath = normalizePath(path)
  const matchedItem = ALL_TABBAR_ITEMS.find((item) => item.path === normalizedPath)

  return matchedItem?.value ?? null
}

export function getRoleTabbarPreloadPaths(roleType: RoleType, currentPath: string): string[] {
  const normalizedCurrentPath = normalizePath(currentPath)

  return TABBAR_BY_ROLE[roleType].map((item) => item.path).filter((path) => path !== normalizedCurrentPath)
}

export function getRoleEntryPathByRole(roleType: RoleType): string {
  return TABBAR_BY_ROLE[roleType][0].path
}
