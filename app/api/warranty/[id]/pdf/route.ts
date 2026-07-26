import { createElement } from "react";
import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { auth } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db";
import { WarrantyCard } from "@/models/WarrantyCard";
import "@/models/Customer";
import { JobCard } from "@/models/JobCard";
import { TrackingLink } from "@/models/TrackingLink";
import { WarrantyCardPdf } from "@/components/pdf/WarrantyCardPdf";

type WarrantyCardLean = {
  cardNumber: string;
  jobCardId: unknown;
  customerId: { name: string; phone: string };
  coveredItems: string[];
  startDate: Date;
  endDate: Date;
  terms?: string;
};

type JobCardLean = {
  vehicleId: { registrationNumber: string; make?: string; model?: string } | null;
};

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await connectToDatabase();

  const card = await WarrantyCard.findById(id)
    .populate("customerId", "name phone")
    .lean<WarrantyCardLean>();
  if (!card) {
    return NextResponse.json({ error: "Warranty card not found" }, { status: 404 });
  }

  // Accessible to staff (admin/manager), or to a customer holding the
  // matching tracking-link token for this job card (?token=...).
  const session = await auth();
  const isStaff = !!session?.user && ["admin", "manager"].includes(session.user.role);

  if (!isStaff) {
    const token = new URL(request.url).searchParams.get("token");
    const link = token
      ? await TrackingLink.findOne({ token, jobCardId: card.jobCardId }).lean()
      : null;
    if (!link) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const jobCard = await JobCard.findById(card.jobCardId)
    .populate("vehicleId", "registrationNumber make model")
    .lean<JobCardLean>();

  const buffer = await renderToBuffer(
    createElement(WarrantyCardPdf, {
      cardNumber: card.cardNumber,
      customer: card.customerId,
      vehicle: jobCard?.vehicleId ?? null,
      coveredItems: card.coveredItems,
      startDate: card.startDate,
      endDate: card.endDate,
      terms: card.terms,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    }) as any
  );

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${card.cardNumber}.pdf"`,
    },
  });
}
