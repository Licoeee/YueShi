import type { CakeDetail } from '../../types/product'
import { CUSTOMER_CAKES } from '../mock/customer-cakes'

export type CakeFeedSortMode = 'sales-desc' | 'price-asc' | 'price-desc'

export interface ResolveCakeFeedInput {
  keyword: string
  sortMode: CakeFeedSortMode
}

function getPrimaryImageHeight(cake: CakeDetail): number {
  return cake.gallery[0]?.height ?? 0
}

export function getCakeDetailById(productId: string): CakeDetail {
  const cake = CUSTOMER_CAKES.find((item) => item.id === productId)
  if (cake === undefined) {
    throw new Error(`Unknown cake detail: ${productId}`)
  }

  return cake
}

export function resolveCakeFeed(input: ResolveCakeFeedInput): CakeDetail[] {
  const keyword = input.keyword.trim().toLowerCase()
  const filtered = CUSTOMER_CAKES.filter((cake) => {
    if (keyword.length === 0) {
      return true
    }

    return cake.title.toLowerCase().includes(keyword) || cake.id.toLowerCase().includes(keyword)
  })

  const sorted = [...filtered]
  sorted.sort((left, right) => {
    if (input.sortMode === 'sales-desc') {
      return right.monthlySales - left.monthlySales
    }

    if (input.sortMode === 'price-desc') {
      return right.basePrice - left.basePrice
    }

    return left.basePrice - right.basePrice
  })

  return sorted
}

export function buildCakeMasonryColumns(cakes: CakeDetail[]): [CakeDetail[], CakeDetail[]] {
  const leftColumn: CakeDetail[] = []
  const rightColumn: CakeDetail[] = []
  let leftHeight = 0
  let rightHeight = 0

  cakes.forEach((cake) => {
    const cardWeight = getPrimaryImageHeight(cake)

    if (leftHeight <= rightHeight) {
      leftColumn.push(cake)
      leftHeight += cardWeight
      return
    }

    rightColumn.push(cake)
    rightHeight += cardWeight
  })

  return [leftColumn, rightColumn]
}
