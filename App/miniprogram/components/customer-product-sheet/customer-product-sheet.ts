import type { CakeDetail } from '../../../types/product'
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
      value: null,
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
        imageUrls: nextCake.detailImages.map((image) => image.url),
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
  },
})
