import { createElement } from "react";
import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { auth } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db";
import { Invoice } from "@/models/Invoice";
import "@/models/Customer";
import "@/models/Vehicle";
import { JobCard } from "@/models/JobCard";
import { InvoicePdf } from "@/components/pdf/InvoicePdf";

type InvoiceLean = {
  _id: unknown;
  invoiceNumber: string;
  jobCardId: unknown;
  customerId: { name: string; phone: string };
  lineItems: { description: string; quantity: number; unitPrice: number; total: number }[];
  subtotal: number;
  discountPercent: number;
  discountAmount: number;
  total: number;
};

type JobCardLean = {
  vehicleId: { registrationNumber: string; make?: string; model?: string } | null;
};

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user || !["admin", "manager"].includes(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  await connectToDatabase();

  const invoice = await Invoice.findById(id)
    .populate("customerId", "name phone")
    .lean<InvoiceLean>();
  if (!invoice) {
    return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  }

  const jobCard = await JobCard.findById(invoice.jobCardId)
    .populate("vehicleId", "registrationNumber make model")
    .lean<JobCardLean>();

  const buffer = await renderToBuffer(
    createElement(InvoicePdf, {
      invoiceNumber: invoice.invoiceNumber,
      customer: invoice.customerId,
      vehicle: jobCard?.vehicleId ?? null,
      lineItems: invoice.lineItems,
      subtotal: invoice.subtotal,
      discountPercent: invoice.discountPercent,
      discountAmount: invoice.discountAmount,
      total: invoice.total,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    }) as any
  );

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${invoice.invoiceNumber}.pdf"`,
    },
  });
}
