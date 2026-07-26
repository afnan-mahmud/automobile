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
import { DiscountCard } from "@/models/DiscountCard";
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
