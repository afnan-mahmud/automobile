# Admin Panel Dark Redesign — Design Spec

Date: 2026-07-26

## Goal

Restyle the entire Dhaka Automobiles admin panel to match the visual
language of a reference dashboard screenshot ("FoCar" — dark theme,
purple accent, rounded cards, sidebar with icon nav, KPI cards with
sparklines, status pill badges). The redesign covers the whole app (shell
+ every existing module page), is mobile-friendly, and defaults to dark
mode with a light/dark toggle.

This is a **visual/presentational redesign** — no Server Action, data
model, or business-logic changes. The existing 14 automated tests must
continue to pass unmodified.

## Scope

- Full app: shared dashboard shell (sidebar, header, mobile drawer) +
  every existing module page (Job Cards, Customers, Invoices, Employees,
  Attendance, Salary, Stock, Accounts + its Finance Dashboard, Messages,
  Warranty Cards, Discount Cards) + `/login` + `/track/[token]`.
- New: dashboard home page (`/dashboard`) gets real, role-aware KPI
  content (currently a placeholder).
- Out of scope: any new business feature, new Server Action, or schema
  change. Global search (cosmetic input only, no wiring) and notification
  bell (cosmetic icon only, no real notification system) are visual only.

## 1. Theme tokens (`app/globals.css`)

Extend the existing shadcn CSS-variable system (`:root` for light,
`.dark` for dark) — do not introduce a new styling system.

- `background` / `card` / `sidebar`: near-black tones for dark, current
  values kept for light.
- `primary` / `sidebar-primary`: violet/purple (~`oklch(0.62 0.19 292)`,
  ~`#7C5CFC`), same hue in both light and dark mode for consistent brand
  identity.
- Two new semantic tokens added to both `:root` and `.dark`: `--success`
  (green) and `--warning` (amber), exposed via `@theme inline` as
  `--color-success` / `--color-warning`, alongside the existing
  `--destructive` (red). These replace every hardcoded status color in
  the app (see §5).
- `chart-1..5`: keep 5 slots, retune hues so dashboard/finance charts read
  well on the new dark background.
- Typography and radius scale (shadcn `base-nova`) are unchanged —
  reuse as-is.
- A new `lib/chartColors.ts` exports literal hex constants
  (`CHART_COLORS.success`, `.warning`, `.destructive`, `.chart1..5`) for
  recharts, which cannot consume Tailwind classes or CSS variables
  directly. Both existing (`income-expense-chart.tsx`) and new sparkline
  charts import from here so all charts share one palette.

## 2. Theme toggle

- Add `next-themes` dependency.
- Wrap `app/layout.tsx`'s children in `next-themes`'s `ThemeProvider`
  (`attribute="class"`, `defaultTheme="dark"`, `enableSystem={false}`),
  add `suppressHydrationWarning` to `<html>`.
- Header gets a sun/moon icon toggle button using `useTheme()` from
  `next-themes`.

## 3. Dashboard shell (`app/(dashboard)/layout.tsx` and friends)

- **Desktop (`md:` and up):** fixed dark sidebar (left), sticky header
  (top of content area), main content to the right.
- **Mobile (below `md:`):** sidebar hidden by default; header shows a
  hamburger button; tapping it opens the sidebar as a slide-in drawer
  from the left with a backdrop, built as a new `components/ui/sheet.tsx`
  on top of the same Base UI `Dialog` primitive `components/ui/dialog.tsx`
  already uses (repositioned/animated to the left edge) — no new UI
  dependency.
- **Sidebar** (`components/dashboard-nav.tsx`, restyled — same 11
  role-filtered nav items, same `href`s, no routing changes): each item
  gets a `lucide-react` icon; active item renders as a filled purple
  rounded pill (`bg-primary text-primary-foreground`); inactive items are
  muted with a subtle hover background. Brand mark ("Dhaka Automobiles")
  stays at the top.
- **User chip** (name, role badge, sign-out): moves from the header to
  the bottom of the sidebar, matching the reference image.
- **Header** (new `components/dashboard-header.tsx`, replacing the
  inline header in `layout.tsx`): hamburger (mobile only) · cosmetic
  search input · notification bell (static, cosmetic) · theme toggle.

## 4. Reusable patterns

