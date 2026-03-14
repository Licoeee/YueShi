import type { CartItemRecord } from '../../../types/cart'
import { loadStoredCustomerCart } from '../../utils/customer-cart-storage'

interface CustomerCartSceneData {
  items: CartItemRecord[]
  checkedCount: number
}

Component({
  options: {
    addGlobalClass: true,
  },

  data: {
    items: [],
    checkedCount: 0,
  } as CustomerCartSceneData,

  lifetimes: {
    attached(): void {
      this.syncCart()
    },
  },

  pageLifetimes: {
    show(): void {
      this.syncCart()
    },
  },

  methods: {
    syncCart(): void {
      const items = loadStoredCustomerCart()

      this.setData({
        items,
        checkedCount: items.filter((item) => item.checked).length,
      })
    },
  },
})
