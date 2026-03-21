import type { ProductSpecSize } from './product'

export interface MerchantProductRecycleMeta {
  deletedAt: string
  recoverExpiresAt: string
}

export type MerchantCreamType = 'animal-cream-i' | 'dairy-cream' | 'naked-cake'
export type MerchantProductLayer =
  | '1-layer'
  | '2-layer'
  | '3-layer'
  | '4-layer'
  | '5-layer'
  | '6-layer'
  | '7-layer'
  | '8-layer'
  | '9-layer'
  | '10-layer'

export type MerchantProductPriceAdjustmentMap<T extends string> = Partial<Record<T, number>>

export interface MerchantProductRecord {
  id: string
  title: string
  description: string
  basePrice: number
  specSizes: ProductSpecSize[]
  layers: MerchantProductLayer[]
  creamTypes: MerchantCreamType[]
  creamType: MerchantCreamType
  sizePriceAdjustments: MerchantProductPriceAdjustmentMap<ProductSpecSize>
  layerPriceAdjustments: MerchantProductPriceAdjustmentMap<MerchantProductLayer>
  creamPriceAdjustments: MerchantProductPriceAdjustmentMap<MerchantCreamType>
  imageUrls: string[]
  coverImage: string
  createdAt: string
  updatedAt: string
  recycleMeta?: MerchantProductRecycleMeta
}

export interface MerchantProductDraftInput {
  title: string
  description: string
  basePrice: number
  specSizes: ProductSpecSize[]
  layers: MerchantProductLayer[]
  creamTypes: MerchantCreamType[]
  creamType: MerchantCreamType
  sizePriceAdjustments: MerchantProductPriceAdjustmentMap<ProductSpecSize>
  layerPriceAdjustments: MerchantProductPriceAdjustmentMap<MerchantProductLayer>
  creamPriceAdjustments: MerchantProductPriceAdjustmentMap<MerchantCreamType>
  imageUrls: string[]
  coverImage: string
}

export interface MerchantProductBatchEditInput {
  productIds: string[]
  basePrice?: number
  unifiedPrice?: number
  specSizes?: ProductSpecSize[]
  layers?: MerchantProductLayer[]
  creamTypes?: MerchantCreamType[]
  creamType?: MerchantCreamType
  sizePriceAdjustments?: MerchantProductPriceAdjustmentMap<ProductSpecSize>
  layerPriceAdjustments?: MerchantProductPriceAdjustmentMap<MerchantProductLayer>
  creamPriceAdjustments?: MerchantProductPriceAdjustmentMap<MerchantCreamType>
}
