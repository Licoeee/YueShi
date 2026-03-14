import type { CakeDetail } from '../../../types/product'
import { resolveCakeImageUrl } from '../../utils/customer-image-fallback'
import { shouldLiftToDetail } from '../../utils/customer-sheet-gesture'

interface CustomerProductSheetData {
  imageUrls: string[]
  touchStartY: number
}

function isCakeDetail(value: unknown): value is CakeDetail {
  return typeof value === 'object' && value !== null && 'id' in value && 'title' in value
}

Component({
  options: {
    addGlobalClass: true,
  },

  properties: {
    visible: {
      type: Boolean,
      value: false,
    },
    cake: {
      type: Object,
      value: undefined,
    },
  },

  data: {
    imageUrls: [],
    touchStartY: 0,
  } as CustomerProductSheetData,

  observers: {
    cake(nextCake: unknown): void {
      if (!isCakeDetail(nextCake)) {
        this.setData({ imageUrls: [] })
        return
      }

      this.setData({
        imageUrls: nextCake.detailImages.map((image) => resolveCakeImageUrl(image.url)),
      })
    },
  },

  methods: {
    handleTouchStart(event: WechatMiniprogram.TouchEvent): void {
      const startY = event.touches[0]?.clientY ?? 0
      this.setData({ touchStartY: startY })
    },

    handleTouchEnd(event: WechatMiniprogram.TouchEvent): void {
      const endY = event.changedTouches[0]?.clientY ?? this.data.touchStartY

      if (shouldLiftToDetail({ startY: this.data.touchStartY, endY, threshold: 72 })) {
        this.triggerEvent('lift')
      }
    },

    handleMaskTap(): void {
      this.triggerEvent('close')
    },

    handlePreviewImage(event: WechatMiniprogram.BaseEvent): void {
      const imageUrl = (event.currentTarget.dataset as { imageUrl?: unknown }).imageUrl
      if (typeof imageUrl !== 'string' || imageUrl.length === 0 || this.data.imageUrls.length === 0) {
        return
      }

      wx.previewImage({
        current: imageUrl,
        urls: this.data.imageUrls,
      })
    },
  },
})
