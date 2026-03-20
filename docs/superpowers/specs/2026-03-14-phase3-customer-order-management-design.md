# Phase 3 Customer Order Management Design

## Goal

Build `3.5` as a local customer order-management loop: the orders tab lists local customer orders, highlights orders with notes, supports drilling into a dedicated order detail page, allows remark editing, allows cancellation only when the order is still cancellable, and leaves a notifier seam for future merchant-side real-time alerts.

## Scope

### In Scope

- Extend the customer orders tab into a real order list
- Add `pages/customer/order-detail/order-detail`
- Add local order detail loading by `orderId`
- Support customer note editing in the detail page
- Support customer-side order cancellation in the detail page
- Hide the cancel action once an order reaches `ready-for-pickup` or a later terminal state
- Add a notifier interface for future merchant alert delivery, with a local no-op implementation for now

### Out Of Scope

- Real cloud notification delivery
- Merchant-side real-time reminder inbox
- Customer order watch / live sync
- Full merchant-driven status update flow
- Note history or audit log

## Product Decisions

### Page Structure

Use a two-level order-management structure:

- `pages/customer/orders/orders` remains the list entry
- `pages/customer/order-detail/order-detail` handles note editing and cancellation

This keeps the tab list stable while isolating stateful business actions in the detail page.

### Data Ownership

Pages do not mutate local storage directly. They call the customer order repository:

- list page reads derived order cards
- detail page loads by `orderId`
- note updates and cancellation go through repository methods

This preserves a clean seam for future cloud-backed order actions.

### Cancellation Guard

Customer cancellation is allowed only before `ready-for-pickup`.

UI rule:

- hide cancel button for `ready-for-pickup`, `completed`, and `cancelled`

Repository rule:

- reject cancellation for the same statuses even if a page incorrectly exposes the action

## UX Structure

### Orders List

Each card shows:

- order id
- item summary
- pickup time
- total amount
- current order status
- note marker

Orders with notes use a pale-pink highlighted card background so the note signal is visible from the list level.

### Order Detail

The detail page shows:

- full item list
- phone tail / contact info
- pickup slot
- status
- current note
- note edit action
- cancel action when still allowed

### Note Editing

Use an explicit edit flow rather than inline always-editable text:

1. display current note
2. tap edit
3. edit in a textarea/dialog state
4. save and refresh detail + list

This keeps the read path clean and the edit path deliberate.

## Data Design

### Order Repository Extension

Extend `CustomerOrderRepository` with:

- `getOrderById(orderId)`
- `updateOrderNote(orderId, note)`
- `cancelOrder(orderId)`

Local behavior:

- `updateOrderNote` updates `note`, `hasNote`, `updatedAt`
- `cancelOrder` updates `status` to `cancelled`, refreshes `updatedAt`

### Notifier Design

Add `customer-order-notifier.ts` with a narrow seam:

- `notifyOrderNoteChanged(orderId, note)`

Default local implementation:

- return success without side effects

Future cloud notifier:

- call a cloud function after note update succeeds

## Module Design

### `customer-order-detail-state.ts`

Responsibilities:

- derive whether cancellation is allowed
- normalize note display and edit state
- expose helper predicates for page rendering

### `customer-order-repository.ts`

Responsibilities after extension:

- create draft orders
- fetch order by id
- update note
- cancel order with status guard

### `customer-order-notifier.ts`

Responsibilities:

- define notifier contract
- ship a no-op local implementation for this phase

## Page Integration

### Orders Scene

Update the existing orders scene to:

- make each card tappable
- apply pink highlight when `hasNote === true`
- show status and note marker in the card header

### Order Detail Page

Register a new page route and use TDesign-only UI:

- `t-cell`
- `t-cell-group`
- `t-button`
- `t-textarea`
- `t-dialog`
- `t-tag`

The page should reuse the established warm gradient and glass-card style language.

## Validation And Error Handling

### Note Update

- trim whitespace
- allow empty note, which clears the note state
- persistence failure shows an error toast and leaves edit mode intact

### Cancellation

- disallow cancellation for locked statuses
- show confirmation before cancel
- repository throws on invalid cancellation attempt

### Missing Order

- if `orderId` is absent or not found, show a toast and return to the orders list

## Testing Strategy

### Unit Tests

- repository note update behavior
- repository cancellation guard behavior
- order detail state helpers

### Structural Tests

- order detail page route registration
- detail page contains note-edit and cancel sections
- orders scene applies note-highlight structure

### Manual Verification

Verify in WeChat DevTools `2.01.2510280`:

1. orders with notes show a highlighted card
2. entering detail by tapping a card works
3. note edits persist after returning to the list
4. cancellable orders can be cancelled after confirmation
5. `ready-for-pickup` and later statuses do not expose customer cancellation