- **`components/stat-card.tsx`** — title, large bold value, small
  trend pill (colored via `--success`/`--destructive`), optional inline
  sparkline (recharts `AreaChart`/`LineChart`, ~60px, no axes, colors
  from `lib/chartColors.ts`). Used on: new dashboard home KPI row, and
  the existing Accounts Finance Dashboard's 4 cards (Total Sales, Net
  Profit, Outstanding Dues, Total Expense — swapped in place of the
  current plain `Card`s).
- **Status badge color mapping** (`lib/statusBadge.ts`) — maps each
  domain status enum to `success`/`warning`/`destructive`/muted, replacing
  every hardcoded color currently used for status pills:
  - Job cards: `open`→muted, `in_progress`→warning,
    `completed`/`delivered`→success
  - Invoices: `draft`→muted, `sent`→warning, `paid`→success,
    `partially_paid`→warning
  - Attendance: `present`→success, `absent`→destructive,
    `half_day`/`leave`→warning
  - Messages: `sent`→success, `failed`→destructive
  - Stock low-stock flag, warranty "carried forward" badge (currently
    hardcoded `border-amber-500 text-amber-600` in
    `job-card-detail.tsx`), discount card active/expired — all switch to
    the same token set.
- **Table** (`components/ui/table.tsx`): slightly more row padding, a
  subtle `hover:bg-accent/50` row highlight. No structural change.

## 5. Dashboard home page (`/dashboard`) — role-aware content

Replaces the current placeholder. Reads only from existing actions plus
one new small helper.

- **Admin:** KPI row — Total Revenue (this month, from
  `getFinanceDashboardSummary`/`getDailyIncomeExpense`, trend vs last
  month, sparkline) · Outstanding Dues · Open Job Cards · Low Stock Items
  (= count of products where `quantityInStock <= reorderLevel`, same
  definition already used on the Stock page). Two-panel row — "Job Card
  Status Breakdown" (donut/bar chart of open/in_progress/completed/
  delivered counts) + "Recent Job Cards" (last 5, status badges, links
  to detail). Bottom — "Top Serviced Vehicles" table: top 5 vehicles
  ranked by job-card count descending (ties broken by lifetime spend
  descending); columns are vehicle, owner, job-card count, last service
  date, and lifetime spend (= sum of `total` from that vehicle's `paid`/
  `partially_paid` invoices) — via a new small aggregation added to
  `actions/jobCards.ts`.
- **Manager:** KPI row — Open Job Cards · In-Progress Job Cards · Low
  Stock Items (no revenue figures — finance summary stays admin-only per
  the existing role matrix in `docs/architecture.md`). Same two-panel row
  and Top Serviced Vehicles table as admin.
- **Technician:** KPI row — My Pending Tasks · My Completed This Week.
  "Recent Job Cards" panel filtered to job cards containing their own
  assigned tasks. No status-breakdown chart, no vehicles table (keeps
  their view light and personally relevant).

## 6. Pages outside the dashboard shell

- **`/login`**: restyled to match the new dark branding — centered card,
  purple accent, no sidebar involved. Same form fields/behavior.
- **`/track/[token]`**: stays light/neutral (customers view this on
  arbitrary devices/lighting), with the purple accent color applied for
  brand consistency. No dark-mode toggle needed here — it's a fixed
  light presentation regardless of the staff app's theme.

## 7. Rollout across existing module pages

Because every existing page is built from the same token-driven shared
primitives (`Card`, `Table`, `Badge`, `Select`, `Dialog`, `Button`), most
pages inherit the new palette automatically once §1–§4 land. The only
direct edits needed elsewhere:
- `job-card-detail.tsx`: swap the hardcoded amber "carried forward" badge
  classes for the new `warning` token.
- `income-expense-chart.tsx`: swap literal hex colors for
  `lib/chartColors.ts` constants.
- Spot-check every other page during visual QA (§8) for any other
  hardcoded color utility that isn't already token-based.

No page's data-fetching, Server Action calls, or role guards change.

## 8. Verification

1. `npm run build`, `npm run lint`, `npm test` all stay green (existing
   14 tests, no logic touched).
2. Manual visual pass: dev server, log in as each role (admin/manager/
   technician), click through every module page at desktop width and a
   narrow (375px) mobile width — confirm the drawer, tables, dialogs, and
   forms read correctly in dark mode.
3. Toggle to light mode and spot-check the same pages for regressions
   (light `:root` tokens also change for the new accent color).

## Non-goals

- No new business feature or Server Action.
- No real global search or real notification system — both are cosmetic
  UI only in this pass.
- No schema/model changes.
- No changes to routing, role permissions, or existing acceptance
  criteria from `docs/prompt.md`.
