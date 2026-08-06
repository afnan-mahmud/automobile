# Finance Dashboard Date Range + Discount Card Usage Tracking

**Date:** 2026-08-06
**Status:** Approved, ready for implementation planning

## Context

Two features from a larger request list. The remaining items from that list are
explicitly **out of scope** here and will get their own specs:

- Bank deposit vs Total Sales separation (deferred — semantics unresolved)
- Service vs Parts revenue breakdown (deferred — requires invoice line-item
  categorisation)
- Admin Settings panel (deferred — separate subsystem)

Stock/Parts management and Warranty Cards were also on the original list but are
already fully implemented (`app/(dashboard)/stock/`, `app/(dashboard)/warranty-cards/`,
`app/(dashboard)/job-cards/[id]/issue-warranty-dialog.tsx`, `app/api/warranty/[id]/pdf/`).
No work needed.

---

## Feature 1 — Finance Dashboard date-range filter

### Goal

Admin can pick a date or date range on `/accounts/dashboard` and see every metric
recalculated for that period.

### Existing state

`getFinanceDashboardSummary(from?, to?)` in `actions/accounts.ts` already accepts a
range, but `app/(dashboard)/accounts/dashboard/page.tsx` never passes one. The wiring
plus a picker is what is missing — along with two defects in the existing range code.

### Defects to fix

1. **Exclusive end date.** `buildDateRangeFilter` builds `$lte: new Date(to)`. A
   date-only string such as `"2026-08-06"` parses to midnight, so every transaction on
   the final day of the range is silently excluded. The end bound must be inclusive of
   the whole final day.

2. **Sparse daily series.** `getDailyIncomeExpense(days = 30)` returns only days that
   have at least one transaction, producing gaps in the line chart. It must emit one row
   per day across the whole range, zero-filled where there is no data.

### Changes

**`actions/accounts.ts`**

- `buildDateRangeFilter(from, to)` — make the `to` bound inclusive of the entire final
  day.
- `getDailyIncomeExpense(from?, to?)` — replace the `days: number` parameter with the
  same range parameters used by the summary. Zero-fill every day in the range.
- `outstandingDues` inside `getFinanceDashboardSummary` stays **unfiltered by date**.
  It answers "how much is owed right now", not "how much was owed during this period".
  This is deliberate; the UI must label it so it does not read as a bug.

**URL state**

The selected range lives in `searchParams`:
`/accounts/dashboard?from=2026-07-01&to=2026-07-31`. Refresh, share and browser
back/forward all work without extra client state.

In Next.js 16 `searchParams` is a Promise and must be awaited in the page component.
Consult `node_modules/next/dist/docs/01-app/` for the current API before writing the
page — this version differs from older Next.js conventions.

When no params are present, default to the last 30 days, matching today's behaviour.

Invalid or unparseable `from`/`to` values fall back to the 30-day default rather than
erroring.

**New components**

- `components/ui/popover.tsx` — thin wrapper over `@base-ui/react/popover`, following
  the same structure as the existing `components/ui/dialog.tsx` and
  `components/ui/select.tsx`. No Radix; the project standardises on Base UI.
- `components/ui/calendar.tsx` — `react-day-picker` with `mode="range"`, two months
  side by side. `react-day-picker` is the only new dependency.
- `app/(dashboard)/accounts/dashboard/date-range-picker.tsx` — client component with a
  row of preset buttons (Today, Last 7 days, Last 30 days, This month, Last month, This
  year) plus the calendar popover for a custom range. Selecting a range calls
  `router.push` with updated searchParams.

**Chart title** becomes dynamic, e.g. "Income vs Expense — 1 Jul to 31 Jul", replacing
the hardcoded "last 30 days".

### Testing

- Unit: preset name resolves to the correct `{from, to}` pair; end-of-day inclusivity;
  zero-fill produces one row per day with no gaps.
