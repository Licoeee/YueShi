import type { ProductSpecSize } from './product'
import type { MerchantCreamType } from './merchant-product'

export type MerchantPriceTier = 'single' | 'double' | 'triple'

export interface MerchantDefaultPriceConfigItem {
  id: string
  tier: MerchantPriceTier
  sizes: ProductSpecSize[]
  creamType: MerchantCreamType
  label: string
  basePrice: number
  builtIn: boolean
}

export interface MerchantDefaultPricingSnapshot {
  single: MerchantDefaultPriceConfigItem[]
  double: MerchantDefaultPriceConfigItem[]
  triple: MerchantDefaultPriceConfigItem[]
}

export interface MerchantDefaultPricingCustomInput {
  tier: MerchantPriceTier
  sizes: ProductSpecSize[]
  creamType: MerchantCreamType
}
