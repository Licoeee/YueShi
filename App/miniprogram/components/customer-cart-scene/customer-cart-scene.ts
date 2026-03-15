import type { CartItemRecord } from '../../../types/cart'
import { buildCheckoutItemFromCartItem, buildCheckoutState } from '../../utils/customer-checkout-state'
import { loadStoredCustomerCart } from '../../utils/customer-cart-storage'
import { saveStoredCustomerCart } from '../../utils/customer-cart-storage'
import {
  areAllCartItemsChecked,
  removeCartItem,
  toggleAllCartItemsChecked,
  toggleCartItemChecked,
} from '../../utils/customer-cart-state'
import { resolveCakeImageUrl } from '../../utils/customer-image-fallback'
import { runCustomerAuthorizedAction } from '../../utils/customer-action-gate'

interface CustomerCartDisplayItem extends CartItemRecord {
  coverImageUrl: string
}

interface SwipeActionRecord {
  text: string
  className: string
  style: string
}

interface CustomerCartSceneData {
  items: CustomerCartDisplayItem[]
  checkedCount: number
  checkedAmount: number
  canCheckout: boolean
  allChecked: boolean
  deleteActions: SwipeActionRecord[]
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
    allChecked: false,
    deleteActions: [
      {
        text: '删除',
        className: 'customer-cart-scene__swipe-action',
        style:
          'background: linear-gradient(135deg, #ff8c6b 0%, #ff6b57 100%); color: #ffffff; border-radius: 24rpx 0 0 24rpx;',
      },
    ],
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
          creamLabel: buildCheckoutItemFromCartItem(item).creamLabel,
          coverImageUrl: resolveCakeImageUrl(item.coverImage),
        })),
        checkedCount: checkoutState.items.length,
        checkedAmount: checkoutState.totalAmount,
        canCheckout: checkoutState.items.length > 0,
        allChecked: areAllCartItemsChecked(cartItems),
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

    handleToggleAll(): void {
      const cartItems = loadStoredCustomerCart()
      saveStoredCustomerCart(toggleAllCartItemsChecked(cartItems, !areAllCartItemsChecked(cartItems)))
      this.syncCart()
    },

    handleSwipeAction(event: WechatMiniprogram.BaseEvent): void {
      const itemId = (event.currentTarget.dataset as { itemId?: unknown }).itemId
      if (typeof itemId !== 'string' || itemId.length === 0) {
        return
      }

      saveStoredCustomerCart(removeCartItem(loadStoredCustomerCart(), itemId))
      this.syncCart()
    },

    handleCheckout(): void {
      if (!this.data.canCheckout) {
        return
      }

      void runCustomerAuthorizedAction(async () => {
        wx.navigateTo({
          url: '/pages/customer/checkout/checkout',
        })
      }).then((allowed) => {
        if (!allowed) {
          wx.showToast({
            title: '请先完成微信登录',
            icon: 'none',
          })
        }
      })
    },
  },
})
