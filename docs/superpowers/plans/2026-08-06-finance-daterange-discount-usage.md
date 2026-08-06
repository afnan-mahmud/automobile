# Finance Date Range + Discount Card Usage Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let admins filter the Finance Dashboard by any date or date range, and show how many times each discount card has been used and how much money it saved.

**Architecture:** Date-range state lives in the URL (`?from=&to=`) so the existing server-rendered dashboard page keeps working with no client data fetching; a shared `lib/dateRange.ts` owns all day-boundary math in a single fixed timezone so MongoDB aggregation keys and JavaScript boundaries can never drift apart. Discount usage is never stored as a counter — invoices record which card they used, and usage numbers are derived with an aggregate query, which keeps the number correct even when an invoice is paid twice or deleted.

**Tech Stack:** Next.js 16 (App Router, async `searchParams`), React 19, Mongoose 9, Base UI (`@base-ui/react`), `react-day-picker` v10, Recharts, Vitest + `mongodb-memory-server`, Tailwind v4.

## Global Constraints

- **This is not the Next.js you may know.** Before writing any page or route code, read the relevant guide under `node_modules/next/dist/docs/`. `params` and `searchParams` are `Promise`s in this version and must be awaited — see `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/page.md`.
- **UI primitives come from `@base-ui/react`, never Radix.** Follow the structure of `components/ui/dialog.tsx` and `components/ui/select.tsx` exactly: `"use client"`, `import { X as XPrimitive } from "@base-ui/react/x"`, thin wrapper functions with `data-slot` attributes, `cn()` for class merging.
- **Only one new dependency is authorised:** `react-day-picker` (v10). It pulls in `date-fns` and `@date-fns/tz` transitively; do not import those directly — all date math lives in `lib/dateRange.ts` using native `Date`.
- **Report timezone is `Asia/Dhaka` (UTC+6, no DST).** Every "day" boundary — in JavaScript and in MongoDB `$dateToString` — must use it. Never rely on the server's local timezone; tests must pass regardless of the machine's `TZ`.
- **Usage counting rule:** a discount card counts as used once per invoice with `status === "paid"`. `draft`, `sent` and `partially_paid` do not count. `INVOICE_STATUSES` contains exactly those four values.
- **Currency is rendered as** `৳` followed by the amount, matching existing pages (e.g. `৳${value.toFixed(2)}`).
- **Server actions** live in `actions/*.ts` with `"use server"` at the top, call `await requireRole([...])` first, then `await connectToDatabase()`, and return data through `serialize()` from `@/lib/serialize`.
- **Run the full suite** with `npm test` (Vitest). Individual file: `npx vitest run tests/path/file.test.ts`.
- **Do not commit unrelated working-tree changes.** Every commit step lists explicit paths for `git add`; never use `git add -A` or `git add .`.

---

## File Structure

**New files**

| Path | Responsibility |
|---|---|
| `lib/dateRange.ts` | All day-boundary math and preset resolution in `Asia/Dhaka`. Pure functions, no DB, no React. |
| `tests/unit/date-range.test.ts` | Unit tests for the above. |
| `components/ui/popover.tsx` | Base UI popover wrapper, mirroring `dialog.tsx`. |
| `components/ui/calendar.tsx` | `react-day-picker` range calendar styled with Tailwind. |
| `app/(dashboard)/accounts/dashboard/date-range-picker.tsx` | Client component: preset buttons + calendar popover, pushes `?from=&to=`. |
| `app/(dashboard)/discount-cards/[id]/page.tsx` | Discount card detail + usage history table. |
| `scripts/backfill-invoice-discount-card.ts` | One-time backfill of `Invoice.discountCardId`. |
| `tests/integration/finance-date-range.test.ts` | Range boundary + zero-fill integration tests. |
| `tests/integration/discount-card-usage.test.ts` | Usage counting integration tests. |
| `tests/integration/backfill-discount-card.test.ts` | Backfill matching-logic tests. |
| `tests/components/date-range-picker.test.tsx` | Preset click → correct URL. |

**Modified files**

| Path | Change |
|---|---|
| `actions/accounts.ts` | Inclusive end-of-day filter; `getDailyIncomeExpense(from, to)` with zero-fill. |
| `app/(dashboard)/accounts/dashboard/page.tsx` | Read `searchParams`, render picker, dynamic chart title. |
| `models/Invoice.ts` | Add `discountCardId` field + index. |
| `actions/invoices.ts` | New `getActiveDiscountCardInfo`; persist `discountCardId`. |
| `actions/discountCards.ts` | `getDiscountCardUsage`, `getDiscountCardUsageMap`, `getDiscountCardById`. |
| `app/(dashboard)/discount-cards/page.tsx` | Fetch and pass the usage map. |
| `app/(dashboard)/discount-cards/discount-card-list.tsx` | Usage strip + link to detail page. |
| `app/(dashboard)/customers/[id]/page.tsx` | Usage numbers on the active card block. |
| `package.json` | Add `react-day-picker`. |

---

## Task 1: Date range math (`lib/dateRange.ts`)

Pure, dependency-free day math in a fixed timezone. Everything later in the plan builds on it.

**Files:**
- Create: `lib/dateRange.ts`
- Test: `tests/unit/date-range.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `REPORT_TIMEZONE: "Asia/Dhaka"`
  - `type DayKey = string` (a `"YYYY-MM-DD"` string)
  - `type DateRange = { fromDay: DayKey; toDay: DayKey }`
  - `type RangePreset = "today" | "last7" | "last30" | "thisMonth" | "lastMonth" | "thisYear"`
  - `dayKey(date: Date): DayKey`
  - `startOfDayUtc(day: DayKey): Date`
  - `endOfDayUtc(day: DayKey): Date`
  - `resolvePreset(preset: RangePreset, now?: Date): DateRange`
  - `parseDateRange(from: unknown, to: unknown, now?: Date): DateRange`
  - `eachDayInRange(range: DateRange): DayKey[]`
  - `formatRangeLabel(range: DateRange): string`
  - `RANGE_PRESETS: { value: RangePreset; label: string }[]`

- [ ] **Step 1: Write the failing test**

Create `tests/unit/date-range.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import {
  dayKey,
  startOfDayUtc,
  endOfDayUtc,
  resolvePreset,
  parseDateRange,
  eachDayInRange,
  formatRangeLabel,
} from "@/lib/dateRange";

// Asia/Dhaka is UTC+6 with no daylight saving, so local midnight on day D
// is D-1T18:00:00Z and the last instant of day D is DT17:59:59.999Z.

describe("dayKey", () => {
  it("uses the Dhaka calendar day, not the UTC day", () => {
    // 20:30Z on Aug 6 is already 02:30 on Aug 7 in Dhaka
    expect(dayKey(new Date("2026-08-06T20:30:00.000Z"))).toBe("2026-08-07");
    // 17:59Z on Aug 6 is still Aug 6 in Dhaka (23:59)
    expect(dayKey(new Date("2026-08-06T17:59:00.000Z"))).toBe("2026-08-06");
  });
});

describe("day boundaries", () => {
  it("startOfDayUtc is Dhaka midnight expressed in UTC", () => {
    expect(startOfDayUtc("2026-08-06").toISOString()).toBe("2026-08-05T18:00:00.000Z");
  });

  it("endOfDayUtc includes the whole final day", () => {
    expect(endOfDayUtc("2026-08-06").toISOString()).toBe("2026-08-06T17:59:59.999Z");
  });
});

describe("resolvePreset", () => {
  const now = new Date("2026-08-06T09:00:00.000Z"); // 15:00 Dhaka, Aug 6

  it("today is a single day", () => {
    expect(resolvePreset("today", now)).toEqual({
      fromDay: "2026-08-06",
      toDay: "2026-08-06",
    });
  });

  it("last7 spans 7 days including today", () => {
    expect(resolvePreset("last7", now)).toEqual({
      fromDay: "2026-07-31",
      toDay: "2026-08-06",
    });
  });

  it("last30 spans 30 days including today", () => {
    expect(resolvePreset("last30", now)).toEqual({
      fromDay: "2026-07-08",
      toDay: "2026-08-06",
    });
  });

  it("thisMonth runs from the 1st to today", () => {
    expect(resolvePreset("thisMonth", now)).toEqual({
      fromDay: "2026-08-01",
      toDay: "2026-08-06",
    });
  });

  it("lastMonth covers the whole previous month", () => {
    expect(resolvePreset("lastMonth", now)).toEqual({
      fromDay: "2026-07-01",
      toDay: "2026-07-31",
    });
  });

  it("thisYear runs from Jan 1 to today", () => {
    expect(resolvePreset("thisYear", now)).toEqual({
      fromDay: "2026-01-01",
      toDay: "2026-08-06",
    });
  });
});

describe("parseDateRange", () => {
  const now = new Date("2026-08-06T09:00:00.000Z");

  it("defaults to the last 30 days when nothing is supplied", () => {
    expect(parseDateRange(undefined, undefined, now)).toEqual(resolvePreset("last30", now));
  });

  it("accepts valid YYYY-MM-DD strings", () => {
    expect(parseDateRange("2026-07-01", "2026-07-31", now)).toEqual({
      fromDay: "2026-07-01",
      toDay: "2026-07-31",
    });
  });

  it("falls back to the default when a value is unparseable", () => {
    expect(parseDateRange("garbage", "2026-07-31", now)).toEqual(resolvePreset("last30", now));
    expect(parseDateRange("2026-13-45", "2026-07-31", now)).toEqual(resolvePreset("last30", now));
  });

  it("falls back to the default when only one bound is supplied", () => {
    expect(parseDateRange("2026-07-01", undefined, now)).toEqual(resolvePreset("last30", now));
  });

  it("swaps the bounds when they arrive reversed", () => {
    expect(parseDateRange("2026-07-31", "2026-07-01", now)).toEqual({
      fromDay: "2026-07-01",
      toDay: "2026-07-31",
    });
  });

  it("ignores array values from repeated query params", () => {
    expect(parseDateRange(["2026-07-01"], "2026-07-31", now)).toEqual(
      resolvePreset("last30", now)
    );
  });
});

