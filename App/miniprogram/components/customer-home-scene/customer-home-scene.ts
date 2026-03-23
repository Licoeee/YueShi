import type { CakeDetail } from '../../../types/product'
import { CUSTOMER_IMAGE_PLACEHOLDER, resolveCakeImageUrl } from '../../utils/customer-image-fallback'
import {
  buildCakeMasonryColumns,
  getCakeDetailById,
  resolveCakeFeed,
  type CakeFeedSortMode,
} from '../../utils/customer-cake-catalog'

interface CustomerHomeSortOption {
  label: string
  value: CakeFeedSortMode
}

interface CustomerHomeSceneData {
  keyword: string
  sortMode: CakeFeedSortMode
  sortOptions: CustomerHomeSortOption[]
  leftColumn: CakeDetail[]
  rightColumn: CakeDetail[]
  selectedCake: CakeDetail | null
  isSheetVisible: boolean
}

function normalizeCakeMedia(cake: CakeDetail): CakeDetail {
  return {
    ...cake,
    coverImage: resolveCakeImageUrl(cake.coverImage),
    gallery: cake.gallery.map((image) => ({
      ...image,
      url: resolveCakeImageUrl(image.url),
    })),
    detailImages: cake.detailImages.map((image) => ({
      ...image,
      url: resolveCakeImageUrl(image.url),
    })),
  }
}

function extractSearchKeyword(detail: unknown): string {
  if (typeof detail === 'string') {
    return detail
  }

  if (typeof detail === 'object' && detail !== null && 'value' in detail) {
    const value = (detail as { value?: unknown }).value
    return typeof value === 'string' ? value : ''
  }

  return ''
}

Component({
  options: {
    addGlobalClass: true,
  },

  data: {
    keyword: '',
    sortMode: 'sales-desc',
    sortOptions: [
      { label: '销量优先', value: 'sales-desc' },
      { label: '价格从低到高', value: 'price-asc' },
      { label: '价格从高到低', value: 'price-desc' },
    ],
    leftColumn: [],
    rightColumn: [],
    selectedCake: null,
    isSheetVisible: false,
  } as CustomerHomeSceneData,

  lifetimes: {
    attached(): void {
      this.syncFeed()
    },
  },

  methods: {
    syncFeed(keyword?: string): void {
      const resolvedKeyword = keyword ?? this.data.keyword
      const cakes = resolveCakeFeed({
        keyword: resolvedKeyword,
        sortMode: this.data.sortMode,
      })
      const [leftColumn, rightColumn] = buildCakeMasonryColumns(cakes.map(normalizeCakeMedia))

      this.setData({
        leftColumn,
        rightColumn,
      })
    },

    handleSearchChange(event: WechatMiniprogram.CustomEvent<{ value?: string }>): void {
      const keyword = extractSearchKeyword(event.detail)
      this.setData({
        keyword,
      })
      this.syncFeed(keyword)
    },

    handleClearSearch(): void {
      this.setData({
        keyword: '',
      })
      this.syncFeed('')
    },

    handleSortTap(event: WechatMiniprogram.BaseEvent): void {
      const sortMode = (event.currentTarget.dataset as { sortMode?: unknown }).sortMode
      if (sortMode !== 'sales-desc' && sortMode !== 'price-asc' && sortMode !== 'price-desc') {
        return
      }

      this.setData({ sortMode })
      this.syncFeed()
    },

    handleProductTap(event: WechatMiniprogram.BaseEvent): void {
      const productId = (event.currentTarget.dataset as { productId?: unknown }).productId
      if (typeof productId !== 'string' || productId.length === 0) {
        return
      }

      this.setData({
        selectedCake: normalizeCakeMedia(getCakeDetailById(productId)),
        isSheetVisible: true,
      })
    },

    handleCardImageError(event: WechatMiniprogram.BaseEvent): void {
      const productId = (event.currentTarget.dataset as { productId?: unknown }).productId
      if (typeof productId !== 'string' || productId.length === 0) {
        return
      }

      let hasChanged = false
      const patchColumn = (column: CakeDetail[]): CakeDetail[] =>
        column.map((cake) => {
          if (cake.id !== productId) {
            return cake
          }

          if (cake.coverImage === CUSTOMER_IMAGE_PLACEHOLDER) {
            return cake
          }

          hasChanged = true
          return {
            ...cake,
            coverImage: CUSTOMER_IMAGE_PLACEHOLDER,
          }
        })

      const nextLeftColumn = patchColumn(this.data.leftColumn)
      const nextRightColumn = patchColumn(this.data.rightColumn)
      if (!hasChanged) {
        return
      }

      this.setData({
        leftColumn: nextLeftColumn,
        rightColumn: nextRightColumn,
      })
    },

    handleSheetClose(): void {
      this.setData({ isSheetVisible: false })
    },

    handleSheetLift(): void {
      const selectedCake = this.data.selectedCake
      if (selectedCake === null) {
        return
      }

      wx.navigateTo({
        url: `/pages/customer/product-detail/product-detail?productId=${selectedCake.id}`,
      })
    },
  },
})
