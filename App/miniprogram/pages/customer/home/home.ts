import type { RoleType } from '../../../../types/role'
import { type RoleSceneActionDetail, returnToAdminPreview } from '../../../utils/role-page-scene-actions'
import {
  buildRolePageSceneSwitchPatch,
  type RolePageSceneSwitchState,
  type RolePageSceneTabChangeDetail,
} from '../../../utils/role-page-scene-switch'
import { buildPreviewableRolePageState, buildRolePageDataPatch } from '../../../utils/role-page-runtime-state'

interface CustomerHomePageData extends RolePageSceneSwitchState {
  activeRole: RoleType
  canBackToAdmin: boolean
  isPreviewMode: boolean
}

Page<
  CustomerHomePageData,
  {
    onShow(): void
    handleTabChange(event: WechatMiniprogram.CustomEvent<RolePageSceneTabChangeDetail>): void
    handleSceneAction(event: WechatMiniprogram.CustomEvent<RoleSceneActionDetail>): void
    handleBackToAdmin(): void
  }
>({
  data: {
    activeRole: 'customer',
    scenePath: '/pages/customer/home/home',
    sceneDirection: 'none',
    sceneMotionTick: 0,
    canBackToAdmin: false,
    isPreviewMode: false,
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
    }
  },

  handleBackToAdmin() {
    returnToAdminPreview()
  },
})
