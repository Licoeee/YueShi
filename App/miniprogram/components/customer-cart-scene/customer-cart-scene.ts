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

interface CustomerCartSceneData {
  items: CustomerCartDisplayItem[]
  checkedCount: number
  checkedAmount: number
  checkedAmountText: string
  checkedAmountSizeClass: string
  canCheckout: boolean
  allChecked: boolean
}

function formatCheckedAmount(amount: number): string {
  return String(amount)
}

function resolveCheckedAmountSizeClass(amountText: string): string {
  const digitCount = amountText.replace(/\D/g, '').length

  if (digitCount >= 5) {
    return 'customer-cart-scene__summary-price-value--compact'
  }

  if (digitCount >= 4) {
    return 'customer-cart-scene__summary-price-value--tight'
  }

  return ''
}

Component({
  options: {
    addGlobalClass: true,
  },

  data: {
    items: [],
    checkedCount: 0,
    checkedAmount: 0,
    checkedAmountText: '0',
    checkedAmountSizeClass: '',
    canCheckout: false,
    allChecked: false,
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
      const checkedAmountText = formatCheckedAmount(checkoutState.totalAmount)

      this.setData({
        items: cartItems.map((item) => ({
          ...item,
          specLabel: buildCheckoutItemFromCartItem(item).specLabel,
          creamLabel: buildCheckoutItemFromCartItem(item).creamLabel,
          coverImageUrl: resolveCakeImageUrl(item.coverImage),
        })),
        checkedCount: checkoutState.items.length,
        checkedAmount: checkoutState.totalAmount,
        checkedAmountText,
        checkedAmountSizeClass: resolveCheckedAmountSizeClass(checkedAmountText),
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
