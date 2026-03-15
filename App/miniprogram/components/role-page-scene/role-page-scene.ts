import type { RoleType } from '../../../types/role'
import { getRolePageScene, type RolePageScene } from '../../utils/role-page-scenes'

interface RoleSwitchOption {
  role: RoleType
  label: string
  note: string
}

type RolePageSceneRenderMode = 'placeholder' | 'customer-home' | 'customer-cart' | 'customer-orders' | 'customer-profile'

interface RolePageSceneData {
  scene: RolePageScene | null
  renderMode: RolePageSceneRenderMode
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
    roleSwitchOptions: {
      type: Array,
      value: [],
    },
  },

  data: {
    scene: null,
    renderMode: 'placeholder',
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
          this.setData({ scene: null })
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
            : 'placeholder'

      if (this.data.scene?.path === nextScene.path && this.data.renderMode === renderMode) {
        return
      }

      this.setData({
        scene: nextScene,
        renderMode,
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
  },
})
