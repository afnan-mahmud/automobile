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
    expect(daily.map((d: { date: string }) => d.date)).toEqual([
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
