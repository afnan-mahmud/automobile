import { describe, it, expect } from "vitest";
import {
  jobCardStatusVariant,
  taskStatusVariant,
  invoiceStatusVariant,
  messageStatusVariant,
  positiveNegativeVariant,
  lowStockVariant,
} from "@/lib/statusBadge";

describe("statusBadge", () => {
  it("maps job card statuses to badge variants", () => {
    expect(jobCardStatusVariant("open")).toBe("outline");
    expect(jobCardStatusVariant("in_progress")).toBe("warning");
    expect(jobCardStatusVariant("completed")).toBe("success");
    expect(jobCardStatusVariant("delivered")).toBe("success");
  });

  it("maps task statuses to badge variants", () => {
    expect(taskStatusVariant("pending")).toBe("outline");
    expect(taskStatusVariant("in_progress")).toBe("warning");
    expect(taskStatusVariant("completed")).toBe("success");
    expect(taskStatusVariant("carried_forward")).toBe("warning");
  });

  it("maps invoice statuses to badge variants", () => {
    expect(invoiceStatusVariant("draft")).toBe("outline");
    expect(invoiceStatusVariant("sent")).toBe("warning");
    expect(invoiceStatusVariant("paid")).toBe("success");
    expect(invoiceStatusVariant("partially_paid")).toBe("warning");
  });

  it("maps message statuses to badge variants", () => {
    expect(messageStatusVariant("sent")).toBe("success");
    expect(messageStatusVariant("failed")).toBe("destructive");
    expect(messageStatusVariant("pending")).toBe("outline");
  });

  it("maps a boolean positive/negative flag to a badge variant", () => {
    expect(positiveNegativeVariant(true)).toBe("success");
    expect(positiveNegativeVariant(false)).toBe("destructive");
  });

  it("maps a low-stock flag to a badge variant", () => {
    expect(lowStockVariant(true)).toBe("warning");
    expect(lowStockVariant(false)).toBe("outline");
  });
});
