import type { RoleSession } from '../../types/role'
import {
  OPENID_IDENTITY_STORAGE_KEY,
  bootstrapOpenId,
  type CachedUserIdentity,
} from './openid-bootstrap'
import {
  createDefaultRoleSession,
  createRoleSessionFromResolvedRolePayload,
  findExplicitRoleSessionByOpenIdWithAdapter,
  parseResolvedRolePayload,
  type RoleDirectoryAdapter,
} from './role-routing'

export const RESOLVE_USER_ROLE_CLOUD_FUNCTION_NAME = 'resolve-user-role'

export interface RoleBootstrapApp {
  globalData: IAppOption['globalData']
}

export interface RoleBootstrapAdapter extends RoleDirectoryAdapter {
  bootstrapOpenId(): Promise<CachedUserIdentity | null>
  setStorageSync(key: string, value: CachedUserIdentity): void
  callFunction(name: string): Promise<unknown>
  now(): number
}

let isCloudReady = false

function isValidOpenId(openId: string | undefined): openId is string {
  return typeof openId === 'string' && openId.trim().length > 0
}

function ensureCloudReady(): void {
  if (isCloudReady) {
    return
  }

  if (typeof wx.cloud !== 'object' || wx.cloud === null) {
    throw new Error('wx.cloud 不可用，无法解析正式角色身份')
  }

  wx.cloud.init({
    traceUser: true,
  })
  isCloudReady = true
}

function applyIdentity(
  app: RoleBootstrapApp,
  adapter: Pick<RoleBootstrapAdapter, 'setStorageSync' | 'now'>,
  openId: string,
): void {
  const identity: CachedUserIdentity = {
    openId,
    fetchedAt: adapter.now(),
  }

  app.globalData.openId = openId
  app.globalData.userIdentity = identity
  adapter.setStorageSync(OPENID_IDENTITY_STORAGE_KEY, identity)
}

function applyRoleSession(app: RoleBootstrapApp, roleSession: RoleSession): RoleSession {
  app.globalData.roleSession = roleSession

  return roleSession
}

function getRuntimeAdapter(): RoleBootstrapAdapter {
  return {
    getStorageSync(key: string): unknown {
      return wx.getStorageSync(key)
    },
    setStorageSync(key: string, value: CachedUserIdentity): void {
      wx.setStorageSync(key, value)
    },
    bootstrapOpenId(): Promise<CachedUserIdentity | null> {
      return bootstrapOpenId()
    },
    async callFunction(name: string): Promise<unknown> {
      ensureCloudReady()

      return new Promise<unknown>((resolve, reject): void => {
        wx.cloud.callFunction({
          name,
          success(response): void {
            resolve(response.result)
          },
          fail(error): void {
            reject(error)
          },
        })
      })
    },
    now(): number {
      return Date.now()
    },
  }
}

async function resolveRoleSessionTask(app: RoleBootstrapApp, adapter: RoleBootstrapAdapter): Promise<RoleSession> {
  let currentOpenId = isValidOpenId(app.globalData.openId) ? app.globalData.openId : undefined

  if (!isValidOpenId(currentOpenId)) {
    const identity = await adapter.bootstrapOpenId()
    if (identity !== null) {
      applyIdentity(app, adapter, identity.openId)
      currentOpenId = identity.openId
    }
  }

  if (isValidOpenId(currentOpenId)) {
    const localOverrideSession = findExplicitRoleSessionByOpenIdWithAdapter(currentOpenId, adapter)
    if (localOverrideSession !== null) {
      return applyRoleSession(app, localOverrideSession)
    }
  }

  const resolvedPayload = parseResolvedRolePayload(await adapter.callFunction(RESOLVE_USER_ROLE_CLOUD_FUNCTION_NAME))
  if (resolvedPayload !== null) {
    applyIdentity(app, adapter, resolvedPayload.openId)

    const localOverrideSession = findExplicitRoleSessionByOpenIdWithAdapter(resolvedPayload.openId, adapter)
    if (localOverrideSession !== null) {
      return applyRoleSession(app, localOverrideSession)
    }

    return applyRoleSession(app, createRoleSessionFromResolvedRolePayload(resolvedPayload))
  }

  return applyRoleSession(app, createDefaultRoleSession())
}

export function bootstrapRoleSessionWithAdapter(
  app: RoleBootstrapApp,
  adapter: RoleBootstrapAdapter,
): Promise<RoleSession> {
  if (app.globalData.roleSession !== undefined) {
    return Promise.resolve(app.globalData.roleSession)
  }

  if (app.globalData.roleSessionPromise !== undefined) {
    return app.globalData.roleSessionPromise
  }

  const task = resolveRoleSessionTask(app, adapter)
    .catch((error: unknown): RoleSession => {
      console.warn('[role-bootstrap] 正式角色解析失败，回退顾客角色', error)

      return applyRoleSession(app, createDefaultRoleSession())
    })
    .finally((): void => {
      app.globalData.roleSessionPromise = undefined
    })

  app.globalData.roleSessionPromise = task

  return task
}

export function bootstrapRoleSession(app: RoleBootstrapApp): Promise<RoleSession> {
  return bootstrapRoleSessionWithAdapter(app, getRuntimeAdapter())
}
