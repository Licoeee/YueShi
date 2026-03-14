import type { CakeDetail } from '../../../types/product'
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
    syncFeed(): void {
      const cakes = resolveCakeFeed({
        keyword: this.data.keyword,
        sortMode: this.data.sortMode,
      })
      const [leftColumn, rightColumn] = buildCakeMasonryColumns(cakes)

      this.setData({
        leftColumn,
        rightColumn,
      })
    },

    handleSearchChange(event: WechatMiniprogram.CustomEvent<unknown>): void {
      this.setData({
        keyword: extractSearchKeyword(event.detail),
      })
      this.syncFeed()
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
        selectedCake: getCakeDetailById(productId),
        isSheetVisible: true,
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
