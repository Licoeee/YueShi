import type { RoleType } from '../../../types/role'
import type { RoleSceneActionDetail } from '../../utils/role-page-scene-actions'
import { getRolePageScene, type RolePageScene } from '../../utils/role-page-scenes'

interface RoleSwitchOption {
  role: RoleType
  label: string
  note: string
}

type RolePageSceneRenderMode =
  | 'placeholder'
  | 'customer-home'
  | 'customer-cart'
  | 'customer-orders'
  | 'customer-profile'
  | 'merchant-products'
  | 'merchant-orders'
  | 'merchant-inventory'
  | 'merchant-account-book'
  | 'merchant-profile'

interface RolePageSceneData {
  scene: RolePageScene | null
  renderMode: RolePageSceneRenderMode
  mountedMerchantProducts: boolean
  mountedMerchantOrders: boolean
  mountedMerchantInventory: boolean
  mountedMerchantAccountBook: boolean
  mountedMerchantProfile: boolean
}

function buildMerchantMountPatch(
  renderMode: RolePageSceneRenderMode,
  data: RolePageSceneData,
): Partial<RolePageSceneData> {
  const patch: Partial<RolePageSceneData> = {}

  if (renderMode === 'merchant-products' && !data.mountedMerchantProducts) {
    patch.mountedMerchantProducts = true
  }

  if (renderMode === 'merchant-orders' && !data.mountedMerchantOrders) {
    patch.mountedMerchantOrders = true
  }

  if (renderMode === 'merchant-inventory' && !data.mountedMerchantInventory) {
    patch.mountedMerchantInventory = true
  }

  if (renderMode === 'merchant-account-book' && !data.mountedMerchantAccountBook) {
    patch.mountedMerchantAccountBook = true
  }

  if (renderMode === 'merchant-profile' && !data.mountedMerchantProfile) {
    patch.mountedMerchantProfile = true
  }

  return patch
}

function parseRoleType(rawValue: unknown): RoleType | null {
  if (rawValue === 'admin' || rawValue === 'merchant' || rawValue === 'customer') {
    return rawValue
  }

  return null
}

Component({
  options: {
    addGlobalClass: true,
  },

  properties: {
    scenePath: {
      type: String,
      value: '',
    },
    activeRole: {
      type: String,
      value: '',
    },
    isPreviewMode: {
      type: Boolean,
      value: false,
    },
    canBackToAdmin: {
      type: Boolean,
      value: false,
    },
    cartRefreshTick: {
      type: Number,
      value: 0,
    },
    roleSwitchOptions: {
      type: Array,
      value: [],
    },
  },

  data: {
    scene: null,
    renderMode: 'placeholder',
    mountedMerchantProducts: false,
    mountedMerchantOrders: false,
    mountedMerchantInventory: false,
    mountedMerchantAccountBook: false,
    mountedMerchantProfile: false,
  } as RolePageSceneData,

  observers: {
    scenePath(): void {
      this.syncScene()
    },
  },

  lifetimes: {
    attached(): void {
      this.syncScene()
    },
  },

  methods: {
    syncScene(): void {
      const scenePath = this.properties.scenePath
      if (typeof scenePath !== 'string' || scenePath.length === 0) {
        if (this.data.scene !== null) {
          this.setData({
            scene: null,
            renderMode: 'placeholder',
          })
        }
        return
      }

      const nextScene = getRolePageScene(scenePath)
      const renderMode: RolePageSceneRenderMode =
        nextScene.path === '/pages/customer/home/home'
          ? 'customer-home'
          : nextScene.path === '/pages/customer/cart/cart'
            ? 'customer-cart'
            : nextScene.path === '/pages/customer/orders/orders'
              ? 'customer-orders'
            : nextScene.path === '/pages/customer/profile/profile'
              ? 'customer-profile'
            : nextScene.path === '/pages/merchant/products/products'
              ? 'merchant-products'
            : nextScene.path === '/pages/merchant/orders/orders'
              ? 'merchant-orders'
            : nextScene.path === '/pages/merchant/inventory/inventory'
              ? 'merchant-inventory'
            : nextScene.path === '/pages/merchant/account-book/account-book'
              ? 'merchant-account-book'
            : nextScene.path === '/pages/merchant/profile/profile'
              ? 'merchant-profile'
            : 'placeholder'

      const mountPatch = buildMerchantMountPatch(renderMode, this.data)
      if (
        this.data.scene?.path === nextScene.path &&
        this.data.renderMode === renderMode &&
        Object.keys(mountPatch).length === 0
      ) {
        return
      }

      this.setData({
        scene: nextScene,
        renderMode,
        ...mountPatch,
      })
    },

    getRoleSwitchOptions(): RoleSwitchOption[] {
      return Array.isArray(this.properties.roleSwitchOptions)
        ? (this.properties.roleSwitchOptions as RoleSwitchOption[])
        : []
    },

    handleRoleSwitchTap(event: WechatMiniprogram.BaseEvent): void {
      const targetRole = parseRoleType((event.currentTarget.dataset as { role?: unknown }).role)
      if (targetRole === null) {
        return
      }

      this.triggerEvent('sceneaction', {
        action: 'switch-role',
        role: targetRole,
      })
    },

    handlePreviewReturnTap(): void {
      this.triggerEvent('sceneaction', {
        action: 'preview-return',
      })
    },

    handleChildSceneAction(event: WechatMiniprogram.CustomEvent<RoleSceneActionDetail>): void {
      this.triggerEvent('sceneaction', event.detail, {
        bubbles: true,
        composed: true,
      })
    },
  },
})
