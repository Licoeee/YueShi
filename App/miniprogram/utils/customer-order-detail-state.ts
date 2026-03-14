import type { OrderStatus } from '../../types/order'

export function canCustomerCancelOrder(status: OrderStatus): boolean {
  return status !== 'ready-for-pickup' && status !== 'completed' && status !== 'cancelled'
}
