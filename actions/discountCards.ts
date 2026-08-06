"use server";

/**
 * Behavior decision: assigning a new active discount card to a customer
 * DEACTIVATES any of their other active cards rather than rejecting the
 * new assignment. Rationale: staff commonly issue a fresh discount to
 * replace an expiring/expired promotion, and a hard rejection would force
 * them to manually deactivate the old one first. Only one active discount
 * card per customer applies to invoicing at a time (see
 * getActiveDiscountForCustomer in actions/invoices.ts).
 */

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { connectToDatabase } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { serialize } from "@/lib/serialize";
import mongoose from "mongoose";
import { DiscountCard } from "@/models/DiscountCard";
import { Invoice } from "@/models/Invoice";
import type { ActionResult } from "@/actions/customers";

const createDiscountCardSchema = z.object({
  customerId: z.string().min(1),
  discountPercent: z.coerce.number().min(0).max(100),
  termsAndConditions: z.string().optional(),
  validFrom: z.coerce.date(),
  validTo: z.coerce.date().nullable().optional(),
});

export async function createDiscountCard(
  input: z.infer<typeof createDiscountCardSchema>
): Promise<ActionResult<{ id: string }>> {
  await requireRole(["admin", "manager"]);

  const parsed = createDiscountCardSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  await connectToDatabase();

  await DiscountCard.updateMany(
    { customerId: parsed.data.customerId, active: true },
    { active: false }
  );

  const card = await DiscountCard.create({
    ...parsed.data,
    validTo: parsed.data.validTo ?? null,
    active: true,
  });

  revalidatePath("/discount-cards");
  revalidatePath(`/customers/${parsed.data.customerId}`);
  return { success: true, data: { id: card._id.toString() } };
}

const updateDiscountCardSchema = z.object({
  id: z.string().min(1),
  discountPercent: z.coerce.number().min(0).max(100).optional(),
  termsAndConditions: z.string().optional(),
  validFrom: z.coerce.date().optional(),
  validTo: z.coerce.date().nullable().optional(),
  active: z.boolean().optional(),
});

export async function updateDiscountCard(
  input: z.infer<typeof updateDiscountCardSchema>
): Promise<ActionResult<{ id: string }>> {
  await requireRole(["admin", "manager"]);

  const parsed = updateDiscountCardSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  await connectToDatabase();
  const { id, ...rest } = parsed.data;

  const updated = await DiscountCard.findByIdAndUpdate(id, rest, { new: true });
  if (!updated) {
    return { success: false, error: "Discount card not found" };
  }

  revalidatePath("/discount-cards");
  if (updated.customerId) {
    revalidatePath(`/customers/${updated.customerId}`);
  }
  return { success: true, data: { id } };
}

export async function cancelDiscountCard(
  id: string
): Promise<ActionResult<{ id: string }>> {
  await requireRole(["admin", "manager"]);
  await connectToDatabase();

  const card = await DiscountCard.findByIdAndUpdate(
    id,
    { active: false },
    { new: true }
  );
  if (!card) {
    return { success: false, error: "Discount card not found" };
  }

  revalidatePath("/discount-cards");
  revalidatePath(`/customers/${card.customerId}`);
  return { success: true, data: { id } };
}

export async function listDiscountCards() {
  await requireRole(["admin", "manager"]);
  await connectToDatabase();

  const cards = await DiscountCard.find()
    .sort({ createdAt: -1 })
    .populate("customerId", "name phone")
    .lean();

  return serialize(cards);
}

/**
 * Not role-gated — used internally by actions/invoices.ts during invoice
 * generation, which has already checked the caller's role itself.
 */
export async function findActiveDiscountCard(customerId: string) {
  await connectToDatabase();

  const now = new Date();
  const card = await DiscountCard.findOne({
    customerId,
    active: true,
    validFrom: { $lte: now },
    $or: [{ validTo: null }, { validTo: { $gte: now } }],
  }).lean();

  return card ?? null;
}

export async function getActiveDiscountCardForCustomer(customerId: string) {
  await requireRole(["admin", "manager"]);
  const card = await findActiveDiscountCard(customerId);
  return card ? serialize(card) : null;
}

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
