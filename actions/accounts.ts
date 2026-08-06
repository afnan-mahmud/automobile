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
import {
  startOfDayUtc,
  endOfDayUtc,
  eachDayInRange,
  REPORT_TIMEZONE,
  type DateRange,
} from "@/lib/dateRange";

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

export async function getFinanceDashboardSummary(range: DateRange) {
  await requireRole(["admin"]);
  await connectToDatabase();

  const dateFilter = buildRangeFilter(range);

  const [incomeByCategory, expenseByCategory, byPaymentMethod, unpaidInvoices] =
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
      // Intentionally NOT date-filtered: outstanding dues is a live balance,
      // not a figure scoped to the selected reporting period. The UI labels it
      // "as of today" so it doesn't read as a filtering bug.
      Invoice.find({ status: { $in: ["sent", "partially_paid"] } }).lean(),
    ]);

  const unpaidInvoiceIds = unpaidInvoices.map((inv) => inv._id);
  const paidForUnpaidInvoices =
    unpaidInvoiceIds.length > 0
      ? await AccountTransaction.aggregate([
          { $match: { relatedInvoiceId: { $in: unpaidInvoiceIds }, type: "income" } },
          { $group: { _id: "$relatedInvoiceId", totalPaid: { $sum: "$amount" } } },
        ])
      : [];

  const paidMap = new Map(
    paidForUnpaidInvoices.map((p) => [p._id.toString(), p.totalPaid as number])
  );
  const outstandingDues = unpaidInvoices.reduce((sum, inv) => {
    const paid = paidMap.get(inv._id.toString()) ?? 0;
    return sum + Math.max(0, inv.total - paid);
  }, 0);

  const totalIncome = incomeByCategory.reduce((sum, c) => sum + c.total, 0);
  const totalExpense = expenseByCategory.reduce((sum, c) => sum + c.total, 0);

  const methodMap = new Map(
    byPaymentMethod.map((p) => [p._id, { income: p.income as number, expense: p.expense as number }])
  );
  const formattedPaymentMethods = PAYMENT_METHODS.map((pm) => ({
    paymentMethod: pm,
    income: methodMap.get(pm)?.income ?? 0,
    expense: methodMap.get(pm)?.expense ?? 0,
  }));

  return serialize({
    totalIncome,
    totalExpense,
    netProfit: totalIncome - totalExpense,
    outstandingDues,
    incomeByCategory: incomeByCategory.map((c) => ({ category: c._id, total: c.total })),
    expenseByCategory: expenseByCategory.map((c) => ({ category: c._id, total: c.total })),
    byPaymentMethod: formattedPaymentMethods,
  });
}

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
