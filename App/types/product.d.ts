export type ProductCategory = 'birthday-cake' | 'dessert' | 'cookie' | 'gift-box'

export type ProductStatus = 'draft' | 'active' | 'archived'

export type ProductSpecSize = '6-inch' | '8-inch' | '10-inch' | '12-inch' | '14-inch' | '16-inch'

export type CakeLayerId = 'single' | 'double' | 'triple'

export interface ProductMedia {
  url: string
  alt: string
  width: number
  height: number
}

export interface ProductSpec {
  id: string
  label: string
  size: ProductSpecSize
  price: number
  stock: number
  isDefault: boolean
}

export interface ProductSummary {
  id: string
  title: string
  category: ProductCategory
  description: string
  basePrice: number
  monthlySales: number
  status: ProductStatus
  coverImage: string
  gallery: ProductMedia[]
  specs: ProductSpec[]
}

export interface CakeLayerOption {
  id: CakeLayerId
  label: string
  layers: number
}

export interface CakeSizePlan {
  id: string
  label: string
  layers: number
  sizes: ProductSpecSize[]
  price: number
  isDefault: boolean
}

export interface CakeCreamOption {
  id: string
  label: string
  priceDelta: number
  isDefault: boolean
}

export interface CakeDetail extends ProductSummary {
  detailImages: ProductMedia[]
  layerOptions: CakeLayerOption[]
  sizePlans: CakeSizePlan[]
  creamOptions: CakeCreamOption[]
}