describe("eachDayInRange", () => {
  it("returns every day inclusive of both bounds", () => {
    expect(eachDayInRange({ fromDay: "2026-08-04", toDay: "2026-08-07" })).toEqual([
      "2026-08-04",
      "2026-08-05",
      "2026-08-06",
      "2026-08-07",
    ]);
  });

  it("returns a single day when both bounds match", () => {
    expect(eachDayInRange({ fromDay: "2026-08-06", toDay: "2026-08-06" })).toEqual([
      "2026-08-06",
    ]);
  });

  it("crosses month boundaries", () => {
    expect(eachDayInRange({ fromDay: "2026-07-30", toDay: "2026-08-02" })).toEqual([
      "2026-07-30",
      "2026-07-31",
      "2026-08-01",
      "2026-08-02",
    ]);
  });
});

describe("formatRangeLabel", () => {
  it("shows both ends of a multi-day range", () => {
    expect(formatRangeLabel({ fromDay: "2026-07-01", toDay: "2026-07-31" })).toBe(
      "1 Jul 2026 — 31 Jul 2026"
    );
  });

  it("collapses a single-day range", () => {
    expect(formatRangeLabel({ fromDay: "2026-08-06", toDay: "2026-08-06" })).toBe("6 Aug 2026");
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run tests/unit/date-range.test.ts`
Expected: FAIL — `Failed to resolve import "@/lib/dateRange"`.

- [ ] **Step 3: Write the implementation**

Create `lib/dateRange.ts`:

```ts
/**
 * All reporting day boundaries live here.
 *
 * Reports are read by a single workshop in Bangladesh, so a "day" means a
 * Dhaka calendar day — not a UTC day and not the server's local day. Asia/Dhaka
 * is UTC+6 year-round with no daylight saving, so a fixed offset is exact and
 * keeps these functions deterministic no matter what TZ the test runner or the
 * production host is set to.
 *
 * MongoDB aggregations that group by day MUST pass `timezone: REPORT_TIMEZONE`
 * to $dateToString so their day keys line up with dayKey() here.
 */

export const REPORT_TIMEZONE = "Asia/Dhaka";

const OFFSET_MS = 6 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

/** A calendar day in Dhaka, formatted "YYYY-MM-DD". */
export type DayKey = string;

export type DateRange = { fromDay: DayKey; toDay: DayKey };

export type RangePreset =
  | "today"
  | "last7"
  | "last30"
  | "thisMonth"
  | "lastMonth"
  | "thisYear";

export const RANGE_PRESETS: { value: RangePreset; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "last7", label: "Last 7 days" },
  { value: "last30", label: "Last 30 days" },
  { value: "thisMonth", label: "This month" },
  { value: "lastMonth", label: "Last month" },
  { value: "thisYear", label: "This year" },
];

const DAY_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/** The Dhaka calendar day that a given instant falls on. */
export function dayKey(date: Date): DayKey {
  return new Date(date.getTime() + OFFSET_MS).toISOString().slice(0, 10);
}

/** The first instant of a Dhaka day, as a UTC Date. */
export function startOfDayUtc(day: DayKey): Date {
  return new Date(Date.parse(`${day}T00:00:00.000Z`) - OFFSET_MS);
}

/** The last instant of a Dhaka day, as a UTC Date. Inclusive. */
export function endOfDayUtc(day: DayKey): Date {
  return new Date(startOfDayUtc(day).getTime() + DAY_MS - 1);
}

/** True only for a well-formed day key that names a real calendar date. */
export function isValidDayKey(value: unknown): value is DayKey {
  if (typeof value !== "string" || !DAY_KEY_PATTERN.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) return false;
  // Rejects overflow like "2026-02-31", which Date silently rolls forward.
  return parsed.toISOString().slice(0, 10) === value;
}

function shiftDay(day: DayKey, deltaDays: number): DayKey {
  const shifted = new Date(Date.parse(`${day}T00:00:00.000Z`) + deltaDays * DAY_MS);
  return shifted.toISOString().slice(0, 10);
}

export function resolvePreset(preset: RangePreset, now: Date = new Date()): DateRange {
  const today = dayKey(now);

  // No `default` branch: the switch covers every RangePreset member, so
  // TypeScript proves exhaustiveness and a future preset becomes a compile error.
  switch (preset) {
    case "today":
      return { fromDay: today, toDay: today };
    case "last7":
      return { fromDay: shiftDay(today, -6), toDay: today };
    case "last30":
      return { fromDay: shiftDay(today, -29), toDay: today };
    case "thisMonth":
      return { fromDay: `${today.slice(0, 7)}-01`, toDay: today };
    case "lastMonth": {
      const lastDayOfPrevMonth = shiftDay(`${today.slice(0, 7)}-01`, -1);
      return {
        fromDay: `${lastDayOfPrevMonth.slice(0, 7)}-01`,
        toDay: lastDayOfPrevMonth,
      };
    }
    case "thisYear":
      return { fromDay: `${today.slice(0, 4)}-01-01`, toDay: today };
  }
}

/**
 * Turns raw query-string values into a range. Anything malformed, partial, or
 * duplicated (Next gives string[] for repeated params) falls back to the
 * 30-day default rather than throwing, so a hand-edited URL can't break the page.
 */
export function parseDateRange(from: unknown, to: unknown, now: Date = new Date()): DateRange {
  if (!isValidDayKey(from) || !isValidDayKey(to)) {
    return resolvePreset("last30", now);
  }
  return from <= to ? { fromDay: from, toDay: to } : { fromDay: to, toDay: from };
}

/** Every day from fromDay to toDay, both inclusive. */
export function eachDayInRange(range: DateRange): DayKey[] {
  const days: DayKey[] = [];
  let cursor = range.fromDay;
  while (cursor <= range.toDay) {
    days.push(cursor);
    cursor = shiftDay(cursor, 1);
  }
  return days;
}

const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

function formatDay(day: DayKey): string {
  const [year, month, date] = day.split("-").map(Number);
  return `${date} ${MONTH_NAMES[month - 1]} ${year}`;
}

export function formatRangeLabel(range: DateRange): string {
  if (range.fromDay === range.toDay) return formatDay(range.fromDay);
  return `${formatDay(range.fromDay)} — ${formatDay(range.toDay)}`;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run tests/unit/date-range.test.ts`
Expected: PASS — all tests green.

- [ ] **Step 5: Commit**

```bash
git add lib/dateRange.ts tests/unit/date-range.test.ts
git commit -m "feat(lib): add Dhaka-timezone date range helpers"
```

---

## Task 2: Range-aware finance aggregations

Fix the exclusive end-date bug and make the daily series cover the whole range with no gaps.

**Files:**
- Modify: `actions/accounts.ts`
- Test: `tests/integration/finance-date-range.test.ts`

**Interfaces:**
- Consumes: `parseDateRange`, `eachDayInRange`, `startOfDayUtc`, `endOfDayUtc`, `REPORT_TIMEZONE`, `type DateRange` from `@/lib/dateRange` (Task 1).
- Produces:
  - `getFinanceDashboardSummary(range: DateRange)` — same return shape as today.
  - `getDailyIncomeExpense(range: DateRange)` → `{ date: DayKey; income: number; expense: number }[]`, one row per day in the range.
  - `listAccountTransactions` keeps its current `TransactionFilters` shape (`from`/`to` as `YYYY-MM-DD` strings).

Both action signatures change from loose optional strings to a single `DateRange`, so callers cannot accidentally pass a half-range.

- [ ] **Step 1: Write the failing test**

Create `tests/integration/finance-date-range.test.ts`:

```ts
import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";

vi.mock("@/lib/auth");
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { setMockSession } from "@/lib/__mocks__/auth";
import { setupTestDatabase, teardownTestDatabase, clearTestDatabase } from "../helpers/db";
import { connectToDatabase } from "@/lib/db";
import { AccountTransaction } from "@/models/AccountTransaction";
import { getFinanceDashboardSummary, getDailyIncomeExpense } from "@/actions/accounts";
import { startOfDayUtc, endOfDayUtc } from "@/lib/dateRange";

const RANGE = { fromDay: "2026-07-01", toDay: "2026-07-31" };

beforeAll(async () => {
  await setupTestDatabase();
  setMockSession({ user: { id: "507f1f77bcf86cd799439011", role: "admin" } });
});

afterAll(async () => {
  await teardownTestDatabase();
});

beforeEach(async () => {
  await clearTestDatabase();
  setMockSession({ user: { id: "507f1f77bcf86cd799439011", role: "admin" } });
});

async function seedIncome(at: Date, amount: number) {
  await AccountTransaction.create({
    type: "income",
    category: "service_sale",
    amount,
    paymentMethod: "cash",
    date: at,
  });
}

describe("finance dashboard date range", () => {
  it("includes transactions on the very first and very last day of the range", async () => {
    await connectToDatabase();

    await seedIncome(startOfDayUtc("2026-07-01"), 100); // first instant of the range
    await seedIncome(endOfDayUtc("2026-07-31"), 200); // last instant of the range

    const summary = await getFinanceDashboardSummary(RANGE);
    expect(summary.totalIncome).toBe(300);
  });

  it("excludes transactions just outside either bound", async () => {
    await connectToDatabase();

    await seedIncome(endOfDayUtc("2026-06-30"), 999); // one ms before the range
    await seedIncome(startOfDayUtc("2026-08-01"), 888); // one ms after the range
    await seedIncome(startOfDayUtc("2026-07-15"), 50); // inside

    const summary = await getFinanceDashboardSummary(RANGE);
    expect(summary.totalIncome).toBe(50);
  });

  it("groups a late-evening transaction into the Dhaka day, not the UTC day", async () => {
    await connectToDatabase();

    // 2026-07-31T20:00:00Z is 2026-08-01 02:00 in Dhaka, so it is OUT of range.
    await seedIncome(new Date("2026-07-31T20:00:00.000Z"), 700);

    const summary = await getFinanceDashboardSummary(RANGE);
    expect(summary.totalIncome).toBe(0);
  });

  it("returns one daily row per day in the range, zero-filled", async () => {
    await connectToDatabase();

    await seedIncome(startOfDayUtc("2026-07-02"), 40);

    const daily = await getDailyIncomeExpense({ fromDay: "2026-07-01", toDay: "2026-07-05" });

    expect(daily).toHaveLength(5);
    expect(daily.map((d) => d.date)).toEqual([
      "2026-07-01",
      "2026-07-02",
      "2026-07-03",
      "2026-07-04",
      "2026-07-05",
    ]);
    expect(daily[0]).toEqual({ date: "2026-07-01", income: 0, expense: 0 });
    expect(daily[1]).toEqual({ date: "2026-07-02", income: 40, expense: 0 });
    expect(daily[4]).toEqual({ date: "2026-07-05", income: 0, expense: 0 });
  });

  it("sums income and expense on the same day into one row", async () => {
    await connectToDatabase();

    await seedIncome(startOfDayUtc("2026-07-03"), 100);
    await seedIncome(endOfDayUtc("2026-07-03"), 25);
    await AccountTransaction.create({
      type: "expense",
      category: "operational_cost",
      amount: 60,
      paymentMethod: "cash",
      date: startOfDayUtc("2026-07-03"),
    });

    const daily = await getDailyIncomeExpense({ fromDay: "2026-07-03", toDay: "2026-07-03" });

    expect(daily).toEqual([{ date: "2026-07-03", income: 125, expense: 60 }]);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run tests/integration/finance-date-range.test.ts`
Expected: FAIL — `getFinanceDashboardSummary` currently takes `(from?, to?)` strings, so passing a `DateRange` object filters nothing and the "excludes transactions just outside either bound" test reports `1937` instead of `50`.

- [ ] **Step 3: Update the aggregations**

In `actions/accounts.ts`, add the import near the other `@/lib` imports:

```ts
import {
  startOfDayUtc,
  endOfDayUtc,
  eachDayInRange,
  REPORT_TIMEZONE,
  type DateRange,
} from "@/lib/dateRange";
```

Replace `buildDateRangeFilter` with a range-based version:

```ts
/**
 * `to` is inclusive of the entire final day. Building it from a bare
 * `new Date("2026-07-31")` would land on midnight and silently drop that
 * whole day's transactions.
 */
function buildRangeFilter(range: DateRange) {
  return {
    date: {
      $gte: startOfDayUtc(range.fromDay),
      $lte: endOfDayUtc(range.toDay),
    },
  };
}
```

Update `listAccountTransactions` so its existing string filters still work:

```ts
export async function listAccountTransactions(filters: TransactionFilters = {}) {
  await requireRole(["admin", "manager"]);
  await connectToDatabase();

  const filter: Record<string, unknown> = {};
  if (filters.from && filters.to) {
    Object.assign(filter, buildRangeFilter({ fromDay: filters.from, toDay: filters.to }));
  } else if (filters.from) {
    filter.date = { $gte: startOfDayUtc(filters.from) };
  } else if (filters.to) {
    filter.date = { $lte: endOfDayUtc(filters.to) };
  }
  if (filters.type) filter.type = filters.type;
  if (filters.category) filter.category = filters.category;
  if (filters.paymentMethod) filter.paymentMethod = filters.paymentMethod;

  const transactions = await AccountTransaction.find(filter)
    .sort({ date: -1 })
    .limit(200)
    .lean();

  return serialize(transactions);
}
```

Change the summary signature and its first line:

```ts
export async function getFinanceDashboardSummary(range: DateRange) {
  await requireRole(["admin"]);
  await connectToDatabase();

  const dateFilter = buildRangeFilter(range);
  // ...rest of the function is unchanged...
```

Leave the `outstandingDues` block exactly as it is — it deliberately ignores the
range, because it answers "how much is owed right now", not "how much was owed
during this period". Add this comment above the `Invoice.find(...)` line:

```ts
      // Intentionally NOT date-filtered: outstanding dues is a live balance,
      // not a figure scoped to the selected reporting period. The UI labels it
      // "as of today" so it doesn't read as a filtering bug.
```

Replace `getDailyIncomeExpense` entirely:

```ts
export async function getDailyIncomeExpense(range: DateRange) {
  await requireRole(["admin"]);
  await connectToDatabase();

  const rows = await AccountTransaction.aggregate([
    { $match: buildRangeFilter(range) },
    {
      $group: {
        _id: {
          day: {
            $dateToString: {
              format: "%Y-%m-%d",
              date: "$date",
              timezone: REPORT_TIMEZONE,
            },
          },
          type: "$type",
        },
        total: { $sum: "$amount" },
      },
    },
  ]);

  // Zero-fill: the chart needs a continuous line, and a sparse series would
  // silently compress quiet days out of the x-axis.
  const byDay = new Map(
    eachDayInRange(range).map((day) => [day, { date: day, income: 0, expense: 0 }])
  );

  for (const row of rows) {
    const entry = byDay.get(row._id.day as string);
    if (!entry) continue; // defensive: a day outside the range can't happen
    if (row._id.type === "income") entry.income = row.total;
    else entry.expense = row.total;
  }

  return serialize(Array.from(byDay.values()));
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run tests/integration/finance-date-range.test.ts`
Expected: PASS.

- [ ] **Step 5: Fix every existing caller**

Four files call the old signatures. All of them must be updated or the build breaks.

**(a) `tests/integration/invoice-delete.test.ts`** — add to the imports:

```ts
import { resolvePreset } from "@/lib/dateRange";
```

and replace both `await getFinanceDashboardSummary()` calls (lines 58 and 75) with:

```ts
await getFinanceDashboardSummary(resolvePreset("thisYear"))
```

**(b) `tests/integration/role-enforcement.test.ts`** — line 50 asserts the action
rejects a manager session. It still needs a valid argument to type-check. Add the
same `resolvePreset` import and change the call to:

```ts
    await expect(
      getFinanceDashboardSummary(resolvePreset("thisYear"))
    ).rejects.toThrow("Unauthorized");
```

**(c) `app/(dashboard)/dashboard/page.tsx`** — the main dashboard compares this
month against last month using a local `monthRange()` helper (lines 17–25) that
has the same UTC-vs-Dhaka drift the presets now fix. Delete `monthRange` entirely
and replace its two call sites.

Add the import:

```ts
import { resolvePreset } from "@/lib/dateRange";
```

Replace lines 89–95 with:

```ts
  const [thisMonthSummary, prevMonthSummary, daily, topVehicles, attendanceSummary] =
    await Promise.all([
      getFinanceDashboardSummary(resolvePreset("thisMonth")),
      getFinanceDashboardSummary(resolvePreset("lastMonth")),
      getDailyIncomeExpense(resolvePreset("last30")),
      getTopServicedVehicles(),
      getTodayAttendanceSummary(),
    ]);
```

This is a behaviour change worth noting: "this month" now ends at the end of
today rather than at the current clock time, so a payment taken minutes ago is
included. That is what the stat card claims to show.

**(d) `app/(dashboard)/accounts/dashboard/page.tsx`** — change the data fetch to:

```ts
  const range = resolvePreset("last30");
  const [summary, daily] = await Promise.all([
    getFinanceDashboardSummary(range),
    getDailyIncomeExpense(range),
  ]);
```

adding `import { resolvePreset } from "@/lib/dateRange";` at the top. Task 4
replaces this with the real `searchParams` wiring; this step only keeps the build
green.

- [ ] **Step 6: Run the whole suite and the type check**

Run: `npm test`
Expected: PASS — no regressions in `invoice-delete` or `dashboard-aggregations`.

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add actions/accounts.ts tests/integration/finance-date-range.test.ts tests/integration/invoice-delete.test.ts tests/integration/role-enforcement.test.ts "app/(dashboard)/dashboard/page.tsx" "app/(dashboard)/accounts/dashboard/page.tsx"
git commit -m "fix(accounts): make date range end inclusive and zero-fill daily series"
```

---

## Task 3: Popover and calendar primitives

**Files:**
- Create: `components/ui/popover.tsx`
- Create: `components/ui/calendar.tsx`
- Modify: `package.json` (via `npm install`)
- Test: `tests/components/calendar.test.tsx`

**Interfaces:**
- Consumes: `cn` from `@/lib/utils`.
- Produces:
  - `Popover`, `PopoverTrigger`, `PopoverContent` from `@/components/ui/popover`
  - `type CalendarRange = { from?: Date; to?: Date }` from `@/components/ui/calendar`
  - `Calendar` from `@/components/ui/calendar`, props: `{ selected?: CalendarRange; onSelect: (range: CalendarRange | undefined) => void; numberOfMonths?: number; disabled?: (date: Date) => boolean; className?: string }`

- [ ] **Step 1: Install the dependency**

Run: `npm install react-day-picker@^10.0.1`
Expected: `package.json` gains `"react-day-picker": "^10.0.1"` under `dependencies`.

- [ ] **Step 2: Write the failing test**

Create `tests/components/calendar.test.tsx`:

```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Calendar } from "@/components/ui/calendar";

describe("Calendar", () => {
  it("renders two months side by side starting at the selected month", () => {
    render(
      <Calendar
        selected={{ from: new Date(2026, 6, 1), to: new Date(2026, 6, 31) }}
        onSelect={vi.fn()}
      />
    );

    expect(screen.getByText(/July 2026/i)).toBeInTheDocument();
    expect(screen.getByText(/August 2026/i)).toBeInTheDocument();
  });

  it("reports the clicked day through onSelect", async () => {
    const onSelect = vi.fn();
    const user = userEvent.setup();

    render(
      <Calendar
        selected={{ from: new Date(2026, 6, 1), to: new Date(2026, 6, 1) }}
        onSelect={onSelect}
      />
    );

    await user.click(screen.getByRole("button", { name: /^15$/ }));

    expect(onSelect).toHaveBeenCalled();
  });
});
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `npx vitest run tests/components/calendar.test.tsx`
Expected: FAIL — `Failed to resolve import "@/components/ui/calendar"`.

- [ ] **Step 4: Create the popover wrapper**

Create `components/ui/popover.tsx`. This mirrors `components/ui/dialog.tsx`
one-for-one — same `data-slot` convention, same Base UI part names:

```tsx
"use client"

import * as React from "react"
import { Popover as PopoverPrimitive } from "@base-ui/react/popover"

import { cn } from "@/lib/utils"

function Popover({ ...props }: PopoverPrimitive.Root.Props) {
  return <PopoverPrimitive.Root data-slot="popover" {...props} />
}

function PopoverTrigger({ ...props }: PopoverPrimitive.Trigger.Props) {
  return <PopoverPrimitive.Trigger data-slot="popover-trigger" {...props} />
}

function PopoverContent({
  className,
  sideOffset = 8,
  align = "start",
  ...props
}: PopoverPrimitive.Popup.Props & {
  sideOffset?: number
  align?: PopoverPrimitive.Positioner.Props["align"]
}) {
  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Positioner sideOffset={sideOffset} align={align} className="z-50">
        <PopoverPrimitive.Popup
          data-slot="popover-content"
          className={cn(
            "w-auto rounded-xl bg-popover p-3 text-sm text-popover-foreground ring-1 ring-foreground/10 shadow-lg duration-100 outline-none data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95",
            className
          )}
          {...props}
        />
      </PopoverPrimitive.Positioner>
    </PopoverPrimitive.Portal>
  )
}

export { Popover, PopoverTrigger, PopoverContent }
```

- [ ] **Step 5: Create the calendar**

Create `components/ui/calendar.tsx`. `react-day-picker` v10 ships its own
stylesheet, but this project is Tailwind-only, so pass `classNames` explicitly
rather than importing `react-day-picker/style.css`:

```tsx
"use client"

import * as React from "react"
import { DayPicker } from "react-day-picker"
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react"

import { cn } from "@/lib/utils"

export type CalendarRange = { from?: Date; to?: Date }

export function Calendar({
  selected,
  onSelect,
  numberOfMonths = 2,
  disabled,
  className,
}: {
  selected?: CalendarRange
  onSelect: (range: CalendarRange | undefined) => void
  numberOfMonths?: number
  disabled?: (date: Date) => boolean
  className?: string
}) {
  return (
    <DayPicker
      mode="range"
      selected={selected as never}
      onSelect={onSelect as never}
      numberOfMonths={numberOfMonths}
      defaultMonth={selected?.from}
      disabled={disabled}
      showOutsideDays
      components={{
        Chevron: ({ orientation }) =>
          orientation === "left" ? (
            <ChevronLeftIcon className="size-4" />
          ) : (
            <ChevronRightIcon className="size-4" />
          ),
      }}
      className={cn("p-1", className)}
      classNames={{
        months: "flex flex-col gap-4 sm:flex-row",
        month: "space-y-3",
        month_caption: "flex h-8 items-center justify-center",
        caption_label: "text-sm font-medium",
        nav: "flex items-center gap-1",
        button_previous:
          "absolute left-2 top-2 inline-flex size-7 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
        button_next:
          "absolute right-2 top-2 inline-flex size-7 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
        month_grid: "w-full border-collapse",
        weekdays: "flex",
        weekday:
          "w-9 text-[11px] font-medium uppercase tracking-wide text-muted-foreground",
        week: "mt-1 flex w-full",
        day: "size-9 p-0 text-center text-sm",
        day_button:
          "size-9 rounded-lg font-normal transition-colors hover:bg-muted aria-selected:opacity-100",
        selected: "bg-primary text-primary-foreground hover:bg-primary",
        range_start: "rounded-l-lg bg-primary text-primary-foreground",
        range_end: "rounded-r-lg bg-primary text-primary-foreground",
        range_middle: "bg-primary/15 text-foreground",
        today: "font-semibold text-primary",
        outside: "text-muted-foreground/40",
        disabled: "text-muted-foreground/30 pointer-events-none",
        hidden: "invisible",
      }}
    />
  )
}
```

- [ ] **Step 6: Run the test to verify it passes**

Run: `npx vitest run tests/components/calendar.test.tsx`
Expected: PASS.

If the "renders two months" assertion fails because the caption text is split
across elements, use `screen.getByText((_, el) => el?.textContent === "July 2026")`
instead — do not weaken the assertion to a substring match on the whole document.

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json components/ui/popover.tsx components/ui/calendar.tsx tests/components/calendar.test.tsx
git commit -m "feat(ui): add Base UI popover and react-day-picker range calendar"
```

---

## Task 4: Date range picker wired into the Finance Dashboard

**Files:**
- Create: `app/(dashboard)/accounts/dashboard/date-range-picker.tsx`
- Modify: `app/(dashboard)/accounts/dashboard/page.tsx`
- Test: `tests/components/date-range-picker.test.tsx`

**Interfaces:**
- Consumes: `Popover`/`PopoverTrigger`/`PopoverContent` (Task 3), `Calendar` (Task 3), `parseDateRange`/`resolvePreset`/`formatRangeLabel`/`RANGE_PRESETS`/`startOfDayUtc`/`dayKey`/`type DateRange` (Task 1), `getFinanceDashboardSummary`/`getDailyIncomeExpense` (Task 2).
- Produces: `DateRangePicker` — props `{ range: DateRange }`. Pushes `?from=YYYY-MM-DD&to=YYYY-MM-DD` on change.

- [ ] **Step 1: Write the failing test**

Create `tests/components/date-range-picker.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const push = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, replace: vi.fn(), refresh: vi.fn() }),
  usePathname: () => "/accounts/dashboard",
}));

import { DateRangePicker } from "@/app/(dashboard)/accounts/dashboard/date-range-picker";

beforeEach(() => {
  push.mockClear();
  vi.setSystemTime(new Date("2026-08-06T09:00:00.000Z"));
});

describe("DateRangePicker", () => {
  it("shows the active range as a human label", () => {
    render(<DateRangePicker range={{ fromDay: "2026-07-01", toDay: "2026-07-31" }} />);

    expect(screen.getByText("1 Jul 2026 — 31 Jul 2026")).toBeInTheDocument();
  });

  it("pushes the resolved range when a preset is clicked", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<DateRangePicker range={{ fromDay: "2026-07-01", toDay: "2026-07-31" }} />);

    await user.click(screen.getByRole("button", { name: "This month" }));

    expect(push).toHaveBeenCalledWith(
      "/accounts/dashboard?from=2026-08-01&to=2026-08-06"
    );
  });

  it("marks the preset matching the current range as active", () => {
    render(<DateRangePicker range={{ fromDay: "2026-08-01", toDay: "2026-08-06" }} />);

    expect(screen.getByRole("button", { name: "This month" })).toHaveAttribute(
      "data-active",
      "true"
    );
  });
});
```

Add fake timers around the suite by putting this immediately after the imports:

```tsx
vi.useFakeTimers({ shouldAdvanceTime: true });
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run tests/components/date-range-picker.test.tsx`
Expected: FAIL — cannot resolve `date-range-picker`.

- [ ] **Step 3: Write the picker**

Create `app/(dashboard)/accounts/dashboard/date-range-picker.tsx`:

```tsx
"use client";

import * as React from "react";
import { useRouter, usePathname } from "next/navigation";
import { CalendarDays } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Calendar, type CalendarRange } from "@/components/ui/calendar";
import {
  RANGE_PRESETS,
  resolvePreset,
  formatRangeLabel,
  startOfDayUtc,
  dayKey,
  type DateRange,
  type RangePreset,
} from "@/lib/dateRange";
import { cn } from "@/lib/utils";

function sameRange(a: DateRange, b: DateRange) {
  return a.fromDay === b.fromDay && a.toDay === b.toDay;
}

export function DateRangePicker({ range }: { range: DateRange }) {
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = React.useState(false);

  const apply = React.useCallback(
    (next: DateRange) => {
      router.push(`${pathname}?from=${next.fromDay}&to=${next.toDay}`);
    },
    [router, pathname]
  );

  const handlePreset = (preset: RangePreset) => {
    apply(resolvePreset(preset));
  };

  const handleCalendar = (selected: CalendarRange | undefined) => {
    if (!selected?.from) return;
    // react-day-picker leaves `to` undefined mid-selection; treat a lone click
    // as a single-day range so the dashboard updates immediately.
    const next: DateRange = {
      fromDay: dayKey(selected.from),
      toDay: dayKey(selected.to ?? selected.from),
    };
    setOpen(false);
    apply(next);
  };

  const calendarSelection: CalendarRange = {
    from: startOfDayUtc(range.fromDay),
    to: startOfDayUtc(range.toDay),
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      {RANGE_PRESETS.map((preset) => {
        const isActive = sameRange(range, resolvePreset(preset.value));
        return (
          <Button
            key={preset.value}
            type="button"
            size="sm"
            variant={isActive ? "default" : "outline"}
            data-active={isActive ? "true" : "false"}
            onClick={() => handlePreset(preset.value)}
            className="h-8 rounded-full px-3 text-xs"
          >
            {preset.label}
          </Button>
        );
      })}

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          render={
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-8 gap-2 rounded-full px-3 text-xs"
            />
          }
        >
          <CalendarDays className="size-3.5" />
          <span className={cn("font-medium")}>{formatRangeLabel(range)}</span>
        </PopoverTrigger>
        <PopoverContent>
          <Calendar
            selected={calendarSelection}
            onSelect={handleCalendar}
            disabled={(date) => date.getTime() > Date.now()}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
```

Note the `render={...}` prop on `PopoverTrigger` — that is the Base UI way of
composing a trigger with your own button, the same pattern `dialog.tsx` uses for
its close button. Do not reach for Radix's `asChild`.

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run tests/components/date-range-picker.test.tsx`
Expected: PASS.

- [ ] **Step 5: Wire the page to searchParams**

Replace `app/(dashboard)/accounts/dashboard/page.tsx` entirely:

```tsx
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/stat-card";
import { requirePageRole } from "@/lib/auth";
import { getFinanceDashboardSummary, getDailyIncomeExpense } from "@/actions/accounts";
import { parseDateRange, formatRangeLabel } from "@/lib/dateRange";
import { CHART_COLORS } from "@/lib/chartColors";
import { IncomeExpenseChart } from "./income-expense-chart";
import { DateRangePicker } from "./date-range-picker";

export default async function FinanceDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  await requirePageRole(["admin"]);

  const { from, to } = await searchParams;
  const range = parseDateRange(from, to);

  const [summary, daily] = await Promise.all([
    getFinanceDashboardSummary(range),
    getDailyIncomeExpense(range),
  ]);

  const incomeSparkline = daily.map((d: { income: number }) => ({ value: d.income }));
  const expenseSparkline = daily.map((d: { expense: number }) => ({ value: d.expense }));
  const profitSparkline = daily.map((d: { income: number; expense: number }) => ({
    value: d.income - d.expense,
  }));

  const rangeLabel = formatRangeLabel(range);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold">Finance Dashboard</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">{rangeLabel}</p>
        </div>
      </div>

      <DateRangePicker range={range} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Sales"
          value={`৳${summary.totalIncome.toFixed(2)}`}
          sparkline={incomeSparkline}
          sparklineColor={CHART_COLORS.success}
        />
        <StatCard
          title="Net Profit"
          value={`৳${summary.netProfit.toFixed(2)}`}
          sparkline={profitSparkline}
          sparklineColor={CHART_COLORS.chart3}
        />
        <StatCard
          title="Outstanding Dues (as of today)"
          value={`৳${summary.outstandingDues.toFixed(2)}`}
        />
        <StatCard
          title="Total Expense"
          value={`৳${summary.totalExpense.toFixed(2)}`}
          sparkline={expenseSparkline}
          sparklineColor={CHART_COLORS.destructive}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Cash / Bank / Mobile Banking Split</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-3 gap-4 text-sm">
          {summary.byPaymentMethod.map((p) => (
            <div key={p.paymentMethod} className="space-y-1">
              <p className="font-medium capitalize">{p.paymentMethod.replace("_", " ")}</p>
              <p className="text-success">Income: ৳{p.income.toFixed(2)}</p>
              <p className="text-destructive">Expense: ৳{p.expense.toFixed(2)}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Income vs Expense — {rangeLabel}</CardTitle>
        </CardHeader>
        <CardContent>
          <IncomeExpenseChart data={daily} />
        </CardContent>
      </Card>
    </div>
  );
}
```

Before writing this file, read
`node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/page.md`
to confirm the `searchParams` prop shape for this Next version.

- [ ] **Step 6: Verify the whole suite and types**

Run: `npm test`
Expected: PASS.

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 7: Verify in the running app**

Run: `npm run dev`, open `/accounts/dashboard`.
Expected: preset buttons render; clicking "This month" changes the URL to
`?from=…&to=…` and every stat card plus the chart title update. Reloading the
URL keeps the same range. The chart line has no gaps on days with no
transactions.

- [ ] **Step 8: Commit**

```bash
git add "app/(dashboard)/accounts/dashboard/date-range-picker.tsx" "app/(dashboard)/accounts/dashboard/page.tsx" tests/components/date-range-picker.test.tsx
git commit -m "feat(accounts): add date range filter to finance dashboard"
```

---

## Task 5: Link invoices to the discount card they used

**Files:**
- Modify: `models/Invoice.ts`
- Modify: `actions/invoices.ts`
- Test: `tests/integration/discount-card-usage.test.ts` (first half)

**Interfaces:**
- Consumes: `findActiveDiscountCard` from `@/actions/discountCards` (already exists).
- Produces:
  - `Invoice.discountCardId: ObjectId | null`
  - `getActiveDiscountCardInfo(customerId: string): Promise<{ cardId: string | null; discountPercent: number }>` exported from `actions/invoices.ts`
  - `getActiveDiscountForCustomer(customerId: string): Promise<number>` keeps its existing signature — `app/api/job-cards/[id]/pdf/route.ts:99` depends on it.

- [ ] **Step 1: Write the failing test**

Create `tests/integration/discount-card-usage.test.ts`:

```ts
import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";
import mongoose from "mongoose";

vi.mock("@/lib/auth");
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { setMockSession } from "@/lib/__mocks__/auth";
import { setupTestDatabase, teardownTestDatabase, clearTestDatabase } from "../helpers/db";
import { connectToDatabase } from "@/lib/db";
import { Invoice } from "@/models/Invoice";
import { JobCard } from "@/models/JobCard";
import { Customer } from "@/models/Customer";
import { DiscountCard } from "@/models/DiscountCard";
import { generateInvoiceFromJobCard } from "@/actions/invoices";

beforeAll(async () => {
  await setupTestDatabase();
  setMockSession({ user: { id: "507f1f77bcf86cd799439011", role: "admin" } });
});

afterAll(async () => {
  await teardownTestDatabase();
});

beforeEach(async () => {
  await clearTestDatabase();
  setMockSession({ user: { id: "507f1f77bcf86cd799439011", role: "admin" } });
});

async function seedCustomerWithJobCard() {
  const customer = await Customer.create({ name: "Rahim", phone: "01700000001" });
  const jobCard = await JobCard.create({
    jobCardNumber: `JC-${Date.now()}`,
    vehicleId: new mongoose.Types.ObjectId(),
    customerId: customer._id,
    status: "completed",
    tasks: [
      {
        description: "Engine tuning",
        assignedTo: new mongoose.Types.ObjectId(),
        assignedDate: new Date(),
      },
    ],
    partsUsed: [],
  });
  return { customer, jobCard };
}

describe("invoice → discount card link", () => {
  it("records which card supplied the discount", async () => {
    await connectToDatabase();
    const { customer, jobCard } = await seedCustomerWithJobCard();

    const card = await DiscountCard.create({
      customerId: customer._id,
      discountPercent: 10,
      validFrom: new Date(Date.now() - 86400000),
      validTo: null,
      active: true,
    });

    const result = await generateInvoiceFromJobCard(jobCard._id.toString());
    expect(result.success).toBe(true);

    const invoice = await Invoice.findById(
      result.success ? result.data.id : ""
    ).lean();
    expect(invoice?.discountPercent).toBe(10);
    expect(invoice?.discountCardId?.toString()).toBe(card._id.toString());
  });

  it("leaves discountCardId null when the customer has no card", async () => {
    await connectToDatabase();
    const { jobCard } = await seedCustomerWithJobCard();

    const result = await generateInvoiceFromJobCard(jobCard._id.toString());
    expect(result.success).toBe(true);

    const invoice = await Invoice.findById(
      result.success ? result.data.id : ""
    ).lean();
    expect(invoice?.discountPercent).toBe(0);
    expect(invoice?.discountCardId).toBeNull();
  });

  it("leaves discountCardId null when the only card is expired", async () => {
    await connectToDatabase();
    const { customer, jobCard } = await seedCustomerWithJobCard();

    await DiscountCard.create({
      customerId: customer._id,
      discountPercent: 15,
      validFrom: new Date(Date.now() - 30 * 86400000),
      validTo: new Date(Date.now() - 86400000),
      active: true,
    });

    const result = await generateInvoiceFromJobCard(jobCard._id.toString());
    const invoice = await Invoice.findById(
      result.success ? result.data.id : ""
    ).lean();

    expect(invoice?.discountCardId).toBeNull();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run tests/integration/discount-card-usage.test.ts`
Expected: FAIL — `expected undefined to be '…'`, because `discountCardId` is not on the schema.

- [ ] **Step 3: Add the schema field**

In `models/Invoice.ts`, inside `invoiceSchema`, add immediately after the
`discountPercent` line:

```ts
    discountCardId: {
      type: Schema.Types.ObjectId,
      ref: "DiscountCard",
      default: null,
    },
```

and add this index next to the existing `jobCardId` index:

```ts
invoiceSchema.index({ discountCardId: 1, status: 1 });
```

The compound index matches how usage is queried in Task 6 (`discountCardId` plus
`status: "paid"`).

- [ ] **Step 4: Persist the card id when generating an invoice**

In `actions/invoices.ts`, add a new export next to the existing
`getActiveDiscountForCustomer` — **keep the old function**, the job-card PDF
route imports it:

```ts
/**
 * Returns both the discount percentage and which card granted it, so the
 * invoice can record the source. getActiveDiscountForCustomer stays for
 * callers that only need the number (app/api/job-cards/[id]/pdf/route.ts).
 */
export async function getActiveDiscountCardInfo(
  customerId: string
): Promise<{ cardId: string | null; discountPercent: number }> {
  const card = await findActiveDiscountCard(customerId);
  return {
    cardId: card ? card._id.toString() : null,
    discountPercent: card?.discountPercent ?? 0,
  };
}
```

In `generateInvoiceFromJobCard`, replace:

```ts
  const discountPercent = await getActiveDiscountForCustomer(
    jobCard.customerId.toString()
  );
```

with:

```ts
  const { cardId: discountCardId, discountPercent } = await getActiveDiscountCardInfo(
    jobCard.customerId.toString()
  );
```

and add `discountCardId,` to the `Invoice.create({ ... })` object, immediately
after the `discountPercent,` line.

- [ ] **Step 5: Run the test to verify it passes**

Run: `npx vitest run tests/integration/discount-card-usage.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add models/Invoice.ts actions/invoices.ts tests/integration/discount-card-usage.test.ts
git commit -m "feat(invoices): record which discount card an invoice used"
```

---

## Task 6: Derive discount card usage

**Files:**
- Modify: `actions/discountCards.ts`
- Test: `tests/integration/discount-card-usage.test.ts` (append)

**Interfaces:**
- Consumes: `Invoice` model with `discountCardId` (Task 5).
- Produces, all exported from `actions/discountCards.ts`:
  - `type DiscountCardUsage = { timesUsed: number; totalDiscountAmount: number }`
  - `getDiscountCardUsageMap(cardIds: string[]): Promise<Record<string, DiscountCardUsage>>`
  - `getDiscountCardUsage(cardId: string): Promise<DiscountCardUsage & { invoices: UsageInvoiceRow[] }>` where `UsageInvoiceRow = { _id: string; invoiceNumber: string; createdAt: string; subtotal: number; discountAmount: number; total: number }`
  - `getDiscountCardById(id: string)` — the card populated with `customerId` (`name`, `phone`), or `null`

- [ ] **Step 1: Write the failing test**

Append to `tests/integration/discount-card-usage.test.ts`:

```ts
import {
  getDiscountCardUsage,
  getDiscountCardUsageMap,
} from "@/actions/discountCards";

async function seedInvoice(
  cardId: mongoose.Types.ObjectId | null,
  status: "draft" | "sent" | "paid" | "partially_paid",
  discountAmount: number
) {
  return Invoice.create({
    invoiceNumber: `INV-${Math.random().toString().slice(2, 10)}`,
    jobCardId: new mongoose.Types.ObjectId(),
    customerId: new mongoose.Types.ObjectId(),
    lineItems: [
      { description: "Service Charge: Tuning", quantity: 1, unitPrice: 1000, total: 1000 },
    ],
    discountCardId: cardId,
    discountPercent: 10,
    subtotal: 1000,
    discountAmount,
    total: 1000 - discountAmount,
    status,
  });
}

describe("discount card usage", () => {
  it("counts only paid invoices", async () => {
    await connectToDatabase();
    const cardId = new mongoose.Types.ObjectId();

    await seedInvoice(cardId, "paid", 100);
    await seedInvoice(cardId, "draft", 100);
    await seedInvoice(cardId, "sent", 100);
    await seedInvoice(cardId, "partially_paid", 100);

    const usage = await getDiscountCardUsage(cardId.toString());

    expect(usage.timesUsed).toBe(1);
    expect(usage.totalDiscountAmount).toBe(100);
  });

  it("sums the discount across several paid invoices", async () => {
    await connectToDatabase();
    const cardId = new mongoose.Types.ObjectId();

    await seedInvoice(cardId, "paid", 100);
    await seedInvoice(cardId, "paid", 250.5);

    const usage = await getDiscountCardUsage(cardId.toString());

    expect(usage.timesUsed).toBe(2);
    expect(usage.totalDiscountAmount).toBe(350.5);
    expect(usage.invoices).toHaveLength(2);
    expect(usage.invoices[0]).toHaveProperty("invoiceNumber");
  });

  it("reports zero for a card that has never been used", async () => {
    await connectToDatabase();

    const usage = await getDiscountCardUsage(new mongoose.Types.ObjectId().toString());

    expect(usage).toEqual({ timesUsed: 0, totalDiscountAmount: 0, invoices: [] });
  });

  it("does not attribute unlinked invoices to any card", async () => {
    await connectToDatabase();
    const cardId = new mongoose.Types.ObjectId();

    await seedInvoice(null, "paid", 400);

    const usage = await getDiscountCardUsage(cardId.toString());
    expect(usage.timesUsed).toBe(0);
  });

  it("returns a usage entry for every requested card in one batch", async () => {
    await connectToDatabase();
    const cardA = new mongoose.Types.ObjectId();
    const cardB = new mongoose.Types.ObjectId();
    const cardC = new mongoose.Types.ObjectId();

    await seedInvoice(cardA, "paid", 100);
    await seedInvoice(cardA, "paid", 50);
    await seedInvoice(cardB, "paid", 30);

    const map = await getDiscountCardUsageMap([
      cardA.toString(),
      cardB.toString(),
      cardC.toString(),
    ]);

    expect(map[cardA.toString()]).toEqual({ timesUsed: 2, totalDiscountAmount: 150 });
    expect(map[cardB.toString()]).toEqual({ timesUsed: 1, totalDiscountAmount: 30 });
    expect(map[cardC.toString()]).toEqual({ timesUsed: 0, totalDiscountAmount: 0 });
  });

  it("returns an empty map for an empty input", async () => {
    await connectToDatabase();
    expect(await getDiscountCardUsageMap([])).toEqual({});
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run tests/integration/discount-card-usage.test.ts`
Expected: FAIL — `getDiscountCardUsage is not a function`.

- [ ] **Step 3: Implement the usage queries**

In `actions/discountCards.ts`, add these imports at the top of the import block:

```ts
import mongoose from "mongoose";
import { Invoice } from "@/models/Invoice";
```

and append these exports at the end of the file:

```ts
export type DiscountCardUsage = {
  timesUsed: number;
  totalDiscountAmount: number;
};

export type UsageInvoiceRow = {
  _id: string;
  invoiceNumber: string;
  createdAt: string;
  subtotal: number;
  discountAmount: number;
  total: number;
};

/**
 * Usage is DERIVED, never stored as a counter on the card.
 *
 * markInvoicePaid can run more than once for the same invoice (a partial
 * payment followed by the full one), so an incrementing field would
 * double-count. Querying instead stays correct through repeat payments,
 * invoice edits and invoice deletion.
 *
 * "Used" means the invoice reached status "paid" — draft, sent and
 * partially_paid do not count, because the money has not fully arrived.
 */
const PAID_STATUS = "paid";

export async function getDiscountCardUsageMap(
  cardIds: string[]
): Promise<Record<string, DiscountCardUsage>> {
  await requireRole(["admin", "manager"]);

  const empty: Record<string, DiscountCardUsage> = {};
  for (const id of cardIds) {
    empty[id] = { timesUsed: 0, totalDiscountAmount: 0 };
  }
  if (cardIds.length === 0) return empty;

  await connectToDatabase();

  const objectIds = cardIds
    .filter((id) => mongoose.Types.ObjectId.isValid(id))
    .map((id) => new mongoose.Types.ObjectId(id));

  const rows = await Invoice.aggregate([
    { $match: { discountCardId: { $in: objectIds }, status: PAID_STATUS } },
    {
      $group: {
        _id: "$discountCardId",
        timesUsed: { $sum: 1 },
        totalDiscountAmount: { $sum: "$discountAmount" },
      },
    },
  ]);

  for (const row of rows) {
    empty[row._id.toString()] = {
      timesUsed: row.timesUsed,
      totalDiscountAmount: row.totalDiscountAmount,
    };
  }

  return empty;
}

export async function getDiscountCardUsage(
  cardId: string
): Promise<DiscountCardUsage & { invoices: UsageInvoiceRow[] }> {
  await requireRole(["admin", "manager"]);
  await connectToDatabase();

  if (!mongoose.Types.ObjectId.isValid(cardId)) {
    return { timesUsed: 0, totalDiscountAmount: 0, invoices: [] };
  }

  const invoices = await Invoice.find({
    discountCardId: new mongoose.Types.ObjectId(cardId),
    status: PAID_STATUS,
  })
    .sort({ createdAt: -1 })
    .select("invoiceNumber createdAt subtotal discountAmount total")
    .lean();

  const totalDiscountAmount = invoices.reduce(
    (sum, inv) => sum + (inv.discountAmount ?? 0),
    0
  );

  return {
    timesUsed: invoices.length,
    // Guards against float drift when summing many two-decimal amounts.
    totalDiscountAmount: Math.round(totalDiscountAmount * 100) / 100,
    invoices: serialize(invoices) as UsageInvoiceRow[],
  };
}

export async function getDiscountCardById(id: string) {
  await requireRole(["admin", "manager"]);
  await connectToDatabase();

  if (!mongoose.Types.ObjectId.isValid(id)) return null;

  const card = await DiscountCard.findById(id)
    .populate("customerId", "name phone")
    .lean();

  return card ? serialize(card) : null;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run tests/integration/discount-card-usage.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add actions/discountCards.ts tests/integration/discount-card-usage.test.ts
git commit -m "feat(discount-cards): derive usage count and total discount given"
```

---

## Task 7: Show usage on the discount card list and customer page

**Files:**
- Modify: `app/(dashboard)/discount-cards/page.tsx`
- Modify: `app/(dashboard)/discount-cards/discount-card-list.tsx`
- Modify: `app/(dashboard)/customers/[id]/page.tsx`

**Interfaces:**
- Consumes: `getDiscountCardUsageMap`, `getDiscountCardUsage`, `type DiscountCardUsage` (Task 6).
- Produces: `DiscountCardList` gains a required prop `usage: Record<string, DiscountCardUsage>`.

- [ ] **Step 1: Pass the usage map from the list page**

Replace `app/(dashboard)/discount-cards/page.tsx`:

```tsx
import { requirePageRole } from "@/lib/auth";
import { listDiscountCards, getDiscountCardUsageMap } from "@/actions/discountCards";
import { DiscountCardList } from "./discount-card-list";

export default async function DiscountCardsPage() {
  await requirePageRole(["admin", "manager"]);
  const cards = await listDiscountCards();

  // One aggregate for every card on the page — never one query per card.
  const usage = await getDiscountCardUsageMap(
    cards.map((c: { _id: string }) => c._id.toString())
  );

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Discount Cards</h2>
      <DiscountCardList initialCards={cards} usage={usage} />
    </div>
  );
}
```

- [ ] **Step 2: Render the usage strip**

In `app/(dashboard)/discount-cards/discount-card-list.tsx`:

Add to the imports:

```tsx
import Link from "next/link";
import { Receipt } from "lucide-react";
import type { DiscountCardUsage } from "@/actions/discountCards";
```

Change the component signature:

```tsx
export function DiscountCardList({
  initialCards,
  usage,
}: {
  initialCards: DiscountCardRow[];
  usage: Record<string, DiscountCardUsage>;
}) {
```

Inside the `initialCards.map((card) => {` body, add below the existing
`const gradient = …` line:

```tsx
          const cardUsage = usage[card._id] ?? { timesUsed: 0, totalDiscountAmount: 0 };
```

Then, immediately **after** the closing `</div>` of the "Validity" block and
still inside `<div className="flex flex-col gap-4 p-5">`, insert the usage strip:

```tsx
                {/* Usage */}
                <div className="flex items-center justify-between rounded-xl border bg-muted/30 px-3 py-2.5">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Receipt className="size-3.5" />
                    <span>Usage</span>
                  </div>
                  {cardUsage.timesUsed === 0 ? (
                    <span className="text-xs text-muted-foreground">Not used yet</span>
                  ) : (
                    <span className="text-sm font-medium">
                      {cardUsage.timesUsed}× · ৳{cardUsage.totalDiscountAmount.toFixed(2)} saved
                    </span>
                  )}
                </div>
```

Finally make the whole card clickable. Wrap the returned `<div key={card._id} …>`
in a `Link`: change the opening of the returned JSX from

```tsx
            <div
              key={card._id}
              className={cn(
```

to

```tsx
            <Link
              key={card._id}
              href={`/discount-cards/${card._id}`}
              className={cn(
                "block",
```

and change its matching closing `</div>` (the outermost one for that card) to
`</Link>`. The `key` moves to the `Link`; do not leave a duplicate `key` on an
inner element.

- [ ] **Step 3: Show usage on the customer page**

In `app/(dashboard)/customers/[id]/page.tsx`:

Add to the imports:

```tsx
import { getDiscountCardUsage } from "@/actions/discountCards";
```

After the existing `const activeDiscountCard = await getActiveDiscountCardForCustomer(id);`
line, add:

```tsx
  const discountUsage = activeDiscountCard
    ? await getDiscountCardUsage(activeDiscountCard._id.toString())
    : null;
```

Then inside the amber `activeDiscountCard && (…)` block, replace this element:

```tsx
                    <p className="text-xs text-amber-700 dark:text-amber-400">
                      Active Membership
                    </p>
```

with:

```tsx
                    <p className="text-xs text-amber-700 dark:text-amber-400">
                      {discountUsage && discountUsage.timesUsed > 0
                        ? `Used ${discountUsage.timesUsed}× · ৳${discountUsage.totalDiscountAmount.toFixed(2)} saved`
                        : "Active Membership · not used yet"}
                    </p>
```

- [ ] **Step 4: Verify types and the suite**

Run: `npx tsc --noEmit`
Expected: no errors.

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Verify in the running app**

Run: `npm run dev`, open `/discount-cards`.
Expected: every card shows either "Not used yet" or `N× · ৳X saved`; clicking a
card navigates to `/discount-cards/<id>` (a 404 until Task 8 — that is expected
at this point). `/customers/<id>` shows the same numbers on the amber membership
banner.

- [ ] **Step 6: Commit**

```bash
git add "app/(dashboard)/discount-cards/page.tsx" "app/(dashboard)/discount-cards/discount-card-list.tsx" "app/(dashboard)/customers/[id]/page.tsx"
git commit -m "feat(discount-cards): show usage count and savings on card list and customer page"
```

---

## Task 8: Discount card detail page with usage history

**Files:**
- Create: `app/(dashboard)/discount-cards/[id]/page.tsx`

**Interfaces:**
- Consumes: `getDiscountCardById`, `getDiscountCardUsage` (Task 6).
- Produces: route `/discount-cards/[id]`.

- [ ] **Step 1: Write the page**

Create `app/(dashboard)/discount-cards/[id]/page.tsx`:

```tsx
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Receipt, Tag, User } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { requirePageRole } from "@/lib/auth";
import { getDiscountCardById, getDiscountCardUsage } from "@/actions/discountCards";

export default async function DiscountCardDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requirePageRole(["admin", "manager"]);
  const { id } = await params;

  const card = await getDiscountCardById(id);
  if (!card) {
    notFound();
  }

  const usage = await getDiscountCardUsage(id);
  const expired =
    !card.active || (card.validTo && new Date(card.validTo).getTime() < Date.now());

  return (
    <div className="space-y-6">
      <Link
        href="/discount-cards"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Back to discount cards
      </Link>

      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-2xl bg-amber-100 dark:bg-amber-950/50">
              <Tag className="size-5 text-amber-600" />
            </div>
            <div>
              <CardTitle>{card.discountPercent}% Discount Card</CardTitle>
              <p className="mt-0.5 flex items-center gap-1.5 text-sm text-muted-foreground">
                <User className="size-3.5" />
                {card.customerId?.name ?? "Unassigned"}
                {card.customerId?.phone ? ` · ${card.customerId.phone}` : ""}
              </p>
            </div>
          </div>
          <Badge variant={expired ? "outline" : "success"}>
            {expired ? "Expired" : "Active"}
          </Badge>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-3">
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Validity</p>
            <p className="mt-1 font-medium">
              {new Date(card.validFrom).toLocaleDateString()}
              {card.validTo
                ? ` — ${new Date(card.validTo).toLocaleDateString()}`
                : " — Indefinite"}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Times used</p>
            <p className="mt-1 text-lg font-semibold">{usage.timesUsed}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              Total discount given
            </p>
            <p className="mt-1 text-lg font-semibold">
              ৳{usage.totalDiscountAmount.toFixed(2)}
            </p>
          </div>
        </CardContent>
      </Card>

      {card.termsAndConditions && (
        <Card>
          <CardHeader>
            <CardTitle>Terms &amp; Conditions</CardTitle>
          </CardHeader>
          <CardContent className="whitespace-pre-wrap text-sm text-muted-foreground">
            {card.termsAndConditions}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Usage History</CardTitle>
        </CardHeader>
        <CardContent>
          {usage.invoices.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="mb-3 flex size-12 items-center justify-center rounded-2xl bg-muted">
                <Receipt className="size-6 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium">Not used yet</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Usage appears here once an invoice using this card is marked paid
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Subtotal</TableHead>
                  <TableHead className="text-right">Discount</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {usage.invoices.map((invoice) => (
                  <TableRow key={invoice._id}>
                    <TableCell>
                      <Link
                        href={`/invoices/${invoice._id}`}
                        className="font-medium text-primary hover:underline"
                      >
                        {invoice.invoiceNumber}
                      </Link>
                    </TableCell>
                    <TableCell>
                      {new Date(invoice.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      ৳{invoice.subtotal.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right text-success">
                      −৳{invoice.discountAmount.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      ৳{invoice.total.toFixed(2)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
```

Before writing this, confirm the `params` prop shape in
`node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/page.md` —
it is a `Promise` in this version.

- [ ] **Step 2: Verify types**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Verify in the running app**

Run: `npm run dev`, click a card on `/discount-cards`.
Expected: the detail page renders; a never-used card shows the "Not used yet"
empty state; a used card lists its paid invoices and each invoice number links
through to `/invoices/<id>`.

- [ ] **Step 4: Commit**

```bash
git add "app/(dashboard)/discount-cards/[id]/page.tsx"
git commit -m "feat(discount-cards): add card detail page with usage history"
```

---

## Task 9: Backfill `discountCardId` on historical invoices

**Files:**
- Create: `scripts/backfill-invoice-discount-card.ts`
- Test: `tests/integration/backfill-discount-card.test.ts`

**Interfaces:**
- Consumes: `Invoice` (Task 5), `DiscountCard`.
- Produces, both exported from the script so they are testable without shelling out:
  - `matchDiscountCardForInvoice(invoice, cards)` → `{ status: "linked"; cardId: string } | { status: "no_match" } | { status: "ambiguous"; candidates: string[] }`
  - `runBackfill(options: { apply: boolean }): Promise<BackfillReport>` where `BackfillReport = { linked: number; noMatch: string[]; ambiguous: string[] }`

The matching rule and the DB pass are both exported, and neither calls
`process.exit`. The risky parts — deciding which card a historical invoice used,
and whether a dry run really writes nothing — are then directly testable.

- [ ] **Step 1: Write the failing test**

Create `tests/integration/backfill-discount-card.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import mongoose from "mongoose";
import { matchDiscountCardForInvoice } from "@/scripts/backfill-invoice-discount-card";

const CUSTOMER = new mongoose.Types.ObjectId();

function card(overrides: Record<string, unknown>) {
  return {
    _id: new mongoose.Types.ObjectId(),
    customerId: CUSTOMER,
    discountPercent: 10,
    validFrom: new Date("2026-01-01T00:00:00.000Z"),
    validTo: null,
    active: true,
    ...overrides,
  };
}

function invoice(overrides: Record<string, unknown> = {}) {
  return {
    _id: new mongoose.Types.ObjectId(),
    invoiceNumber: "INV-000001",
    customerId: CUSTOMER,
    discountPercent: 10,
    createdAt: new Date("2026-06-15T00:00:00.000Z"),
    ...overrides,
  };
}

describe("matchDiscountCardForInvoice", () => {
  it("links when exactly one card matches on percent and validity window", () => {
    const only = card({});
    const result = matchDiscountCardForInvoice(invoice(), [only]);

    expect(result).toEqual({ status: "linked", cardId: only._id.toString() });
  });

  it("ignores cards whose percentage differs", () => {
    const result = matchDiscountCardForInvoice(invoice(), [card({ discountPercent: 15 })]);

    expect(result).toEqual({ status: "no_match" });
  });

  it("ignores cards that had not started yet when the invoice was created", () => {
    const result = matchDiscountCardForInvoice(invoice(), [
      card({ validFrom: new Date("2026-07-01T00:00:00.000Z") }),
    ]);

    expect(result).toEqual({ status: "no_match" });
  });

  it("ignores cards that had already expired when the invoice was created", () => {
    const result = matchDiscountCardForInvoice(invoice(), [
      card({ validTo: new Date("2026-05-01T00:00:00.000Z") }),
    ]);

    expect(result).toEqual({ status: "no_match" });
  });

  it("accepts a card whose window is open-ended", () => {
    const openEnded = card({ validTo: null });
    const result = matchDiscountCardForInvoice(invoice(), [openEnded]);

    expect(result).toEqual({ status: "linked", cardId: openEnded._id.toString() });
  });

  it("accepts a card that expired after the invoice was created", () => {
    const later = card({ validTo: new Date("2026-08-01T00:00:00.000Z") });
    const result = matchDiscountCardForInvoice(invoice(), [later]);

    expect(result).toEqual({ status: "linked", cardId: later._id.toString() });
  });

  it("refuses to guess when two cards both match", () => {
    const a = card({});
    const b = card({});
    const result = matchDiscountCardForInvoice(invoice(), [a, b]);

    expect(result.status).toBe("ambiguous");
    expect(result.status === "ambiguous" && result.candidates.sort()).toEqual(
      [a._id.toString(), b._id.toString()].sort()
    );
  });

  it("ignores cards belonging to a different customer", () => {
    const result = matchDiscountCardForInvoice(invoice(), [
      card({ customerId: new mongoose.Types.ObjectId() }),
    ]);

    expect(result).toEqual({ status: "no_match" });
  });

  it("reports no match when the customer has no cards at all", () => {
    expect(matchDiscountCardForInvoice(invoice(), [])).toEqual({ status: "no_match" });
  });
});
```

Then append the dry-run/apply tests to the same file:

```ts
import { beforeAll, afterAll, beforeEach, vi } from "vitest";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { setupTestDatabase, teardownTestDatabase, clearTestDatabase } from "../helpers/db";
import { connectToDatabase } from "@/lib/db";
import { Invoice } from "@/models/Invoice";
import { DiscountCard } from "@/models/DiscountCard";
import { runBackfill } from "@/scripts/backfill-invoice-discount-card";

beforeAll(async () => {
  await setupTestDatabase();
});

afterAll(async () => {
  await teardownTestDatabase();
});

beforeEach(async () => {
  await clearTestDatabase();
});

async function seedLinkableInvoice() {
  const customerId = new mongoose.Types.ObjectId();

  const discountCard = await DiscountCard.create({
    customerId,
    discountPercent: 10,
    validFrom: new Date("2026-01-01T00:00:00.000Z"),
    validTo: null,
    active: true,
  });

  const created = await Invoice.create({
    invoiceNumber: "INV-000900",
    jobCardId: new mongoose.Types.ObjectId(),
    customerId,
    lineItems: [
      { description: "Service Charge: Tuning", quantity: 1, unitPrice: 1000, total: 1000 },
    ],
    discountPercent: 10,
    subtotal: 1000,
    discountAmount: 100,
    total: 900,
    status: "paid",
  });

  return { discountCard, invoiceId: created._id };
}

describe("runBackfill", () => {
  it("writes nothing in dry-run mode but still reports what it would link", async () => {
    await connectToDatabase();
    const { invoiceId } = await seedLinkableInvoice();

    const report = await runBackfill({ apply: false });

    expect(report.linked).toBe(1);
    const after = await Invoice.findById(invoiceId).lean();
    expect(after?.discountCardId).toBeNull();
  });

  it("links the invoice when applied", async () => {
    await connectToDatabase();
    const { discountCard, invoiceId } = await seedLinkableInvoice();

    const report = await runBackfill({ apply: true });

    expect(report.linked).toBe(1);
    const after = await Invoice.findById(invoiceId).lean();
    expect(after?.discountCardId?.toString()).toBe(discountCard._id.toString());
  });

  it("leaves an already-linked invoice alone", async () => {
    await connectToDatabase();
    await seedLinkableInvoice();

    await runBackfill({ apply: true });
    const second = await runBackfill({ apply: true });

    expect(second.linked).toBe(0);
  });

  it("reports an ambiguous invoice instead of guessing", async () => {
    await connectToDatabase();
    const customerId = new mongoose.Types.ObjectId();

    for (let i = 0; i < 2; i++) {
      await DiscountCard.create({
        customerId,
        discountPercent: 10,
        validFrom: new Date("2026-01-01T00:00:00.000Z"),
        validTo: null,
        active: true,
      });
    }

    const created = await Invoice.create({
      invoiceNumber: "INV-000901",
      jobCardId: new mongoose.Types.ObjectId(),
      customerId,
      lineItems: [
        { description: "Service Charge: Tuning", quantity: 1, unitPrice: 1000, total: 1000 },
      ],
      discountPercent: 10,
      subtotal: 1000,
      discountAmount: 100,
      total: 900,
      status: "paid",
    });

    const report = await runBackfill({ apply: true });

    expect(report.linked).toBe(0);
    expect(report.ambiguous).toHaveLength(1);
    const after = await Invoice.findById(created._id).lean();
    expect(after?.discountCardId).toBeNull();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run tests/integration/backfill-discount-card.test.ts`
Expected: FAIL — cannot resolve `@/scripts/backfill-invoice-discount-card`.

- [ ] **Step 3: Write the script**

Create `scripts/backfill-invoice-discount-card.ts`, following the
`scripts/migrate-departments.ts` pattern:

```ts
/**
 * One-time backfill: link historical invoices to the discount card that
 * produced their discount.
 *
 * Invoices created before Invoice.discountCardId existed only recorded a
 * percentage, so usage history is invisible until this runs.
 *
 * Matching is deliberately conservative — an invoice is only linked when
 * exactly one of the customer's cards fits. Two plausible cards means we do
 * not know, so it is reported for a human instead of guessed at.
 *
 * Usage:
 *   npx tsx scripts/backfill-invoice-discount-card.ts           # dry run
 *   npx tsx scripts/backfill-invoice-discount-card.ts --apply   # writes
 */
import "dotenv/config";
import mongoose from "mongoose";
import { connectToDatabase } from "../lib/db";
import { Invoice } from "../models/Invoice";
import { DiscountCard } from "../models/DiscountCard";

type CardLike = {
  _id: mongoose.Types.ObjectId;
  customerId: mongoose.Types.ObjectId;
  discountPercent: number;
  validFrom: Date;
  validTo: Date | null;
};

type InvoiceLike = {
  _id: mongoose.Types.ObjectId;
  invoiceNumber: string;
  customerId: mongoose.Types.ObjectId;
  discountPercent: number;
  createdAt: Date;
};

export type MatchResult =
  | { status: "linked"; cardId: string }
  | { status: "no_match" }
  | { status: "ambiguous"; candidates: string[] };

export function matchDiscountCardForInvoice(
  invoice: InvoiceLike,
  cards: CardLike[]
): MatchResult {
  const at = invoice.createdAt.getTime();

  const candidates = cards.filter((card) => {
    if (card.customerId.toString() !== invoice.customerId.toString()) return false;
    if (card.discountPercent !== invoice.discountPercent) return false;
    if (card.validFrom.getTime() > at) return false;
    if (card.validTo && card.validTo.getTime() < at) return false;
    return true;
  });

  if (candidates.length === 0) return { status: "no_match" };
  if (candidates.length === 1) {
    return { status: "linked", cardId: candidates[0]._id.toString() };
  }
  return {
    status: "ambiguous",
    candidates: candidates.map((c) => c._id.toString()),
  };
}

export type BackfillReport = {
  linked: number;
  noMatch: string[];
  ambiguous: string[];
};

/**
 * Does the whole DB pass and returns a report. Never prints, never exits —
 * that keeps it callable from tests, including a test that proves dry-run
 * mode writes nothing.
 */
export async function runBackfill({ apply }: { apply: boolean }): Promise<BackfillReport> {
  await connectToDatabase();

  const invoices = (await Invoice.find({
    discountPercent: { $gt: 0 },
    $or: [{ discountCardId: null }, { discountCardId: { $exists: false } }],
  }).lean()) as unknown as InvoiceLike[];

  const cards = (await DiscountCard.find({}).lean()) as unknown as CardLike[];
  const cardsByCustomer = new Map<string, CardLike[]>();
  for (const card of cards) {
    const key = card.customerId.toString();
    if (!cardsByCustomer.has(key)) cardsByCustomer.set(key, []);
    cardsByCustomer.get(key)!.push(card);
  }

  const report: BackfillReport = { linked: 0, noMatch: [], ambiguous: [] };

  for (const invoice of invoices) {
    const result = matchDiscountCardForInvoice(
      invoice,
      cardsByCustomer.get(invoice.customerId.toString()) ?? []
    );

    if (result.status === "linked") {
      if (apply) {
        await Invoice.updateOne(
          { _id: invoice._id },
          { $set: { discountCardId: new mongoose.Types.ObjectId(result.cardId) } }
        );
      }
      report.linked++;
    } else if (result.status === "no_match") {
      report.noMatch.push(invoice.invoiceNumber);
    } else {
      report.ambiguous.push(
        `${invoice.invoiceNumber} (candidates: ${result.candidates.join(", ")})`
      );
    }
  }

  return report;
}

async function main() {
  const apply = process.argv.includes("--apply");

  console.log(`Mode: ${apply ? "APPLY (writes)" : "DRY RUN (no writes)"}`);

  const report = await runBackfill({ apply });

  console.log("");
  console.log(`Linked:    ${report.linked}${apply ? "" : " (would link)"}`);
  console.log(`No match:  ${report.noMatch.length}`);
  console.log(`Ambiguous: ${report.ambiguous.length}`);

  if (report.noMatch.length > 0) {
    console.log("\nSkipped — no matching card:");
    for (const num of report.noMatch) console.log(`  ${num}`);
  }
  if (report.ambiguous.length > 0) {
    console.log("\nSkipped — more than one card fits, resolve by hand:");
    for (const line of report.ambiguous) console.log(`  ${line}`);
  }

  if (!apply) {
    console.log("\nNothing was written. Re-run with --apply to commit these links.");
  }

  process.exit(0);
}

// Only run the migration when executed directly, so importing runBackfill or
// the matcher in tests does not kick off a migration or call process.exit.
if (process.argv[1] && process.argv[1].includes("backfill-invoice-discount-card")) {
  main().catch((err) => {
    console.error("Backfill failed:", err);
    process.exit(1);
  });
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run tests/integration/backfill-discount-card.test.ts`
Expected: PASS.

- [ ] **Step 5: Verify the dry run against the real database**

Run: `npx tsx scripts/backfill-invoice-discount-card.ts`
Expected: prints `DRY RUN (no writes)`, the counts, and the skipped invoice
numbers. Confirm nothing was written by re-running it and seeing identical counts.

Do **not** run `--apply` as part of implementation — that is the user's call once
they have read the dry-run report.

- [ ] **Step 6: Run the full suite and type check**

Run: `npm test`
Expected: PASS.

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add scripts/backfill-invoice-discount-card.ts tests/integration/backfill-discount-card.test.ts
git commit -m "feat(scripts): add dry-run backfill linking invoices to discount cards"
```

---

## Done criteria

- `npm test` passes and `npx tsc --noEmit` is clean.
- `/accounts/dashboard` has working preset buttons and a calendar range picker; the
  range survives a page reload; the last day of a range is included; the chart line has
  no gaps.
- `/discount-cards` shows usage per card, cards link to `/discount-cards/<id>`, and that
  page lists the paid invoices with a discount total.
- `/customers/<id>` shows usage on the active membership banner.
- The backfill dry run has been run and its report handed to the user for a decision on
  `--apply`.
