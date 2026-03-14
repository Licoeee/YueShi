import type { CartItemRecord } from '../../../types/cart'
import { buildCheckoutItemFromCartItem, buildCheckoutState } from '../../utils/customer-checkout-state'
import { loadStoredCustomerCart } from '../../utils/customer-cart-storage'
import { saveStoredCustomerCart } from '../../utils/customer-cart-storage'
import { toggleCartItemChecked } from '../../utils/customer-cart-state'

interface CustomerCartDisplayItem extends CartItemRecord {
  specLabel: string
}

interface CustomerCartSceneData {
  items: CustomerCartDisplayItem[]
  checkedCount: number
  checkedAmount: number
  canCheckout: boolean
}

Component({
  options: {
    addGlobalClass: true,
  },

  data: {
    items: [],
    checkedCount: 0,
    checkedAmount: 0,
    canCheckout: false,
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
      const cartItems = loadStoredCustomerCart()
      const checkoutState = buildCheckoutState(cartItems)

      this.setData({
        items: cartItems.map((item) => ({
          ...item,
          specLabel: buildCheckoutItemFromCartItem(item).specLabel,
        })),
        checkedCount: checkoutState.items.length,
        checkedAmount: checkoutState.totalAmount,
        canCheckout: checkoutState.items.length > 0,
      })
    },

    handleItemCheckChange(event: WechatMiniprogram.BaseEvent): void {
      const itemId = (event.currentTarget.dataset as { itemId?: unknown }).itemId
      if (typeof itemId !== 'string' || itemId.length === 0) {
        return
      }

      const cartItems = loadStoredCustomerCart()
      saveStoredCustomerCart(toggleCartItemChecked(cartItems, itemId))
      this.syncCart()
    },

    handleCheckout(): void {
      if (!this.data.canCheckout) {
        return
      }

      wx.navigateTo({
        url: '/pages/customer/checkout/checkout',
      })
    },
  },
})
