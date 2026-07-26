"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { connectToDatabase } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { serialize } from "@/lib/serialize";
import {
  AccountTransaction,
  TRANSACTION_TYPES,
  TRANSACTION_CATEGORIES,
  PAYMENT_METHODS,
} from "@/models/AccountTransaction";
import { Invoice } from "@/models/Invoice";
import type { ActionResult } from "@/actions/customers";

const createTransactionSchema = z.object({
  type: z.enum(TRANSACTION_TYPES),
  category: z.enum(TRANSACTION_CATEGORIES),
  amount: z.coerce.number().positive("Amount must be positive"),
  paymentMethod: z.enum(PAYMENT_METHODS),
  description: z.string().optional(),
  date: z.coerce.date().default(() => new Date()),
});

export async function createAccountTransaction(
  input: z.infer<typeof createTransactionSchema>
): Promise<ActionResult<{ id: string }>> {
  const session = await requireRole(["admin", "manager"]);

  const parsed = createTransactionSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  await connectToDatabase();

  const transaction = await AccountTransaction.create({
    ...parsed.data,
    createdBy: session.user.id,
  });

  revalidatePath("/accounts");
  revalidatePath("/accounts/dashboard");
  return { success: true, data: { id: transaction._id.toString() } };
}

export type TransactionFilters = {
  from?: string;
  to?: string;
  type?: (typeof TRANSACTION_TYPES)[number];
  category?: (typeof TRANSACTION_CATEGORIES)[number];
  paymentMethod?: (typeof PAYMENT_METHODS)[number];
};

function buildDateRangeFilter(from?: string, to?: string) {
  if (!from && !to) return {};
  return {
    date: {
      ...(from ? { $gte: new Date(from) } : {}),
      ...(to ? { $lte: new Date(to) } : {}),
    },
  };
}

export async function listAccountTransactions(filters: TransactionFilters = {}) {
  await requireRole(["admin", "manager"]);
  await connectToDatabase();

  const filter: Record<string, unknown> = {
    ...buildDateRangeFilter(filters.from, filters.to),
  };
  if (filters.type) filter.type = filters.type;
  if (filters.category) filter.category = filters.category;
  if (filters.paymentMethod) filter.paymentMethod = filters.paymentMethod;

  const transactions = await AccountTransaction.find(filter)
    .sort({ date: -1 })
    .limit(200)
    .lean();

  return serialize(transactions);
}

export async function getFinanceDashboardSummary(from?: string, to?: string) {
  await requireRole(["admin"]);
  await connectToDatabase();

  const dateFilter = buildDateRangeFilter(from, to);

  const [incomeByCategory, expenseByCategory, byPaymentMethod, outstandingAgg] =
    await Promise.all([
      AccountTransaction.aggregate([
        { $match: { type: "income", ...dateFilter } },
        { $group: { _id: "$category", total: { $sum: "$amount" } } },
      ]),
      AccountTransaction.aggregate([
        { $match: { type: "expense", ...dateFilter } },
        { $group: { _id: "$category", total: { $sum: "$amount" } } },
      ]),
      AccountTransaction.aggregate([
        { $match: dateFilter },
        {
          $group: {
            _id: "$paymentMethod",
            income: {
              $sum: { $cond: [{ $eq: ["$type", "income"] }, "$amount", 0] },
            },
            expense: {
              $sum: { $cond: [{ $eq: ["$type", "expense"] }, "$amount", 0] },
            },
          },
        },
      ]),
      Invoice.aggregate([
        { $match: { status: { $in: ["sent", "partially_paid"] } } },
        { $group: { _id: null, total: { $sum: "$total" } } },
      ]),
    ]);

  const totalIncome = incomeByCategory.reduce((sum, c) => sum + c.total, 0);
  const totalExpense = expenseByCategory.reduce((sum, c) => sum + c.total, 0);
  const outstandingDues = outstandingAgg[0]?.total ?? 0;

  return serialize({
    totalIncome,
    totalExpense,
    netProfit: totalIncome - totalExpense,
    outstandingDues,
    incomeByCategory: incomeByCategory.map((c) => ({ category: c._id, total: c.total })),
    expenseByCategory: expenseByCategory.map((c) => ({ category: c._id, total: c.total })),
    byPaymentMethod: byPaymentMethod.map((p) => ({
      paymentMethod: p._id,
      income: p.income,
      expense: p.expense,
    })),
  });
}

export async function getDailyIncomeExpense(days = 30) {
  await requireRole(["admin"]);
  await connectToDatabase();

  const since = new Date();
  since.setDate(since.getDate() - days);

  const rows = await AccountTransaction.aggregate([
    { $match: { date: { $gte: since } } },
    {
      $group: {
        _id: {
          day: { $dateToString: { format: "%Y-%m-%d", date: "$date" } },
          type: "$type",
        },
        total: { $sum: "$amount" },
      },
    },
    { $sort: { "_id.day": 1 } },
  ]);

  const byDay = new Map<string, { date: string; income: number; expense: number }>();
  for (const row of rows) {
    const day = row._id.day as string;
    if (!byDay.has(day)) {
      byDay.set(day, { date: day, income: 0, expense: 0 });
    }
    const entry = byDay.get(day)!;
    if (row._id.type === "income") entry.income = row.total;
    else entry.expense = row.total;
  }

  return serialize(Array.from(byDay.values()));
}
