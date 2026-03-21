export interface MerchantAccountBookRecord {
  id: string
  itemName: string
  photoUrl: string
  costPrice: number
  expiryDate: string
  reminderSubscribed: boolean
  lastReminderDate: string
  createdAt: string
  updatedAt: string
}

export interface MerchantAccountBookDraftInput {
  itemName: string
  photoUrl: string
  costPrice: number
  expiryDate: string
}

