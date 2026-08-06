import { createElement } from "react";
import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { auth } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db";
import "@/models/Customer";
import "@/models/Vehicle";
import "@/models/Service";
import "@/models/Product";
import { JobCard } from "@/models/JobCard";
import { InvoicePdf } from "@/components/pdf/InvoicePdf";
import { getActiveDiscountForCustomer } from "@/actions/invoices";
import { computeTotals } from "@/lib/invoices";

type TaskPopulated = {
  description?: string;
  serviceId?: { name: string; department?: string; expectedCosting?: number } | null;
};

type PartPopulated = {
  quantity: number;
  productId?: { name: string; sku: string; unitPrice: number } | string | null;
};

type JobCardLean = {
  _id: unknown;
  jobCardNumber: string;
  customerId: { _id: unknown; name: string; phone: string; email?: string } | null;
  vehicleId: { registrationNumber: string; make?: string; model?: string; year?: number; color?: string } | null;
  tasks: TaskPopulated[];
  partsUsed: PartPopulated[];
  createdAt: string | Date;
};

type LineItem = {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
};

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user || !["admin", "manager", "technician"].includes(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  await connectToDatabase();

  const jobCard = await JobCard.findById(id)
    .populate("customerId", "name phone email")
    .populate("vehicleId", "registrationNumber make model year color")
    .populate("tasks.serviceId", "name department expectedCosting")
    .populate("partsUsed.productId", "name sku unitPrice")
    .lean<JobCardLean>();

  if (!jobCard) {
    return NextResponse.json({ error: "Job card not found" }, { status: 404 });
  }

  const lineItems: LineItem[] = [];

  for (const task of jobCard.tasks || []) {
    const service = task.serviceId;
    const taskDesc = task.description?.trim();
    const serviceName = service?.name?.trim();
    const desc = taskDesc || serviceName || "Service";
    const unitPrice = service?.expectedCosting ?? 0;
    lineItems.push({
      description: `Service Charge: ${desc}`,
      quantity: 1,
      unitPrice,
      total: unitPrice,
    });
  }

  for (const part of jobCard.partsUsed || []) {
    const product = typeof part.productId === "object" && part.productId !== null ? part.productId : null;
    const productName = product?.name || (typeof part.productId === "string" ? part.productId : "Part");
    const unitPrice = product?.unitPrice ?? 0;
    const quantity = part.quantity || 1;
    lineItems.push({
      description: `Part: ${productName}`,
      quantity,
      unitPrice,
      total: unitPrice * quantity,
    });
  }

  const customerIdStr = jobCard.customerId?._id
    ? String(jobCard.customerId._id)
    : "";

  const discountPercent = customerIdStr
    ? await getActiveDiscountForCustomer(customerIdStr)
    : 0;

  const { subtotal, discountAmount, total } = computeTotals(
    lineItems,
    discountPercent
  );

  const buffer = await renderToBuffer(
    createElement(InvoicePdf, {
      invoiceNumber: jobCard.jobCardNumber,
      documentTitle: "Bill / Estimate",
      documentSubtitle: "Car Workshop & Service Center (Customer Review Copy)",
      documentTypeLabel: "Order / Job Card #",
      badgeLabel: "Review Copy (Pre-Invoice)",
      customer: jobCard.customerId || { name: "Customer", phone: "" },
      vehicle: jobCard.vehicleId || null,
      lineItems,
      subtotal,
      discountPercent,
      discountAmount,
      total,
      note: "This is an estimate / draft bill for customer review. The official invoice will be generated upon final confirmation.",
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    }) as any
  );

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="Bill-${jobCard.jobCardNumber}.pdf"`,
    },
  });
}
