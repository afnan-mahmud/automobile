import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";
import mongoose from "mongoose";

vi.mock("@/lib/auth");
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { setMockSession } from "@/lib/__mocks__/auth";
import { setupTestDatabase, teardownTestDatabase, clearTestDatabase } from "../helpers/db";
import { connectToDatabase } from "@/lib/db";
import { Invoice } from "@/models/Invoice";
import { JobCard } from "@/models/JobCard";
import { Customer } from "@/models/Customer";
import { DiscountCard } from "@/models/DiscountCard";
import { generateInvoiceFromJobCard } from "@/actions/invoices";

beforeAll(async () => {
  await setupTestDatabase();
  setMockSession({ user: { id: "507f1f77bcf86cd799439011", role: "admin" } });
});

afterAll(async () => {
  await teardownTestDatabase();
});

beforeEach(async () => {
  await clearTestDatabase();
  setMockSession({ user: { id: "507f1f77bcf86cd799439011", role: "admin" } });
});

async function seedCustomerWithJobCard() {
  const customer = await Customer.create({ name: "Rahim", phone: "01700000001" });
  const jobCard = await JobCard.create({
    jobCardNumber: `JC-${Date.now()}`,
    vehicleId: new mongoose.Types.ObjectId(),
    customerId: customer._id,
    status: "completed",
    tasks: [
      {
        description: "Engine tuning",
        assignedTo: new mongoose.Types.ObjectId(),
        assignedDate: new Date(),
      },
    ],
    partsUsed: [],
  });
  return { customer, jobCard };
}

describe("invoice → discount card link", () => {
  it("records which card supplied the discount", async () => {
    await connectToDatabase();
    const { customer, jobCard } = await seedCustomerWithJobCard();

    const card = await DiscountCard.create({
      customerId: customer._id,
      discountPercent: 10,
      validFrom: new Date(Date.now() - 86400000),
      validTo: null,
      active: true,
    });

    const result = await generateInvoiceFromJobCard(jobCard._id.toString());
    expect(result.success).toBe(true);

    const invoice = await Invoice.findById(
      result.success ? result.data.id : ""
    ).lean();
    expect(invoice?.discountPercent).toBe(10);
    expect(invoice?.discountCardId?.toString()).toBe(card._id.toString());
  });

  it("leaves discountCardId null when the customer has no card", async () => {
    await connectToDatabase();
    const { jobCard } = await seedCustomerWithJobCard();

    const result = await generateInvoiceFromJobCard(jobCard._id.toString());
    expect(result.success).toBe(true);

    const invoice = await Invoice.findById(
      result.success ? result.data.id : ""
    ).lean();
    expect(invoice?.discountPercent).toBe(0);
    expect(invoice?.discountCardId).toBeNull();
  });

  it("leaves discountCardId null when the only card is expired", async () => {
    await connectToDatabase();
    const { customer, jobCard } = await seedCustomerWithJobCard();

    await DiscountCard.create({
      customerId: customer._id,
      discountPercent: 15,
      validFrom: new Date(Date.now() - 30 * 86400000),
      validTo: new Date(Date.now() - 86400000),
      active: true,
    });

    const result = await generateInvoiceFromJobCard(jobCard._id.toString());
    const invoice = await Invoice.findById(
      result.success ? result.data.id : ""
    ).lean();

    expect(invoice?.discountCardId).toBeNull();
  });
});

// ─────────────────────────────────────────────
// Task 6: discount card usage (appended below)
// ─────────────────────────────────────────────

import {
  getDiscountCardUsage,
  getDiscountCardUsageMap,
} from "@/actions/discountCards";

async function seedInvoice(
  cardId: mongoose.Types.ObjectId | null,
  status: "draft" | "sent" | "paid" | "partially_paid",
  discountAmount: number
) {
  return Invoice.create({
    invoiceNumber: `INV-${Math.random().toString().slice(2, 10)}`,
    jobCardId: new mongoose.Types.ObjectId(),
    customerId: new mongoose.Types.ObjectId(),
    lineItems: [
      { description: "Service Charge: Tuning", quantity: 1, unitPrice: 1000, total: 1000 },
    ],
    discountCardId: cardId,
    discountPercent: 10,
    subtotal: 1000,
    discountAmount,
    total: 1000 - discountAmount,
    status,
  });
}

describe("discount card usage", () => {
  it("counts only paid invoices", async () => {
    await connectToDatabase();
    const cardId = new mongoose.Types.ObjectId();

    await seedInvoice(cardId, "paid", 100);
    await seedInvoice(cardId, "draft", 100);
    await seedInvoice(cardId, "sent", 100);
    await seedInvoice(cardId, "partially_paid", 100);

    const usage = await getDiscountCardUsage(cardId.toString());

    expect(usage.timesUsed).toBe(1);
    expect(usage.totalDiscountAmount).toBe(100);
  });

  it("sums the discount across several paid invoices", async () => {
    await connectToDatabase();
    const cardId = new mongoose.Types.ObjectId();

    await seedInvoice(cardId, "paid", 100);
    await seedInvoice(cardId, "paid", 250.5);

    const usage = await getDiscountCardUsage(cardId.toString());

    expect(usage.timesUsed).toBe(2);
    expect(usage.totalDiscountAmount).toBe(350.5);
    expect(usage.invoices).toHaveLength(2);
    expect(usage.invoices[0]).toHaveProperty("invoiceNumber");
  });

  it("reports zero for a card that has never been used", async () => {
    await connectToDatabase();

    const usage = await getDiscountCardUsage(new mongoose.Types.ObjectId().toString());

    expect(usage).toEqual({ timesUsed: 0, totalDiscountAmount: 0, invoices: [] });
  });

  it("does not attribute unlinked invoices to any card", async () => {
    await connectToDatabase();
    const cardId = new mongoose.Types.ObjectId();

    await seedInvoice(null, "paid", 400);

    const usage = await getDiscountCardUsage(cardId.toString());
    expect(usage.timesUsed).toBe(0);
  });

  it("returns a usage entry for every requested card in one batch", async () => {
    await connectToDatabase();
    const cardA = new mongoose.Types.ObjectId();
    const cardB = new mongoose.Types.ObjectId();
    const cardC = new mongoose.Types.ObjectId();

    await seedInvoice(cardA, "paid", 100);
    await seedInvoice(cardA, "paid", 50);
    await seedInvoice(cardB, "paid", 30);

    const map = await getDiscountCardUsageMap([
      cardA.toString(),
      cardB.toString(),
      cardC.toString(),
    ]);

    expect(map[cardA.toString()]).toEqual({ timesUsed: 2, totalDiscountAmount: 150 });
    expect(map[cardB.toString()]).toEqual({ timesUsed: 1, totalDiscountAmount: 30 });
    expect(map[cardC.toString()]).toEqual({ timesUsed: 0, totalDiscountAmount: 0 });
  });

  it("returns an empty map for an empty input", async () => {
    await connectToDatabase();
    expect(await getDiscountCardUsageMap([])).toEqual({});
  });
});
