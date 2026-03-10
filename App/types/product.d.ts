export type ProductCategory = 'birthday-cake' | 'dessert' | 'cookie' | 'gift-box'

export type ProductStatus = 'draft' | 'active' | 'archived'

export type ProductSpecSize = '6-inch' | '8-inch' | '10-inch'

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
