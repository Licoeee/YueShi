import type { RoleType } from '../../../../types/role'
import {
  parseRoleType,
  type RoleSceneActionDetail,
  switchPreviewRole,
} from '../../../utils/role-page-scene-actions'
import {
  buildRolePageSceneSwitchPatch,
  type RolePageSceneSwitchState,
  type RolePageSceneTabChangeDetail,
} from '../../../utils/role-page-scene-switch'
import { buildRolePageDataPatch, buildRolePageState } from '../../../utils/role-page-runtime-state'

interface RoleSwitchOption {
  role: RoleType
  label: string
  note: string
}

interface AdminOverviewPageData extends RolePageSceneSwitchState {
  activeRole: RoleType
  roleSwitchOptions: RoleSwitchOption[]
  isPreviewMode: boolean
}

Page<
  AdminOverviewPageData,
  {
    onShow(): void
    handleTabChange(event: WechatMiniprogram.CustomEvent<RolePageSceneTabChangeDetail>): void
    handleSceneAction(event: WechatMiniprogram.CustomEvent<RoleSceneActionDetail>): void
    switchToRole(targetRole: RoleType): void
  }
>({
  data: {
    activeRole: 'admin',
    scenePath: '/pages/admin/overview/overview',
    sceneDirection: 'none',
    sceneMotionTick: 0,
    roleSwitchOptions: [
      { role: 'admin', label: '管理员视角', note: '审核与巡检入口' },
      { role: 'merchant', label: '商家视角', note: '订单与商品工作台' },
      { role: 'customer', label: '顾客视角', note: '选购与订单入口' },
    ],
    isPreviewMode: false,
  },

  onShow() {
    const nextState = buildRolePageState(getApp<IAppOption>().globalData.roleSession, 'admin')
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
    if (event.detail.action !== 'switch-role') {
      return
    }

    const targetRole = parseRoleType(event.detail.role)
    if (targetRole === null) {
      return
    }

    this.switchToRole(targetRole)
  },

  switchToRole(targetRole) {
    switchPreviewRole(targetRole)
  },
})
