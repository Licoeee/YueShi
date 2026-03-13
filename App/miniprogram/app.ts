import { bootstrapRoleSession } from './utils/role-bootstrap'

function appendLaunchLog(): void {
  const logs = wx.getStorageSync('logs') || []
  logs.unshift(Date.now())
  wx.setStorageSync('logs', logs)
}

App<IAppOption>({
  globalData: {},

  onLaunch() {
    appendLaunchLog()

    void bootstrapRoleSession(this)
      .then((): void => {
        return
      })
      .catch((error: unknown): void => {
        console.warn('[role-bootstrap] 启动期角色预取失败', error)
      })
  },
})