- Integration (`mongodb-memory-server`, following `tests/integration/` conventions):
  seed transactions on the first day, a middle day, the last day, and one day either
  side of the range. Assert both boundaries are inclusive and the outside transactions
  are excluded.

---

## Feature 2 — Discount card usage tracking

### Goal

For each discount card, show how many times it has been used and how much money the
customer saved through it, plus the full list of invoices where it was applied.

### Definition of "used"

A card counts as used once for each invoice that (a) is linked to that card and (b) has
status `paid`. The other three statuses in `INVOICE_STATUSES` — `draft`, `sent` and
`partially_paid` — do **not** count. `partially_paid` is excluded because the money has
not fully arrived.

### Why counting is derived, not stored

`markInvoicePaid` can be called more than once on the same invoice (partial, then full).
An incrementing counter field would double-count. Instead the invoice stores which card
it used, and usage numbers are computed by query. This is idempotent and self-corrects
if invoice data is later fixed or an invoice is deleted.

### Changes

**`models/Invoice.ts`**

Add `discountCardId: { type: Schema.Types.ObjectId, ref: "DiscountCard", default: null }`
and an index on it.

**`actions/invoices.ts`**

`getActiveDiscountForCustomer` currently calls `findActiveDiscountCard` and discards
everything but `discountPercent`. Change it (or add a sibling) to return the card's
`_id` as well, and persist that `_id` as `discountCardId` when
`generateInvoiceFromJobCard` creates the invoice. When no card applies, the field stays
`null`.

**`actions/discountCards.ts`**

- `getDiscountCardUsage(cardId)` → `{ timesUsed, totalDiscountAmount, invoices[] }`.
  Aggregates `Invoice` on `discountCardId === cardId` and `status === "paid"`, summing
  `discountAmount`.
- `getDiscountCardUsageMap(cardIds[])` → a map keyed by card id, for the list page.
  One aggregate query for all cards; no N+1.

Both are role-gated consistently with the rest of the file.

### UI

1. **`/discount-cards`** — each card in the grid gains a usage strip reading
   `Used 8× · ৳4,200 saved`. The page's server component fetches the batch usage map and
   passes it into `DiscountCardList`. Cards with zero usage show `Not used yet`.
   Each card becomes a link to its detail page.

2. **`/customers/[id]`** — the active discount card block shows the same two numbers for
   that card.

3. **`/discount-cards/[id]`** (new page) — card details plus a table of the paid invoices
   that used it: invoice number, date, subtotal, discount amount, total. Each row links
   to `/invoices/[id]`. Empty state when the card has never been used.

### Backfill migration

Existing invoices carry `discountPercent` but no card link, so historical usage is
invisible until backfilled.

`scripts/backfill-invoice-discount-card.ts`, following the existing `scripts/` pattern
and run with `tsx`.

For every invoice where `discountPercent > 0` and `discountCardId` is null, find that
customer's discount cards where:

- `validFrom <= invoice.createdAt`, and
- `validTo` is null **or** `validTo >= invoice.createdAt`, and
- `discountPercent` equals the invoice's `discountPercent`

Then:

- exactly one match → set `discountCardId`
- zero matches or two or more matches → skip and record in the report

The script is **dry-run by default**; it only writes when passed `--apply`. On finish it
prints a summary of linked / skipped-no-match / skipped-ambiguous counts, and lists the
skipped invoice numbers so they can be resolved by hand.

### Testing

- Integration: a paid invoice linked to a card yields `timesUsed: 1`; `draft`, `sent`,
  and `partially_paid` invoices yield `0`; several paid invoices sum `totalDiscountAmount`
  correctly; an invoice with no card contributes to no card's count.
- Backfill: an unambiguous match gets linked; an invoice matching two cards is skipped
  and reported; dry-run mode writes nothing.

---

## Out of scope

- Any change to how discounts are calculated or applied.
- Retroactively linking cards to invoices where the match is ambiguous.
- Filtering the discount usage tables by date (the finance range picker does not apply
  to `/discount-cards`).
- The four deferred items listed under Context.
