import type { CartItemRecord } from '../../../types/cart'
import { buildCheckoutItemFromCartItem, buildCheckoutState } from '../../utils/customer-checkout-state'
import { loadStoredCustomerCart } from '../../utils/customer-cart-storage'
import { saveStoredCustomerCart } from '../../utils/customer-cart-storage'
import {
  type SwipeDirection,
  getSwipeDirection,
  resolveSwipeEndState,
  resolveSwipeOffset,
} from '../../utils/customer-cart-swipe'
import {
  areAllCartItemsChecked,
  toggleAllCartItemsChecked,
  toggleCartItemChecked,
} from '../../utils/customer-cart-state'
import { resolveCakeImageUrl } from '../../utils/customer-image-fallback'
import { runCustomerAuthorizedAction } from '../../utils/customer-action-gate'

interface CustomerCartDisplayItem extends CartItemRecord {
  coverImageUrl: string
  swipeOffset: number
  swipeOpen: boolean
  swipeStyle: string
}

interface CustomerCartSceneData {
  items: CustomerCartDisplayItem[]
  checkedCount: number
  checkedAmount: number
  checkedAmountText: string
  checkedAmountSizeClass: string
  canCheckout: boolean
  allChecked: boolean
  deleteActionWidthPx: number
}

interface SwipeRuntimeState {
  activeItemId: string
  startX: number
  startY: number
  startOffset: number
  direction: SwipeDirection
}

const DELETE_ACTION_WIDTH_RPX = 184
const SWIPE_TRANSITION = 'transform 220ms cubic-bezier(0.18, 0.89, 0.32, 1)'

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

function buildSwipeStyle(offset: number, animated: boolean): string {
  const transition = animated ? SWIPE_TRANSITION : 'none'
  return `transform: translate3d(-${offset}px, 0, 0); transition: ${transition};`
}

function createSwipeDisplayState(offset = 0, animated = true): Pick<CustomerCartDisplayItem, 'swipeOffset' | 'swipeOpen' | 'swipeStyle'> {
  return {
    swipeOffset: offset,
    swipeOpen: offset > 0,
    swipeStyle: buildSwipeStyle(offset, animated),
  }
}

function resolveDeleteActionWidthPx(): number {
  const runtimeWx = wx as typeof wx & {
    getWindowInfo?: () => { windowWidth: number }
  }
  const windowWidth =
    typeof runtimeWx.getWindowInfo === 'function'
      ? runtimeWx.getWindowInfo().windowWidth
      : wx.getSystemInfoSync().windowWidth

  return Math.round((windowWidth * DELETE_ACTION_WIDTH_RPX) / 750)
}

