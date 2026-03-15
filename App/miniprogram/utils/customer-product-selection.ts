import type { CartItemRecord } from '../../types/cart'
import type { CakeCreamOption, CakeDetail, CakeLayerId, CakeSizePlan } from '../../types/product'
import { createCartItem, markImmediatePurchase, upsertCartItem } from './customer-cart-state'

export interface CustomerProductSelectionState {
  layerId: CakeLayerId
  sizePlanId: string
  creamId: string
  quantity: number
}

export type CustomerProductCartMode = 'cart' | 'buy-now'

export interface ApplySelectionToCartResult {
  items: CartItemRecord[]
  activeItemId: string
}

function resolveLayerCount(cake: CakeDetail, layerId: CakeLayerId): number {
  const layerOption = cake.layerOptions.find((item) => item.id === layerId)
  if (layerOption === undefined) {
    throw new Error(`Unknown layer option "${layerId}" for cake "${cake.id}"`)
  }

  return layerOption.layers
}

function resolveDefaultSizePlan(sizePlans: CakeSizePlan[]): CakeSizePlan {
  const defaultPlan = sizePlans.find((item) => item.isDefault)
  return defaultPlan ?? sizePlans[0]
}

function resolveSelectedSizePlan(cake: CakeDetail, selection: CustomerProductSelectionState): CakeSizePlan {
  const selectableSizePlans = resolveSelectableSizePlans(cake, selection.layerId)
  const selectedPlan = selectableSizePlans.find((item) => item.id === selection.sizePlanId)
  if (selectedPlan === undefined) {
    throw new Error(`Unknown size plan "${selection.sizePlanId}" for cake "${cake.id}"`)
  }

  return selectedPlan
}

function resolveSelectedCreamOption(cake: CakeDetail, creamId: string): CakeCreamOption {
  const creamOption = cake.creamOptions.find((item) => item.id === creamId)
  if (creamOption === undefined) {
    throw new Error(`Unknown cream option "${creamId}" for cake "${cake.id}"`)
  }

  return creamOption
}

function resolveLayerLabel(cake: CakeDetail, layerId: CakeLayerId): string {
  return cake.layerOptions.find((item) => item.id === layerId)?.label ?? layerId
}

function resolveSizePlanLabel(sizePlan: CakeSizePlan): string {
  return sizePlan.label
}

function normalizeQuantity(quantity: number): number {
  if (!Number.isFinite(quantity) || quantity <= 0) {
    return 1
  }

  return Math.floor(quantity)
}

export function resolveSelectableSizePlans(cake: CakeDetail, layerId: CakeLayerId): CakeSizePlan[] {
  const layerCount = resolveLayerCount(cake, layerId)
  const sizePlans = cake.sizePlans.filter((item) => item.layers === layerCount)
  if (sizePlans.length === 0) {
    throw new Error(`Cake "${cake.id}" does not provide size plans for layer "${layerId}"`)
  }

  return sizePlans
}

export function buildDefaultSelection(cake: CakeDetail): CustomerProductSelectionState {
  const defaultLayer = cake.layerOptions[0]
  const defaultCream = cake.creamOptions.find((item) => item.isDefault) ?? cake.creamOptions[0]
  if (defaultLayer === undefined || defaultCream === undefined) {
    throw new Error(`Cake "${cake.id}" is missing layer or cream defaults`)
  }

  const defaultPlan = resolveDefaultSizePlan(resolveSelectableSizePlans(cake, defaultLayer.id))

  return {
    layerId: defaultLayer.id,
    sizePlanId: defaultPlan.id,
    creamId: defaultCream.id,
    quantity: 1,
  }
}

export function updateSelectionLayer(
  cake: CakeDetail,
  selection: CustomerProductSelectionState,
  layerId: CakeLayerId,
): CustomerProductSelectionState {
  const selectableSizePlans = resolveSelectableSizePlans(cake, layerId)
  const matchedPlan = selectableSizePlans.find((item) => item.id === selection.sizePlanId)

  return {
    ...selection,
    layerId,
    sizePlanId: (matchedPlan ?? resolveDefaultSizePlan(selectableSizePlans)).id,
  }
}

export function buildCartItemFromSelection(cake: CakeDetail, selection: CustomerProductSelectionState): CartItemRecord {
  const sizePlan = resolveSelectedSizePlan(cake, selection)
  const creamOption = resolveSelectedCreamOption(cake, selection.creamId)
  const quantity = normalizeQuantity(selection.quantity)
  const unitPrice = sizePlan.price + creamOption.priceDelta

  return createCartItem({
    productId: cake.id,
    productName: cake.title,
    coverImage: cake.coverImage,
    specLabel: [resolveLayerLabel(cake, selection.layerId), resolveSizePlanLabel(sizePlan)].join(' / '),
    creamLabel: creamOption.label,
    quantity,
    layerId: selection.layerId,
    sizePlanId: sizePlan.id,
    creamId: creamOption.id,
    unitPrice,
  })
}

export function applySelectionToCart(
  items: CartItemRecord[],
  cake: CakeDetail,
  selection: CustomerProductSelectionState,
  mode: CustomerProductCartMode,
): ApplySelectionToCartResult {
  const nextItem = buildCartItemFromSelection(cake, selection)
  const mergedItems = upsertCartItem(items, nextItem)

  return {
    items: mode === 'buy-now' ? markImmediatePurchase(mergedItems, nextItem.id) : mergedItems,
    activeItemId: nextItem.id,
  }
}
