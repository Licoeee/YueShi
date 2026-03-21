export interface MerchantInventoryRecord {
  id: string
  itemName: string
  photoUrl: string
  costPrice: number
  productionDate: string
  shelfLifeDays: number
  expiryDate: string
  lastReminderDate: string
  createdAt: string
  updatedAt: string
}

export interface MerchantInventoryDraftInput {
  itemName: string
  photoUrl: string
  costPrice: number
  productionDate: string
  shelfLifeDays: number
}

export type MerchantExpirySubscriptionPreference = 'accepted' | 'rejected' | 'unknown'
