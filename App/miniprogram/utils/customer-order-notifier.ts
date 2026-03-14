export interface CustomerOrderNotifier {
  notifyOrderNoteChanged(input: {
    orderId: string
    note: string
  }): Promise<void>
}

export function createLocalCustomerOrderNotifier(): CustomerOrderNotifier {
  return {
    async notifyOrderNoteChanged(): Promise<void> {
      return
    },
  }
}
