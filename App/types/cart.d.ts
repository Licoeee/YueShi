export type CartEntryMode = 'cart' | 'buy-now'

export interface CartItemSelection {
  layerId: string
  sizePlanId: string
  creamId: string
}

export interface CartItemRecord {
  id: string
  productId: string
  productName: string
  coverImage: string
  specLabel: string
  creamLabel: string
  quantity: number
  unitPrice: number
  totalPrice: number
  checked: boolean
  entryMode: CartEntryMode
  selection: CartItemSelection
}