Component({
  options: {
    addGlobalClass: true,
  },

  properties: {
    refreshTick: {
      type: Number,
      value: 0,
    },
  },

  data: {
    items: [],
    checkedCount: 0,
    checkedAmount: 0,
    checkedAmountText: '0',
    checkedAmountSizeClass: '',
    canCheckout: false,
    allChecked: false,
    deleteActionWidthPx: resolveDeleteActionWidthPx(),
  } as CustomerCartSceneData,

  observers: {
    refreshTick(): void {
      this.syncCart()
    },
  },

  lifetimes: {
    attached(): void {
      ;(this as WechatMiniprogram.Component.TrivialInstance & { swipeRuntimeState?: SwipeRuntimeState }).swipeRuntimeState =
        undefined
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
      ;(this as WechatMiniprogram.Component.TrivialInstance & { swipeRuntimeState?: SwipeRuntimeState }).swipeRuntimeState =
        undefined
      const cartItems = loadStoredCustomerCart()
      const checkoutState = buildCheckoutState(cartItems)
      const checkedAmountText = formatCheckedAmount(checkoutState.totalAmount)

      this.setData({
        items: cartItems.map((item) => ({
          ...item,
          specLabel: buildCheckoutItemFromCartItem(item).specLabel,
          creamLabel: buildCheckoutItemFromCartItem(item).creamLabel,
          coverImageUrl: resolveCakeImageUrl(item.coverImage),
          ...createSwipeDisplayState(),
        })),
        checkedCount: checkoutState.items.length,
        checkedAmount: checkoutState.totalAmount,
        checkedAmountText,
        checkedAmountSizeClass: resolveCheckedAmountSizeClass(checkedAmountText),
        canCheckout: checkoutState.items.length > 0,
        allChecked: areAllCartItemsChecked(cartItems),
      })
    },

    updateSwipeItems(targetItemId: string, offset: number, animated: boolean): void {
      const nextItems = this.data.items.map((item) => {
        const nextOffset = item.id === targetItemId ? offset : 0
        const nextSwipeState = createSwipeDisplayState(nextOffset, animated)

        if (
          item.swipeOffset === nextSwipeState.swipeOffset &&
          item.swipeOpen === nextSwipeState.swipeOpen &&
          item.swipeStyle === nextSwipeState.swipeStyle
        ) {
          return item
        }

        return {
          ...item,
          ...nextSwipeState,
        }
      })

      this.setData({ items: nextItems })
    },

    handleItemTouchStart(event: WechatMiniprogram.TouchEvent): void {
      const itemId = (event.currentTarget.dataset as { itemId?: unknown }).itemId
      const touchPoint = event.touches[0]

      if (typeof itemId !== 'string' || itemId.length === 0 || touchPoint === undefined) {
        return
      }

      const targetItem = this.data.items.find((item) => item.id === itemId)
      if (targetItem === undefined) {
        return
      }

      this.updateSwipeItems(itemId, targetItem.swipeOffset, false)

      ;(this as WechatMiniprogram.Component.TrivialInstance & { swipeRuntimeState?: SwipeRuntimeState }).swipeRuntimeState = {
        activeItemId: itemId,
        startX: touchPoint.clientX,
        startY: touchPoint.clientY,
        startOffset: targetItem.swipeOffset,
        direction: '',
      }
    },

    handleItemTouchMove(event: WechatMiniprogram.TouchEvent): void {
      const component = this as WechatMiniprogram.Component.TrivialInstance & { swipeRuntimeState?: SwipeRuntimeState }
      const runtimeState = component.swipeRuntimeState
      const itemId = (event.currentTarget.dataset as { itemId?: unknown }).itemId
      const touchPoint = event.touches[0]

      if (
        runtimeState === undefined ||
        typeof itemId !== 'string' ||
        itemId !== runtimeState.activeItemId ||
        touchPoint === undefined
      ) {
        return
      }

      const deltaX = touchPoint.clientX - runtimeState.startX
      const deltaY = touchPoint.clientY - runtimeState.startY
      const direction = runtimeState.direction || getSwipeDirection({ deltaX, deltaY })
      runtimeState.direction = direction

      if (direction !== 'horizontal') {
        return
      }

      const offset = resolveSwipeOffset({
        startOffset: runtimeState.startOffset,
        deltaX,
        actionWidth: this.data.deleteActionWidthPx,
      })

      this.updateSwipeItems(itemId, offset, false)
    },

    finalizeSwipe(itemId: string): void {
      const component = this as WechatMiniprogram.Component.TrivialInstance & { swipeRuntimeState?: SwipeRuntimeState }
      const runtimeState = component.swipeRuntimeState
      const targetItem = this.data.items.find((item) => item.id === itemId)

      if (runtimeState === undefined || targetItem === undefined) {
        component.swipeRuntimeState = undefined
        return
      }

      const endState = resolveSwipeEndState({
        startOffset: runtimeState.startOffset,
        offset: targetItem.swipeOffset,
        actionWidth: this.data.deleteActionWidthPx,
      })

      this.updateSwipeItems(itemId, endState === 'open' ? this.data.deleteActionWidthPx : 0, true)
      component.swipeRuntimeState = undefined
    },

    handleItemTouchEnd(event: WechatMiniprogram.TouchEvent): void {
      const itemId = (event.currentTarget.dataset as { itemId?: unknown }).itemId
      if (typeof itemId !== 'string' || itemId.length === 0) {
        return
      }

      this.finalizeSwipe(itemId)
    },

    handleItemTouchCancel(event: WechatMiniprogram.TouchEvent): void {
      const itemId = (event.currentTarget.dataset as { itemId?: unknown }).itemId
      if (typeof itemId !== 'string' || itemId.length === 0) {
        return
      }

      this.finalizeSwipe(itemId)
    },

    handleSwipeContentTap(event: WechatMiniprogram.BaseEvent): void {
      const itemId = (event.currentTarget.dataset as { itemId?: unknown }).itemId
      if (typeof itemId !== 'string' || itemId.length === 0) {
        return
      }

      const targetItem = this.data.items.find((item) => item.id === itemId)
      if (targetItem?.swipeOpen) {
        this.updateSwipeItems(itemId, 0, true)
      }
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

      if (!this.data.items.some((item) => item.id === itemId)) {
        return
      }

      this.triggerEvent('sceneaction', {
        action: 'request-cart-delete',
        itemId,
      }, {
        bubbles: true,
        composed: true,
      })
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
