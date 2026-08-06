import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";
import mongoose from "mongoose";

vi.mock("@/lib/auth");
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { setMockSession } from "@/lib/__mocks__/auth";
import { setupTestDatabase, teardownTestDatabase, clearTestDatabase } from "../helpers/db";
import { connectToDatabase } from "@/lib/db";
import { Invoice } from "@/models/Invoice";
import { AccountTransaction } from "@/models/AccountTransaction";
import { deleteInvoice, markInvoicePaid } from "@/actions/invoices";
import { getFinanceDashboardSummary } from "@/actions/accounts";
import { resolvePreset } from "@/lib/dateRange";

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

describe("deleteInvoice action and account deduction", () => {
  it("deletes the invoice and cleans up associated AccountTransaction records", async () => {
    await connectToDatabase();

    const invoice = await Invoice.create({
      invoiceNumber: "INV-000101",
      jobCardId: new mongoose.Types.ObjectId(),
      customerId: new mongoose.Types.ObjectId(),
      lineItems: [{ description: "Engine Oil Change", quantity: 1, unitPrice: 3500, total: 3500 }],
      subtotal: 3500,
      discountAmount: 0,
      total: 3500,
      status: "sent",
    });

    // Mark paid to create an AccountTransaction
    const payResult = await markInvoicePaid({
      id: invoice._id.toString(),
      paymentMethod: "cash",
      partial: false,
    });
    expect(payResult.success).toBe(true);

    // Verify transaction exists in AccountTransaction
    const txBefore = await AccountTransaction.find({ relatedInvoiceId: invoice._id });
    expect(txBefore).toHaveLength(1);
    expect(txBefore[0].amount).toBe(3500);

    // Check finance dashboard summary before deletion
    const summaryBefore = await getFinanceDashboardSummary(resolvePreset("thisYear"));
    expect(summaryBefore.totalIncome).toBe(3500);
    expect(summaryBefore.netProfit).toBe(3500);

    // Delete the invoice
    const deleteResult = await deleteInvoice(invoice._id.toString());
    expect(deleteResult.success).toBe(true);

    // Verify invoice is gone from database
    const invoiceAfter = await Invoice.findById(invoice._id);
    expect(invoiceAfter).toBeNull();

    // Verify associated AccountTransaction is gone
    const txAfter = await AccountTransaction.find({ relatedInvoiceId: invoice._id });
    expect(txAfter).toHaveLength(0);

    // Verify finance summary has deducted the 3500 figure back to 0
    const summaryAfter = await getFinanceDashboardSummary(resolvePreset("thisYear"));
    expect(summaryAfter.totalIncome).toBe(0);
    expect(summaryAfter.netProfit).toBe(0);
  });

  it("returns error for non-existent invoice id", async () => {
    await connectToDatabase();
    const fakeId = new mongoose.Types.ObjectId().toString();
    const result = await deleteInvoice(fakeId);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("Invoice not found");
    }
  });

  it("rejects unauthorized roles like technician", async () => {
    await connectToDatabase();
    setMockSession({ user: { id: "507f1f77bcf86cd799439011", role: "technician" } });

    const invoice = await Invoice.create({
      invoiceNumber: "INV-000102",
      jobCardId: new mongoose.Types.ObjectId(),
      customerId: new mongoose.Types.ObjectId(),
      lineItems: [{ description: "Brake Pad", quantity: 1, unitPrice: 2000, total: 2000 }],
      subtotal: 2000,
      discountAmount: 0,
      total: 2000,
      status: "draft",
    });

    await expect(deleteInvoice(invoice._id.toString())).rejects.toThrow("Unauthorized");
  });
});
