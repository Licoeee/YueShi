import type { CakeLayerId } from '../../../types/product'

interface StringDetailEvent {
  value?: unknown
  layerId?: unknown
  sizePlanId?: unknown
  creamId?: unknown
  current?: unknown
}

function extractDetailValue(detail: unknown, key: keyof StringDetailEvent): string | null {
  if (typeof detail !== 'object' || detail === null) {
    return null
  }

  const value = (detail as StringDetailEvent)[key]
  return typeof value === 'string' ? value : null
}

function extractDatasetValue(dataset: Record<string, unknown>, key: string): string | null {
  const value = dataset[key]
  return typeof value === 'string' ? value : null
}

Component({
  options: {
    addGlobalClass: true,
  },

  properties: {
    cake: {
      type: Object,
      value: undefined,
    },
    selection: {
      type: Object,
      value: undefined,
    },
    selectableSizePlans: {
      type: Array,
      value: [],
    },
    currentPrice: {
      type: Number,
      value: 0,
    },
    homeLabel: {
      type: String,
      value: '首页',
    },
    cartLabel: {
      type: String,
      value: '购物车',
    },
    addCartLabel: {
      type: String,
      value: '加入购物车',
    },
    buyNowLabel: {
      type: String,
      value: '立即购买',
    },
  },

  methods: {
    handlePreviewImage(event: WechatMiniprogram.CustomEvent<StringDetailEvent>): void {
      const current =
        extractDatasetValue(event.currentTarget.dataset as Record<string, unknown>, 'imageUrl') ??
        extractDetailValue(event.detail, 'current')

      if (current === null) {
        return
      }

      this.triggerEvent('previewimage', { current })
    },

    handleLayerChange(event: WechatMiniprogram.BaseEvent): void {
      const layerId = extractDatasetValue(event.currentTarget.dataset as Record<string, unknown>, 'layerId')
      if (layerId !== 'single' && layerId !== 'double' && layerId !== 'triple') {
        return
      }

      this.triggerEvent('layerchange', { layerId: layerId as CakeLayerId })
    },

    handleSizePlanChange(event: WechatMiniprogram.BaseEvent): void {
      const sizePlanId = extractDatasetValue(event.currentTarget.dataset as Record<string, unknown>, 'sizePlanId')
      if (sizePlanId === null) {
        return
      }

      this.triggerEvent('sizeplanchange', { sizePlanId })
    },

    handleCreamChange(event: WechatMiniprogram.BaseEvent): void {
      const creamId = extractDatasetValue(event.currentTarget.dataset as Record<string, unknown>, 'creamId')
      if (creamId === null) {
        return
      }

      this.triggerEvent('creamchange', { creamId })
    },

    handleGoHome(): void {
      this.triggerEvent('gohome')
    },

    handleGoCart(): void {
      this.triggerEvent('gocart')
    },

    handleAddToCart(): void {
      this.triggerEvent('addtocart')
    },

    handleBuyNow(): void {
      this.triggerEvent('buynow')
    },
  },
})
