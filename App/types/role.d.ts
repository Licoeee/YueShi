export type RoleType = 'admin' | 'merchant' | 'customer'

export interface RoleOption {
  type: RoleType
  label: string
  entryPage: string
  description: string
}

export interface RoleSession {
  currentRole: RoleType
  availableRoles: RoleType[]
  isPreviewMode: boolean
  merchantName?: string
}
