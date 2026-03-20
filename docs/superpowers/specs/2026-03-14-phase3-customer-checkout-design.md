# Phase 3 Customer Checkout Design

## Goal

Build the `3.3` customer checkout flow as a local closed loop: selected cart items or the active buy-now item can enter a dedicated checkout page, complete phone and pickup-time validation, create a local order draft, show the payment guidance dialog, and then land in the customer orders page.

## Scope

### In Scope

- Add `pages/customer/checkout/checkout`
- Support checkout entry from:
  - checked cart items
  - the active `buy-now` cart item
- Add manual phone-number input and validation
- Add a three-column pickup selector for month, day, and half-hour slot
- Create local order persistence behind a repository interface
- Remove settled cart items after a successful local order creation
- Show the PRD-required payment note after submit

### Out Of Scope

- Cloud order creation
- Merchant notifications for remark changes
- Customer order detail editing
- Order status watch / real-time sync

## Product Decisions

### Checkout Source Strategy

The checkout page accepts two sources:

- `cart`: all checked cart items
- `buy-now`: the single cart item marked as immediate purchase

The page does not render directly from raw cart records. A checkout helper normalizes cart data into checkout item records so the page can stay focused on rendering and validation.

### Submission Strategy

The page submits through a `CustomerOrderRepository` interface. The default implementation is local storage. This keeps the page contract stable when the project later switches to cloud-backed order creation.

### Cart Cleanup Strategy

After a successful checkout:

- `cart` source removes all submitted checked items
- `buy-now` source removes the active immediate-purchase item

This avoids duplicate order creation from stale local cart entries.

## UX Structure

### Checkout Page Layout

1. Header summary
   - title
   - item count
   - short checkout hint
2. Checkout item list
   - cover
   - product name
   - selection summary
   - quantity
   - subtotal
3. Contact section
   - manual phone input
   - inline validation hint
4. Pickup section
   - month/day/time picker entry
   - current selected slot summary
5. Sticky footer
   - total amount
   - submit button

### Empty State

If checkout resolves to zero valid items, the page shows an empty state and disables submit. The user can navigate back to home or cart.

## Data Design

### New Types

Add `App/types/checkout.d.ts`:

- `CheckoutSource`
- `CheckoutItemRecord`
- `CheckoutDraftRecord`
- `CheckoutContactDraft`
- `CheckoutPickupDraft`

### Order Type Extension

Extend `App/types/order.d.ts` so `OrderItem` can preserve the current product selection without reverse lookup:

- `layerId`
- `sizePlanId`
- `creamId`
- `specLabel`

## Module Design

### `customer-checkout-state.ts`

Responsibilities:

- resolve checkout items from stored cart records
- determine the current checkout source
- compute item count and total amount
- remove settled entries after success

### `customer-pickup-slot.ts`

Responsibilities:

- generate available month/day/half-hour columns
- build current picker values
- reject expired time slots
- format the selected pickup summary

### `customer-order-storage.ts`

Responsibilities:

- read local order list
- write local order list
- expose an in-memory storage helper for tests

### `customer-order-repository.ts`

Responsibilities:

- define repository contract
- create local draft orders
- derive order ids / timestamps / phone tail
- return the created order record to the page

## Page Integration

### Cart Scene

Add a visible checkout action to `customer-cart-scene`:

- show checked item count
- show total for checked items
- navigate to `/pages/customer/checkout/checkout`
- disable action when there are no valid checkout items

### Product Detail Page

Keep `add to cart` behavior unchanged.

Change `buy now` to:

1. persist the selected item as the active `buy-now` cart item
2. navigate directly to checkout

## Validation Rules

### Phone

- required
- trim whitespace
- must match mainland China mobile format

### Pickup Slot

- month/day/time must all resolve to a valid slot
- slot must not be earlier than current local time

### Checkout Payload

- items must not be empty
- total amount must be greater than `0`

## Error Handling

- invalid phone: inline error + toast, no submit
- invalid pickup slot: toast, no submit
- order persistence failure: toast, keep page state
- empty checkout state: render empty state and disable submit

## Testing Strategy

### Unit Tests

- `customer-checkout-state.test.ts`
- `customer-pickup-slot.test.ts`
- `customer-order-storage.test.ts`
- `customer-order-repository.test.ts`

### Structural / Flow Tests

- `customer-cart-scene.test.ts`
- `customer-product-detail-page.test.ts`
- `customer-checkout-page.test.ts`

### Manual Verification

Use WeChat DevTools `2.01.2510280` to verify:

1. checked cart items can enter checkout
2. buy-now jumps directly to checkout
3. phone validation blocks invalid input
4. expired pickup slots cannot be submitted
5. submit creates a local order and clears the submitted cart entries
6. the payment guidance modal appears before leaving checkout
