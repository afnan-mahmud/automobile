import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";
import mongoose from "mongoose";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { setupTestDatabase, teardownTestDatabase, clearTestDatabase } from "../helpers/db";
import { connectToDatabase } from "@/lib/db";
import { Invoice } from "@/models/Invoice";
import { DiscountCard } from "@/models/DiscountCard";
import {
  matchDiscountCardForInvoice,
  runBackfill,
} from "@/scripts/backfill-invoice-discount-card";

const CUSTOMER = new mongoose.Types.ObjectId();

function card(overrides: Record<string, unknown>) {
  return {
    _id: new mongoose.Types.ObjectId(),
    customerId: CUSTOMER,
    discountPercent: 10,
    validFrom: new Date("2026-01-01T00:00:00.000Z"),
    validTo: null,
    active: true,
    ...overrides,
  };
}

function invoice(overrides: Record<string, unknown> = {}) {
  return {
    _id: new mongoose.Types.ObjectId(),
    invoiceNumber: "INV-000001",
    customerId: CUSTOMER,
    discountPercent: 10,
    createdAt: new Date("2026-06-15T00:00:00.000Z"),
    ...overrides,
  };
}

describe("matchDiscountCardForInvoice", () => {
  it("links when exactly one card matches on percent and validity window", () => {
    const only = card({});
    const result = matchDiscountCardForInvoice(invoice(), [only]);

    expect(result).toEqual({ status: "linked", cardId: only._id.toString() });
  });

  it("ignores cards whose percentage differs", () => {
    const result = matchDiscountCardForInvoice(invoice(), [card({ discountPercent: 15 })]);

    expect(result).toEqual({ status: "no_match" });
  });

  it("ignores cards that had not started yet when the invoice was created", () => {
    const result = matchDiscountCardForInvoice(invoice(), [
      card({ validFrom: new Date("2026-07-01T00:00:00.000Z") }),
    ]);

    expect(result).toEqual({ status: "no_match" });
  });

  it("ignores cards that had already expired when the invoice was created", () => {
    const result = matchDiscountCardForInvoice(invoice(), [
      card({ validTo: new Date("2026-05-01T00:00:00.000Z") }),
    ]);

    expect(result).toEqual({ status: "no_match" });
  });

  it("accepts a card whose window is open-ended", () => {
    const openEnded = card({ validTo: null });
    const result = matchDiscountCardForInvoice(invoice(), [openEnded]);

    expect(result).toEqual({ status: "linked", cardId: openEnded._id.toString() });
  });

  it("accepts a card that expired after the invoice was created", () => {
    const later = card({ validTo: new Date("2026-08-01T00:00:00.000Z") });
    const result = matchDiscountCardForInvoice(invoice(), [later]);

    expect(result).toEqual({ status: "linked", cardId: later._id.toString() });
  });

  it("refuses to guess when two cards both match", () => {
    const a = card({});
    const b = card({});
    const result = matchDiscountCardForInvoice(invoice(), [a, b]);

    expect(result.status).toBe("ambiguous");
    expect(result.status === "ambiguous" && result.candidates.sort()).toEqual(
      [a._id.toString(), b._id.toString()].sort()
    );
  });

  it("ignores cards belonging to a different customer", () => {
    const result = matchDiscountCardForInvoice(invoice(), [
      card({ customerId: new mongoose.Types.ObjectId() }),
    ]);

    expect(result).toEqual({ status: "no_match" });
  });

  it("reports no match when the customer has no cards at all", () => {
    expect(matchDiscountCardForInvoice(invoice(), [])).toEqual({ status: "no_match" });
  });
});

beforeAll(async () => {
  await setupTestDatabase();
});

afterAll(async () => {
  await teardownTestDatabase();
});

beforeEach(async () => {
  await clearTestDatabase();
});

async function seedLinkableInvoice() {
  const customerId = new mongoose.Types.ObjectId();

  const discountCard = await DiscountCard.create({
    customerId,
    discountPercent: 10,
    validFrom: new Date("2026-01-01T00:00:00.000Z"),
    validTo: null,
    active: true,
  });

  const created = await Invoice.create({
    invoiceNumber: "INV-000900",
    jobCardId: new mongoose.Types.ObjectId(),
    customerId,
    lineItems: [
      { description: "Service Charge: Tuning", quantity: 1, unitPrice: 1000, total: 1000 },
    ],
    discountPercent: 10,
    subtotal: 1000,
    discountAmount: 100,
    total: 900,
    status: "paid",
  });

  return { discountCard, invoiceId: created._id };
}

describe("runBackfill", () => {
  it("writes nothing in dry-run mode but still reports what it would link", async () => {
    await connectToDatabase();
    const { invoiceId } = await seedLinkableInvoice();

    const report = await runBackfill({ apply: false });

    expect(report.linked).toBe(1);
    const after = await Invoice.findById(invoiceId).lean();
    expect(after?.discountCardId).toBeNull();
  });

  it("links the invoice when applied", async () => {
    await connectToDatabase();
    const { discountCard, invoiceId } = await seedLinkableInvoice();

    const report = await runBackfill({ apply: true });

    expect(report.linked).toBe(1);
    const after = await Invoice.findById(invoiceId).lean();
    expect(after?.discountCardId?.toString()).toBe(discountCard._id.toString());
  });

  it("leaves an already-linked invoice alone", async () => {
    await connectToDatabase();
    await seedLinkableInvoice();

    await runBackfill({ apply: true });
    const second = await runBackfill({ apply: true });

    expect(second.linked).toBe(0);
  });

  it("reports an ambiguous invoice instead of guessing", async () => {
    await connectToDatabase();
    const customerId = new mongoose.Types.ObjectId();

    for (let i = 0; i < 2; i++) {
      await DiscountCard.create({
        customerId,
        discountPercent: 10,
        validFrom: new Date("2026-01-01T00:00:00.000Z"),
        validTo: null,
        active: true,
      });
    }

    const created = await Invoice.create({
      invoiceNumber: "INV-000901",
      jobCardId: new mongoose.Types.ObjectId(),
      customerId,
      lineItems: [
        { description: "Service Charge: Tuning", quantity: 1, unitPrice: 1000, total: 1000 },
      ],
      discountPercent: 10,
      subtotal: 1000,
      discountAmount: 100,
      total: 900,
      status: "paid",
    });

    const report = await runBackfill({ apply: true });

    expect(report.linked).toBe(0);
    expect(report.ambiguous).toHaveLength(1);
    const after = await Invoice.findById(created._id).lean();
    expect(after?.discountCardId).toBeNull();
  });
});
