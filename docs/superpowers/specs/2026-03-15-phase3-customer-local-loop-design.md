# Phase 3 Customer Local Loop Design

## Goal

Build the next customer-side slice as a fully local, front-end-closed loop: customer browsing still works without login, but critical actions require WeChat login; cart, checkout, orders, note editing, phone history, profile, and settings all share stable local data models without scattering storage writes across pages.

## Scope

### In Scope

- Keep this round on local persistence and front-end closure only
- Update project docs before implementation
- Freeze cream options to `乳脂奶油` / `动物奶油` / `裸蛋糕`
- Upgrade the cart into a richer product-card list with cover images, better checked visuals, select-all, and swipe-to-delete
- Stabilize the cart summary layout so the checkout button never shifts
- Add order-cover-image snapshots through checkout, orders, and order detail
- Replace the pickup-date window model with a natural-month picker that respects month length and leap-year February
- Add local phone-history persistence for checkout input reuse
- Gate critical customer actions behind a local customer-login session
- Turn customer profile from a placeholder scene into a real profile entry
- Add a lightweight customer settings page tied directly to current local needs

### Out Of Scope

- Cloud-backed cart sync
- Cross-device account sync
- Merchant/customer real-time linkage
- Full account center or address-book system
- Search-by-product-ID execution

## Why Search ID Stays In Docs Only

The current customer search UI mentions ID, but products do not yet have a stable cross-end ID contract. Implementing ID search now would force a temporary local-only identifier scheme that would later conflict with the multi-end catalog model.

Decision:

- document the dependency clearly in `PRD` and `TODO`
- leave the current search behavior keyword-only for this round
- defer true ID search until the product ID contract is unified across customer, merchant, and later cloud data

## Current Constraints And Root Causes

### Cart Visual And Layout Problems

Current cart rendering is based on a flat `t-checkbox` row plus copy text. That structure causes three issues:

- the checked state looks detached from the current warm glass-card style
- the cover image snapshot is not rendered even though the cart item already stores `coverImage`
- the footer allows the total-width copy block to expand and visually push the checkout button

### Pickup Picker Mismatch

The existing picker logic builds a rolling 14-day window from the current date. That does not satisfy the requirement to browse months `1~12`, calculate month-specific day counts, or handle leap-year February.

### Profile Placeholder Limitation

Customer `profile` still renders through the generic role placeholder system. That is why the tab exists but cannot yet show customer info, login state, logout, or a settings entry.

### Login Gate Gap

`加入购物车` / `立即购买` / `去结算` / `提交订单` currently go straight to local data writes. There is no shared customer-session check before the mutation begins.

## Product Decisions

### Local-First Customer Data Ownership

Keep the existing local repository pattern and extend it instead of introducing a brand-new service architecture.

Data remains split by responsibility:

- cart snapshot storage
- order snapshot storage
- customer local session storage
- customer local settings storage

Pages should read from or write through these utilities rather than calling `wx.setStorageSync` directly.

### Snapshot-Driven Display

Cart items, checkout items, and order items should carry the display fields needed by downstream pages:

- `productName`
- `coverImage`
- `specLabel`
- `creamLabel`
- quantity and pricing fields

This prevents order pages from re-querying the home catalog to reconstruct display content.

### Customer Login Model

Browsing stays anonymous. Critical actions require a local customer login check.

Gate actions:

- add to cart
- buy now
- go to checkout
- submit order

If the user is not logged in, the app first requests WeChat profile/session permission, stores a local customer session snapshot, and then resumes the requested action.

### Logout Semantics

Logout clears only the local customer session.

It does not automatically clear:

- cart snapshot
- order snapshot
- phone history

Those become explicit settings actions so users do not accidentally lose local drafts.

## Data Design

### Cart And Checkout Snapshot Extension

Extend the cart-domain display data so downstream pages no longer assemble labels ad hoc.

Cart item additions:

- `specLabel`
- `creamLabel`

Checkout items continue to derive from cart items, but should now consume the stored snapshot fields rather than rebuilding all display text at render time.

### Order Snapshot Extension

When checkout creates a local order, each `OrderItem` should persist:

- `productName`
- `coverImage`
- `specLabel`
- `creamLabel`
- `quantity`
- `unitPrice`

This gives orders and order detail stable rendering even if the catalog changes later.

### Customer Session Storage

Add a local customer-session utility with a narrow shape:

- `isLoggedIn`
- `openIdLikeId`
- `nickname`
- `avatarUrl`
- `lastLoginAt`

The implementation remains local-only and can later be swapped for cloud-backed profile bootstrap.

### Phone History Storage

Store a deduplicated, most-recent-first phone history list for checkout reuse.

Rules:

- valid phone numbers only
- deduplicate on write
- keep the list capped to a small stable size
- allow full clearing from settings

## Module Design

