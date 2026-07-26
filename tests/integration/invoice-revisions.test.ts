import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";
import mongoose from "mongoose";

vi.mock("@/lib/auth");
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { setMockSession } from "@/lib/__mocks__/auth";
import { setupTestDatabase, teardownTestDatabase, clearTestDatabase } from "../helpers/db";
import { connectToDatabase } from "@/lib/db";
import { Invoice } from "@/models/Invoice";
import { updateInvoice } from "@/actions/invoices";

beforeAll(async () => {
  await setupTestDatabase();
  setMockSession({ user: { id: "507f1f77bcf86cd799439011", role: "admin" } });
});

afterAll(async () => {
  await teardownTestDatabase();
});

beforeEach(async () => {
  await clearTestDatabase();
});

describe("updateInvoice revision history", () => {
  it("preserves each prior version across two edits", async () => {
    await connectToDatabase();

    const invoice = await Invoice.create({
      invoiceNumber: "INV-000001",
      jobCardId: new mongoose.Types.ObjectId(),
      customerId: new mongoose.Types.ObjectId(),
      lineItems: [{ description: "Labor", quantity: 1, unitPrice: 100, total: 100 }],
      subtotal: 100,
      discountAmount: 0,
      total: 100,
      status: "draft",
    });

    const first = await updateInvoice({
      id: invoice._id.toString(),
      lineItems: [{ description: "Labor", quantity: 1, unitPrice: 150 }],
    });
    expect(first.success).toBe(true);

    const second = await updateInvoice({
      id: invoice._id.toString(),
      lineItems: [{ description: "Labor", quantity: 2, unitPrice: 150 }],
    });
    expect(second.success).toBe(true);

    const finalDoc = await Invoice.findById(invoice._id).lean();
    expect(finalDoc?.revisions).toHaveLength(2);
    expect(finalDoc?.revisions[0].total).toBe(100);
    expect(finalDoc?.revisions[1].total).toBe(150);
    expect(finalDoc?.total).toBe(300);
  });
});
