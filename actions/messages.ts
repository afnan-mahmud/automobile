"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { connectToDatabase } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { serialize } from "@/lib/serialize";
import { sendSms } from "@/lib/sms";
import { MessageLog } from "@/models/MessageLog";
import { Customer } from "@/models/Customer";
import type { ActionResult } from "@/actions/customers";

const sendReminderSchema = z.object({
  customerId: z.string().min(1),
  message: z.string().min(1, "Message is required"),
  relatedJobCardId: z.string().optional(),
});

export async function sendReminderMessage(
  input: z.infer<typeof sendReminderSchema>
): Promise<ActionResult<{ id: string; status: "sent" | "failed"; error?: string }>> {
  const session = await requireRole(["admin", "manager"]);

  const parsed = sendReminderSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  await connectToDatabase();
  const customer = await Customer.findById(parsed.data.customerId).lean();
  if (!customer) {
    return { success: false, error: "Customer not found" };
  }

  const result = await sendSms(customer.phone, parsed.data.message);

  const log = await MessageLog.create({
    customerId: customer._id,
    channel: "sms",
    message: parsed.data.message,
    status: result.success ? "sent" : "failed",
    relatedJobCardId: parsed.data.relatedJobCardId || undefined,
    sentBy: session.user.id,
    sentAt: new Date(),
  });

  revalidatePath("/messages");

  return {
    success: true,
    data: {
      id: log._id.toString(),
      status: result.success ? "sent" : "failed",
      error: result.success ? undefined : result.error,
    },
  };
}

export async function listMessageLogs(customerId?: string) {
  await requireRole(["admin", "manager"]);
  await connectToDatabase();

  const filter = customerId ? { customerId } : {};

  const logs = await MessageLog.find(filter)
    .sort({ sentAt: -1 })
    .limit(100)
    .populate("customerId", "name phone")
    .lean();

  return serialize(logs);
}
