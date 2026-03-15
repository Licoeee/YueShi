import type { RoleType } from '../../../../types/role'
import { type RoleSceneActionDetail, returnToAdminPreview } from '../../../utils/role-page-scene-actions'
import { loadStoredCustomerCart, saveStoredCustomerCart } from '../../../utils/customer-cart-storage'
import { removeCartItem } from '../../../utils/customer-cart-state'
import {
  buildRolePageSceneSwitchPatch,
  type RolePageSceneSwitchState,
  type RolePageSceneTabChangeDetail,
} from '../../../utils/role-page-scene-switch'
import { buildPreviewableRolePageState, buildRolePageDataPatch } from '../../../utils/role-page-runtime-state'

interface CustomerOrdersPageData extends RolePageSceneSwitchState {
  activeRole: RoleType
  canBackToAdmin: boolean
  isPreviewMode: boolean
  deleteDialogVisible: boolean
  pendingDeleteItemId: string
  cartRefreshTick: number
}

Page<
  CustomerOrdersPageData,
  {
    onShow(): void
    handleTabChange(event: WechatMiniprogram.CustomEvent<RolePageSceneTabChangeDetail>): void
    handleSceneAction(event: WechatMiniprogram.CustomEvent<RoleSceneActionDetail>): void
    handleBackToAdmin(): void
    handleCloseDeleteDialog(): void
    handleConfirmDelete(): void
  }
>({
  data: {
    activeRole: 'customer',
    scenePath: '/pages/customer/orders/orders',
    sceneDirection: 'none',
    sceneMotionTick: 0,
    canBackToAdmin: false,
    isPreviewMode: false,
    deleteDialogVisible: false,
    pendingDeleteItemId: '',
    cartRefreshTick: 0,
  },

  onShow() {
    const nextState = buildPreviewableRolePageState(getApp<IAppOption>().globalData.roleSession, 'customer')
    const patch = buildRolePageDataPatch(this.data, nextState)
    if (patch !== null) {
      this.setData(patch)
    }
  },

  handleTabChange(event) {
    const patch = buildRolePageSceneSwitchPatch(this.data, event.detail)
    if (patch !== null) {
      this.setData(patch)
    }
  },

  handleSceneAction(event) {
    if (event.detail.action === 'preview-return') {
      this.handleBackToAdmin()
      return
    }

    if (event.detail.action === 'request-cart-delete' && typeof event.detail.itemId === 'string') {
      this.setData({
        deleteDialogVisible: true,
        pendingDeleteItemId: event.detail.itemId,
      })
    }
  },

  handleBackToAdmin() {
    returnToAdminPreview()
  },

  handleCloseDeleteDialog() {
    this.setData({
      deleteDialogVisible: false,
      pendingDeleteItemId: '',
    })
  },

  handleConfirmDelete() {
    const itemId = this.data.pendingDeleteItemId
    if (itemId.length === 0) {
      this.handleCloseDeleteDialog()
      return
    }

    saveStoredCustomerCart(removeCartItem(loadStoredCustomerCart(), itemId))
    this.setData({
      deleteDialogVisible: false,
      pendingDeleteItemId: '',
      cartRefreshTick: this.data.cartRefreshTick + 1,
    })
  },
})
