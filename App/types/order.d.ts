import type { ProductSpecSize } from './product'

export type OrderStatus =
  | 'pending-payment'
  | 'paid'
  | 'in-production'
  | 'ready-for-pickup'
  | 'completed'
  | 'cancelled'

export interface PickupSlot {
  month: number
  day: number
  timeLabel: string
  isoText: string
}

export interface OrderContact {
  phone: string
  phoneTail: string
  consignee?: string
}

export interface OrderItem {
  productId: string
  productName: string
  specId: string
  size: ProductSpecSize
  quantity: number
  unitPrice: number
  coverImage: string
}

export interface OrderRecord {
  id: string
  customerOpenId: string
  merchantOpenId: string
  status: OrderStatus
  items: OrderItem[]
  contact: OrderContact
  pickupSlot: PickupSlot
  note: string
  hasNote: boolean
  totalAmount: number
  createdAt: string
  updatedAt: string
}
