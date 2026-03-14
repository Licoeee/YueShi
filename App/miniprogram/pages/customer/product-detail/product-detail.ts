import type { CakeDetail, CakeSizePlan } from '../../../../types/product'
import {
  applySelectionToCart,
  buildCartItemFromSelection,
  buildDefaultSelection,
  resolveSelectableSizePlans,
  updateSelectionLayer,
  type CustomerProductSelectionState,
} from '../../../utils/customer-product-selection'
import { getCakeDetailById } from '../../../utils/customer-cake-catalog'
import { resolveCakeImageUrl } from '../../../utils/customer-image-fallback'
import { loadStoredCustomerCart, saveStoredCustomerCart } from '../../../utils/customer-cart-storage'

interface ProductDetailPageData {
  cake: CakeDetail | null
  selection: CustomerProductSelectionState | null
  selectableSizePlans: CakeSizePlan[]
  currentPrice: number
}

interface StringValueDetail {
  layerId?: unknown
  sizePlanId?: unknown
  creamId?: unknown
  current?: unknown
}

function extractDetailValue(detail: unknown, key: keyof StringValueDetail): string | null {
  if (typeof detail !== 'object' || detail === null) {
    return null
  }

  const value = (detail as StringValueDetail)[key]
  return typeof value === 'string' ? value : null
}

function buildSelectionPatch(
  cake: CakeDetail,
  selection: CustomerProductSelectionState,
): Pick<ProductDetailPageData, 'selection' | 'selectableSizePlans' | 'currentPrice'> {
  return {
    selection,
    selectableSizePlans: resolveSelectableSizePlans(cake, selection.layerId),
    currentPrice: buildCartItemFromSelection(cake, selection).unitPrice,
  }
}

Page<
  ProductDetailPageData,
  {
    onLoad(query: Record<string, string | undefined>): void
    handleLayerChange(event: WechatMiniprogram.CustomEvent<StringValueDetail>): void
    handleSizePlanChange(event: WechatMiniprogram.CustomEvent<StringValueDetail>): void
    handleCreamChange(event: WechatMiniprogram.CustomEvent<StringValueDetail>): void
    handlePreviewImage(event: WechatMiniprogram.CustomEvent<StringValueDetail>): void
    handleGoHome(): void
    handleGoCart(): void
    handleAddToCart(): void
    handleBuyNow(): void
  }
>({
  data: {
    cake: null,
    selection: null,
    selectableSizePlans: [],
    currentPrice: 0,
  },

  onLoad(query) {
    const productId = typeof query.productId === 'string' ? query.productId : ''
    if (productId.length === 0) {
      wx.showToast({ title: '商品不存在', icon: 'none' })
      wx.redirectTo({ url: '/pages/customer/home/home' })
      return
    }

    let cake: CakeDetail

    try {
      cake = getCakeDetailById(productId)
    } catch {
      wx.showToast({ title: '商品不存在', icon: 'none' })
      wx.redirectTo({ url: '/pages/customer/home/home' })
      return
    }

    const selection = buildDefaultSelection(cake)

    this.setData({
      cake,
      ...buildSelectionPatch(cake, selection),
    })

    wx.setNavigationBarTitle({ title: cake.title })
  },

  handleLayerChange(event) {
    const cake = this.data.cake
    const selection = this.data.selection
    const layerId = extractDetailValue(event.detail, 'layerId')
    if (cake === null || selection === null || (layerId !== 'single' && layerId !== 'double' && layerId !== 'triple')) {
      return
    }

    this.setData(buildSelectionPatch(cake, updateSelectionLayer(cake, selection, layerId)))
  },

  handleSizePlanChange(event) {
    const cake = this.data.cake
    const selection = this.data.selection
    const sizePlanId = extractDetailValue(event.detail, 'sizePlanId')
    if (cake === null || selection === null || sizePlanId === null) {
      return
    }

    const selectableSizePlans = resolveSelectableSizePlans(cake, selection.layerId)
    if (!selectableSizePlans.some((item) => item.id === sizePlanId)) {
      return
    }

    this.setData(buildSelectionPatch(cake, { ...selection, sizePlanId }))
  },

  handleCreamChange(event) {
    const cake = this.data.cake
    const selection = this.data.selection
    const creamId = extractDetailValue(event.detail, 'creamId')
    if (cake === null || selection === null || creamId === null) {
      return
    }

    if (!cake.creamOptions.some((item) => item.id === creamId)) {
      return
    }

    this.setData(buildSelectionPatch(cake, { ...selection, creamId }))
  },

  handlePreviewImage(event) {
    const cake = this.data.cake
    const current = extractDetailValue(event.detail, 'current')
    if (cake === null || current === null) {
      return
    }

    wx.previewImage({
      current,
      urls: [resolveCakeImageUrl(cake.coverImage), ...cake.detailImages.map((item) => resolveCakeImageUrl(item.url))],
    })
  },

  handleGoHome() {
    wx.redirectTo({ url: '/pages/customer/home/home' })
  },

  handleGoCart() {
    wx.redirectTo({ url: '/pages/customer/cart/cart' })
  },

  handleAddToCart() {
    const cake = this.data.cake
    const selection = this.data.selection
    if (cake === null || selection === null) {
      return
    }

    const cartSnapshot = loadStoredCustomerCart()
    const result = applySelectionToCart(cartSnapshot, cake, selection, 'cart')
    saveStoredCustomerCart(result.items)

    wx.showToast({
      title: '已加入购物车',
      icon: 'success',
    })
  },

  handleBuyNow() {
    const cake = this.data.cake
    const selection = this.data.selection
    if (cake === null || selection === null) {
      return
    }

    const cartSnapshot = loadStoredCustomerCart()
    const result = applySelectionToCart(cartSnapshot, cake, selection, 'buy-now')
    saveStoredCustomerCart(result.items)

    wx.redirectTo({ url: '/pages/customer/checkout/checkout' })
  },
})
