import type { CartEntryMode, CartItemRecord } from '../../types/cart'

export interface CreateCartItemInput {
  productId: string
  quantity: number
  layerId: string
  sizePlanId: string
  creamId: string
  productName?: string
  coverImage?: string
  specLabel?: string
  creamLabel?: string
  unitPrice?: number
  checked?: boolean
  entryMode?: CartEntryMode
}

function buildCartSelectionKey(input: Pick<CreateCartItemInput, 'productId' | 'layerId' | 'sizePlanId' | 'creamId'>): string {
  return [input.productId, input.layerId, input.sizePlanId, input.creamId].join(':')
}

export function createCartItem(input: CreateCartItemInput): CartItemRecord {
  const unitPrice = input.unitPrice ?? 0

  return {
    id: buildCartSelectionKey(input),
    productId: input.productId,
    productName: input.productName ?? input.productId,
    coverImage: input.coverImage ?? '',
    specLabel: input.specLabel ?? '',
    creamLabel: input.creamLabel ?? '',
    quantity: input.quantity,
    unitPrice,
    totalPrice: unitPrice * input.quantity,
    checked: input.checked ?? false,
    entryMode: input.entryMode ?? 'cart',
    selection: {
      layerId: input.layerId,
      sizePlanId: input.sizePlanId,
      creamId: input.creamId,
    },
  }
}

export function upsertCartItem(items: CartItemRecord[], incoming: CartItemRecord): CartItemRecord[] {
  const matchedIndex = items.findIndex((item) => item.id === incoming.id)
  if (matchedIndex < 0) {
    return [...items, incoming]
  }

  return items.map((item, index) => {
    if (index !== matchedIndex) {
      return item
    }

    const quantity = item.quantity + incoming.quantity

    return {
      ...item,
      quantity,
      totalPrice: quantity * item.unitPrice,
    }
  })
}

export function markImmediatePurchase(items: CartItemRecord[], targetId: string): CartItemRecord[] {
  return items.map((item) => ({
    ...item,
    checked: item.id === targetId,
    entryMode: item.id === targetId ? 'buy-now' : 'cart',
  }))
}

export function toggleCartItemChecked(items: CartItemRecord[], targetId: string): CartItemRecord[] {
  return items.map((item) => {
    if (item.id === targetId) {
      return {
        ...item,
        checked: !item.checked,
        entryMode: 'cart',
      }
    }

    return {
      ...item,
      entryMode: 'cart',
    }
  })
}

export function toggleAllCartItemsChecked(items: CartItemRecord[], checked: boolean): CartItemRecord[] {
  return items.map((item) => ({
    ...item,
    checked,
    entryMode: 'cart',
  }))
}

export function areAllCartItemsChecked(items: CartItemRecord[]): boolean {
  return items.length > 0 && items.every((item) => item.checked)
}

export function removeCartItem(items: CartItemRecord[], targetId: string): CartItemRecord[] {
  return items.filter((item) => item.id !== targetId)
}
