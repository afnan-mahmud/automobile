import { describe, it, expect } from "vitest";
import { computeTotals, isPartLineItem } from "@/lib/invoices";

describe("Discount Calculation (Service Charge only)", () => {
  it("correctly identifies part items vs service charges", () => {
    expect(isPartLineItem("Part: Engine Oil 5W-30")).toBe(true);
    expect(isPartLineItem("Part: Brake Pads")).toBe(true);
    expect(isPartLineItem("Part - Air Filter")).toBe(true);
    expect(isPartLineItem("part")).toBe(true);

    expect(isPartLineItem("Service Charge: Full Inspection")).toBe(false);
    expect(isPartLineItem("Service Charge: Oil Filter Replacement")).toBe(false);
    expect(isPartLineItem("Labor: Engine Overhaul")).toBe(false);
    expect(isPartLineItem("Wheel Alignment")).toBe(false);
  });

  it("applies discount ONLY to service charges / labor, and NOT to parts", () => {
    const lineItems = [
      { description: "Service Charge: Brake Servicing", quantity: 1, unitPrice: 2000, total: 2000 },
      { description: "Service Charge: Car Wash", quantity: 1, unitPrice: 1000, total: 1000 },
      { description: "Part: Brake Pads Set", quantity: 2, unitPrice: 2500, total: 5000 },
      { description: "Part: Brake Fluid", quantity: 1, unitPrice: 800, total: 800 },
    ];

    // Subtotal: 2000 + 1000 + 5000 + 800 = 8800
    // Service charge subtotal (eligible): 2000 + 1000 = 3000
    // Parts subtotal (excluded from discount): 5000 + 800 = 5800
    // 10% discount on 3000 = 300
    // Total = 8800 - 300 = 8500

    const totals = computeTotals(lineItems, 10);

    expect(totals.subtotal).toBe(8800);
    expect(totals.discountAmount).toBe(300);
    expect(totals.total).toBe(8500);
  });

  it("calculates zero discount when discountPercent is 0", () => {
    const lineItems = [
      { description: "Service Charge: Diagnostic", quantity: 1, unitPrice: 1500, total: 1500 },
      { description: "Part: Spark Plugs", quantity: 4, unitPrice: 500, total: 2000 },
    ];

    const totals = computeTotals(lineItems, 0);

    expect(totals.subtotal).toBe(3500);
    expect(totals.discountAmount).toBe(0);
    expect(totals.total).toBe(3500);
  });

  it("applies 0 discount if an invoice only contains parts even if customer has discount card", () => {
    const lineItems = [
      { description: "Part: Battery", quantity: 1, unitPrice: 8000, total: 8000 },
      { description: "Part: Coolant", quantity: 2, unitPrice: 1200, total: 2400 },
    ];

    const totals = computeTotals(lineItems, 20);

    expect(totals.subtotal).toBe(10400);
    expect(totals.discountAmount).toBe(0);
    expect(totals.total).toBe(10400);
  });
});
