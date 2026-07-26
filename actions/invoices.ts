"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { connectToDatabase } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { serialize } from "@/lib/serialize";
import { generateSequentialCode } from "@/models/Counter";
import { Invoice, INVOICE_STATUSES } from "@/models/Invoice";
import { JobCard } from "@/models/JobCard";
import { Product } from "@/models/Product";
import { AccountTransaction, PAYMENT_METHODS } from "@/models/AccountTransaction";
import { findActiveDiscountCard } from "@/actions/discountCards";
import "@/models/Customer";
import type { ActionResult } from "@/actions/customers";

type LineItem = {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
};

export async function getActiveDiscountForCustomer(customerId: string): Promise<number> {
  const card = await findActiveDiscountCard(customerId);
  return card?.discountPercent ?? 0;
}

function computeTotals(lineItems: LineItem[], discountPercent: number) {
  const subtotal = lineItems.reduce((sum, li) => sum + li.total, 0);
  const discountAmount = Math.round(subtotal * (discountPercent / 100) * 100) / 100;
  const total = subtotal - discountAmount;
  return { subtotal, discountAmount, total };
}

export async function generateInvoiceFromJobCard(
  jobCardId: string
): Promise<ActionResult<{ id: string }>> {
  await requireRole(["admin", "manager"]);

  await connectToDatabase();
  const jobCard = await JobCard.findById(jobCardId).lean();
  if (!jobCard) {
    return { success: false, error: "Job card not found" };
  }

  const lineItems: LineItem[] = jobCard.tasks.map((task: { description: string }) => ({
    description: `Labor: ${task.description}`,
    quantity: 1,
    unitPrice: 0,
    total: 0,
  }));

  for (const part of jobCard.partsUsed) {
    const product = await Product.findById(part.productId).lean();
    const unitPrice = product?.unitPrice ?? 0;
    lineItems.push({
      description: product ? `Part: ${product.name}` : "Part",
      quantity: part.quantity,
      unitPrice,
      total: unitPrice * part.quantity,
    });
  }

  const discountPercent = await getActiveDiscountForCustomer(
    jobCard.customerId.toString()
  );
  const { subtotal, discountAmount, total } = computeTotals(lineItems, discountPercent);

  const invoiceNumber = await generateSequentialCode("invoiceNumber", "INV");

  const invoice = await Invoice.create({
    invoiceNumber,
    jobCardId: jobCard._id,
    customerId: jobCard.customerId,
    lineItems,
    discountPercent,
    subtotal,
    discountAmount,
    total,
    status: "draft",
  });

  revalidatePath("/invoices");
  return { success: true, data: { id: invoice._id.toString() } };
}

const lineItemInputSchema = z.object({
  description: z.string().min(1),
  quantity: z.coerce.number().positive(),
  unitPrice: z.coerce.number().min(0),
});

const updateInvoiceSchema = z.object({
  id: z.string().min(1),
  lineItems: z.array(lineItemInputSchema).min(1, "At least one line item is required"),
});

export async function updateInvoice(
  input: z.infer<typeof updateInvoiceSchema>
): Promise<ActionResult<{ id: string }>> {
  const session = await requireRole(["admin", "manager"]);

  const parsed = updateInvoiceSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  await connectToDatabase();
  const invoice = await Invoice.findById(parsed.data.id);
  if (!invoice) {
    return { success: false, error: "Invoice not found" };
  }

  invoice.revisions.push({
    version: invoice.revisions.length + 1,
    lineItems: invoice.lineItems,
    total: invoice.total,
    changedAt: new Date(),
    changedBy: session.user.id,
  });

  const newLineItems: LineItem[] = parsed.data.lineItems.map((li) => ({
    description: li.description,
    quantity: li.quantity,
    unitPrice: li.unitPrice,
    total: li.quantity * li.unitPrice,
  }));

  const { subtotal, discountAmount, total } = computeTotals(
    newLineItems,
    invoice.discountPercent
  );

  invoice.lineItems = newLineItems;
  invoice.subtotal = subtotal;
  invoice.discountAmount = discountAmount;
  invoice.total = total;

  await invoice.save();

  revalidatePath("/invoices");
  revalidatePath(`/invoices/${parsed.data.id}`);
  return { success: true, data: { id: parsed.data.id } };
}

const markInvoicePaidSchema = z.object({
  id: z.string().min(1),
  paymentMethod: z.enum(PAYMENT_METHODS),
  partial: z.boolean().default(false),
});

export async function markInvoicePaid(
  input: z.infer<typeof markInvoicePaidSchema>
): Promise<ActionResult<{ id: string }>> {
  const session = await requireRole(["admin", "manager"]);

  const parsed = markInvoicePaidSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  await connectToDatabase();
  const invoice = await Invoice.findById(parsed.data.id);
  if (!invoice) {
    return { success: false, error: "Invoice not found" };
  }

  invoice.status = parsed.data.partial ? "partially_paid" : "paid";
  await invoice.save();

  await AccountTransaction.create({
    type: "income",
    category: "service_sale",
    amount: invoice.total,
    paymentMethod: parsed.data.paymentMethod,
    relatedInvoiceId: invoice._id,
    description: `Payment for invoice ${invoice.invoiceNumber}`,
    date: new Date(),
    createdBy: session.user.id,
  });

  revalidatePath("/invoices");
  revalidatePath(`/invoices/${parsed.data.id}`);
  return { success: true, data: { id: parsed.data.id } };
}

export async function listInvoices(status?: (typeof INVOICE_STATUSES)[number] | "all") {
  await requireRole(["admin", "manager"]);
  await connectToDatabase();

  const filter = status && status !== "all" ? { status } : {};

  const invoices = await Invoice.find(filter)
    .sort({ createdAt: -1 })
    .limit(100)
    .populate("customerId", "name phone")
    .lean();

  return serialize(invoices);
}

export async function getInvoiceById(id: string) {
  await requireRole(["admin", "manager"]);
  await connectToDatabase();

  const invoice = await Invoice.findById(id)
    .populate("customerId", "name phone")
    .populate("jobCardId", "jobCardNumber")
    .lean();

  if (!invoice) {
    return null;
  }

  return serialize(invoice);
}
