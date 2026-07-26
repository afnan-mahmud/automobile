"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { connectToDatabase } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { serialize } from "@/lib/serialize";
import { generateSequentialCode } from "@/models/Counter";
import { WarrantyCard } from "@/models/WarrantyCard";
import { JobCard } from "@/models/JobCard";
import type { ActionResult } from "@/actions/customers";

const createWarrantyCardSchema = z.object({
  jobCardId: z.string().min(1),
  coveredItems: z.array(z.string().min(1)).min(1, "At least one covered item is required"),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  terms: z.string().optional(),
});

export async function createWarrantyCard(
  input: z.infer<typeof createWarrantyCardSchema>
): Promise<ActionResult<{ id: string }>> {
  await requireRole(["admin", "manager"]);

  const parsed = createWarrantyCardSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  await connectToDatabase();
  const jobCard = await JobCard.findById(parsed.data.jobCardId).lean();
  if (!jobCard) {
    return { success: false, error: "Job card not found" };
  }
  if (!["completed", "delivered"].includes(jobCard.status)) {
    return {
      success: false,
      error: "Warranty cards can only be issued for a completed or delivered job card",
    };
  }

  const cardNumber = await generateSequentialCode("warrantyCardNumber", "WC");

  const warrantyCard = await WarrantyCard.create({
    jobCardId: jobCard._id,
    customerId: jobCard.customerId,
    cardNumber,
    coveredItems: parsed.data.coveredItems,
    startDate: parsed.data.startDate,
    endDate: parsed.data.endDate,
    terms: parsed.data.terms,
  });

  revalidatePath("/warranty-cards");
  revalidatePath(`/job-cards/${parsed.data.jobCardId}`);
  return { success: true, data: { id: warrantyCard._id.toString() } };
}

export async function getWarrantyCardByJobCard(jobCardId: string) {
  await requireRole(["admin", "manager"]);
  await connectToDatabase();

  const card = await WarrantyCard.findOne({ jobCardId }).lean();
  return card ? serialize(card) : null;
}

export async function listWarrantyCards() {
  await requireRole(["admin", "manager"]);
  await connectToDatabase();

  const cards = await WarrantyCard.find()
    .sort({ createdAt: -1 })
    .populate("customerId", "name phone")
    .populate("jobCardId", "jobCardNumber")
    .lean();

  return serialize(cards);
}
