"use server";

import { nanoid } from "nanoid";
import { connectToDatabase } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { TrackingLink } from "@/models/TrackingLink";
import { JobCard } from "@/models/JobCard";
import type { ActionResult } from "@/actions/customers";

export async function createTrackingLink(
  jobCardId: string
): Promise<ActionResult<{ token: string }>> {
  await requireRole(["admin", "manager"]);
  await connectToDatabase();

  const jobCard = await JobCard.exists({ _id: jobCardId });
  if (!jobCard) {
    return { success: false, error: "Job card not found" };
  }

  const existing = await TrackingLink.findOne({
    jobCardId,
    $or: [{ expiresAt: null }, { expiresAt: { $gt: new Date() } }],
  }).lean();

  if (existing) {
    return { success: true, data: { token: existing.token } };
  }

  const link = await TrackingLink.create({ jobCardId, token: nanoid() });
  return { success: true, data: { token: link.token } };
}