### Keep And Extend Existing Utilities

- `customer-cart-storage.ts`
- `customer-cart-state.ts`
- `customer-order-storage.ts`
- `customer-order-repository.ts`
- `customer-checkout-state.ts`

### Add New Utilities

- `customer-session-storage.ts`
  - load/save/clear local customer session
- `customer-phone-history-storage.ts`
  - load/save/remove/clear phone history
- `customer-action-gate.ts`
  - shared login gate for customer critical actions
- `customer-settings.ts` or similarly named helper
  - grouped clear actions for cart/orders/phone history/session

### Adjust Existing Utilities

- `customer-product-selection.ts`
  - expose the fixed cream-option labels through snapshot creation
- `customer-pickup-slot.ts`
  - replace rolling-window construction with month/day calculation logic

## Page And Component Design

### Product Detail

Keep the current detail-page structure, sheet-to-detail flow, and bottom action layout. Only change:

- cream options source
- critical-action login gate
- downstream snapshot data completeness

### Customer Cart Scene

Upgrade the cart scene into a card list:

- cover image on the left
- product and spec snapshot in the middle
- quantity / subtotal on the right
- separate checked affordance with warm highlighted state

Use `t-swipe-cell` for delete interaction so slide motion remains natural and reversible.

Footer layout becomes two stable regions:

- left: select-all + total summary
- right: checkout button

The button width stays visually fixed regardless of amount length.

### Checkout Page

Checkout renders product images from the checkout snapshot.

Phone input gains a history picker entry:

- tap to open a TDesign action sheet or popup
- choose a previous phone number to fill the input

The submit area stays visually consistent with the warm gradient footer, but shifts the button slightly to the right through footer layout rather than page-level hacks.

### Orders Scene

Keep the four status groups, but restyle them into more polished rounded tabs that still fit the current warm aesthetic.

Each order card should surface a cover image snapshot, while multi-item orders can continue to use text summaries alongside the image.

### Order Detail

Keep the dedicated detail page, but make it display-complete:

- order id stays on one line
- item rows show cover images
- edit-note and cancel-order actions use clear TDesign buttons with better spacing

### Customer Profile

Do not replace the customer profile page route. Instead, add a dedicated render branch inside the existing role-page-scene system so customer profile behaves like customer home/cart/orders and does not disturb merchant or admin placeholders.

Profile content:

- avatar
- nickname
- login status copy
- login button
- logout button
- settings entry

### Customer Settings

Add a lightweight standalone page focused only on current local flows:

- current login status
- clear cart
- clear local order snapshots
- phone-history management
- basic explanation copy

This page is intentionally not a full account center.

## UX And Visual Rules

### Warm System Consistency

All new buttons, tabs, cards, and slide actions should stay in the existing warm pink-orange glass-card language.

### Button Compliance

Any action previously rendered as loose text must be converted to TDesign button components. That applies especially to note editing and cancellation actions in order detail.

### Cart Selection Styling

Checked state should be readable even at a glance:

- stronger border or glow
- subtle warm tint on the card
- checked affordance visually separated from product text

The control remains TDesign-based, but the surrounding card makes the state obvious.

## Error Handling

### Login Gate

- user cancels login: stop the action and show a non-blocking toast
- login succeeds: continue the original action
- login storage write fails: stop and keep data unchanged

### Pickup Slot

The picker may show all month/day combinations for the current year context, but submit must still reject any datetime earlier than now.

### Missing Snapshots

If a cover image or label is missing from legacy local data, fall back gracefully instead of crashing:

- image: use existing local image fallback logic
- labels: use a safe textual fallback

## Testing Strategy

### Unit Tests

- cart state: select-all, single toggle, delete
- phone history storage: dedupe, cap, clear
- customer session storage and gate behavior
- pickup-slot month/day generation including leap-year February
- order repository snapshot persistence with cover image and cream label

### Structural Tests

- cart scene shows cover image, select-all, and swipe-cell structure
- checkout page shows product images and phone-history trigger
- orders scene keeps rounded status-tab structure and image slot
- order detail page keeps one-line order id and button-based actions
- customer profile render mode and settings route registration

### Manual Verification

Primary manual pass should be done in WeChat DevTools `2.01.2510280`, with follow-up real-device validation for login and swipe gestures if needed.

## Documentation Sync

Update before or alongside implementation:

- `docs/PRD.md`
  - clarify that this round is local persistence plus front-end closure
  - document login-gated critical customer actions
  - document phone history and lightweight settings scope
  - note that ID search is deferred until product ID unification
- `docs/STYLE_GUIDE.md`
  - add cart checked-state, swipe-delete, status-tab, and customer-profile visual guidance
- `docs/TODO.md`
  - add the new customer-loop task structure
  - add the deferred ID-search dependency note
  - do not pre-mark these tasks complete before implementation and user confirmation
