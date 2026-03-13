import type { RoleType } from '../../../types/role'
import { getRolePageScene, type RolePageScene } from '../../utils/role-page-scenes'

interface RoleSwitchOption {
  role: RoleType
  label: string
  note: string
}

interface RolePageSceneData {
  scene: RolePageScene | null
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
        this.setData({ scene: null })
        return
      }

      this.setData({
        scene: getRolePageScene(scenePath),
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
