import type { CartItemRecord } from '../../types/cart'
import type { CheckoutItemRecord, CheckoutSource } from '../../types/checkout'
import type { CakeCreamOption, CakeDetail, CakeLayerOption, CakeSizePlan } from '../../types/product'
import { getCakeDetailById } from './customer-cake-catalog'

export interface CheckoutResolvedState {
  source: CheckoutSource
  items: CheckoutItemRecord[]
  totalAmount: number
  totalQuantity: number
}

function resolveCakeDetail(item: CartItemRecord): CakeDetail | null {
  try {
    return getCakeDetailById(item.productId)
  } catch {
    return null
  }
}

function resolveLayerLabel(layerOptions: CakeLayerOption[], layerId: string): string {
  return layerOptions.find((item) => item.id === layerId)?.label ?? layerId
}

function resolveSizePlanLabel(sizePlans: CakeSizePlan[], sizePlanId: string): string {
  return sizePlans.find((item) => item.id === sizePlanId)?.label ?? sizePlanId
}

function resolveCreamLabel(creamOptions: CakeCreamOption[], creamId: string): string {
  return creamOptions.find((item) => item.id === creamId)?.label ?? creamId
}

function buildCheckoutSpecLabel(item: CartItemRecord): string {
  if (item.specLabel.trim().length > 0) {
    return item.specLabel
  }

  const cake = resolveCakeDetail(item)
  if (cake === null) {
    return [item.selection.layerId, item.selection.sizePlanId].join(' / ')
  }

  return [
    resolveLayerLabel(cake.layerOptions, item.selection.layerId),
    resolveSizePlanLabel(cake.sizePlans, item.selection.sizePlanId),
  ].join(' / ')
}

function buildCheckoutCreamLabel(item: CartItemRecord): string {
  if (item.creamLabel.trim().length > 0) {
    return item.creamLabel
  }

  const cake = resolveCakeDetail(item)
  if (cake === null) {
    return item.selection.creamId
  }

  return resolveCreamLabel(cake.creamOptions, item.selection.creamId)
}

export function buildCheckoutItemFromCartItem(item: CartItemRecord): CheckoutItemRecord {
  return {
    id: item.id,
    productId: item.productId,
    productName: item.productName,
    coverImage: item.coverImage,
    quantity: item.quantity,
    unitPrice: item.unitPrice,
    subtotal: item.totalPrice,
    layerId: item.selection.layerId,
    sizePlanId: item.selection.sizePlanId,
    creamId: item.selection.creamId,
    specLabel: buildCheckoutSpecLabel(item),
    creamLabel: buildCheckoutCreamLabel(item),
  }
}

function resolveCheckoutCandidateItems(items: CartItemRecord[]): {
  source: CheckoutSource
  items: CartItemRecord[]
} {
  const checkedCartItems = items.filter((item) => item.checked && item.entryMode === 'cart')
  if (checkedCartItems.length > 0) {
    return {
      source: 'cart',
      items: checkedCartItems,
    }
  }

  const activeBuyNowItem = items.find((item) => item.checked && item.entryMode === 'buy-now')
  if (activeBuyNowItem !== undefined) {
    return {
      source: 'buy-now',
      items: [activeBuyNowItem],
    }
  }

  return {
    source: 'cart',
    items: [],
  }
}

export function buildCheckoutState(items: CartItemRecord[]): CheckoutResolvedState {
  const candidateState = resolveCheckoutCandidateItems(items)
  const checkoutItems = candidateState.items.map(buildCheckoutItemFromCartItem)

  return {
    source: candidateState.source,
    items: checkoutItems,
    totalAmount: checkoutItems.reduce((sum, item) => sum + item.subtotal, 0),
    totalQuantity: checkoutItems.reduce((sum, item) => sum + item.quantity, 0),
  }
}

export function removeSubmittedCartItems(items: CartItemRecord[], submittedItems: CheckoutItemRecord[]): CartItemRecord[] {
  const submittedIds = new Set(submittedItems.map((item) => item.id))
  return items.filter((item) => !submittedIds.has(item.id))
}
