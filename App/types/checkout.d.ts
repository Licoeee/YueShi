import type { PickupSlot } from './order'

export type CheckoutSource = 'cart' | 'buy-now'

export interface CheckoutItemRecord {
  id: string
  productId: string
  productName: string
  coverImage: string
  quantity: number
  unitPrice: number
  subtotal: number
  layerId: string
  sizePlanId: string
  creamId: string
  specLabel: string
  creamLabel: string
}

export interface CheckoutContactDraft {
  phone: string
}

export interface CheckoutDraftRecord {
  source: CheckoutSource
  items: CheckoutItemRecord[]
  contact: CheckoutContactDraft
  pickupSlot: PickupSlot
  totalAmount: number
}
