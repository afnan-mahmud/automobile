import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";
import mongoose from "mongoose";

vi.mock("@/lib/auth");

import { setMockSession } from "@/lib/__mocks__/auth";
import { setupTestDatabase, teardownTestDatabase, clearTestDatabase } from "../helpers/db";
import { connectToDatabase } from "@/lib/db";
import { JobCard } from "@/models/JobCard";
import { Vehicle } from "@/models/Vehicle";
import { Customer } from "@/models/Customer";
import { Invoice } from "@/models/Invoice";
import {
  getJobCardStatusBreakdown,
  getTopServicedVehicles,
  getTechnicianDashboard,
} from "@/actions/dashboard";

beforeAll(async () => {
  await setupTestDatabase();
});

afterAll(async () => {
  await teardownTestDatabase();
});

beforeEach(async () => {
  await clearTestDatabase();
});

describe("getJobCardStatusBreakdown", () => {
  it("counts job cards per status, including zero for statuses with no cards", async () => {
    setMockSession({ user: { id: "507f1f77bcf86cd799439011", role: "admin" } });
    await connectToDatabase();

    const vehicleId = new mongoose.Types.ObjectId();
    const customerId = new mongoose.Types.ObjectId();
    await JobCard.create({ jobCardNumber: "JC-1", vehicleId, customerId, status: "open" });
    await JobCard.create({ jobCardNumber: "JC-2", vehicleId, customerId, status: "open" });
    await JobCard.create({ jobCardNumber: "JC-3", vehicleId, customerId, status: "completed" });

    const breakdown = await getJobCardStatusBreakdown();
    const byStatus = Object.fromEntries(breakdown.map((b) => [b.status, b.count]));

    expect(byStatus.open).toBe(2);
    expect(byStatus.completed).toBe(1);
    expect(byStatus.in_progress).toBe(0);
    expect(byStatus.delivered).toBe(0);
  });
});

describe("getTopServicedVehicles", () => {
  it("ranks vehicles by job-card count and sums lifetime spend from paid invoices", async () => {
    setMockSession({ user: { id: "507f1f77bcf86cd799439011", role: "admin" } });
    await connectToDatabase();

    const customer = await Customer.create({ name: "Karim", phone: "01711111111" });
    const vehicle = await Vehicle.create({
      customerId: customer._id,
      registrationNumber: "DHA-1234",
    });

    const jobCard1 = await JobCard.create({
      jobCardNumber: "JC-1",
      vehicleId: vehicle._id,
      customerId: customer._id,
      status: "delivered",
    });
    const jobCard2 = await JobCard.create({
      jobCardNumber: "JC-2",
      vehicleId: vehicle._id,
      customerId: customer._id,
      status: "delivered",
    });

    await Invoice.create({
      invoiceNumber: "INV-1",
      jobCardId: jobCard1._id,
      customerId: customer._id,
      lineItems: [],
      subtotal: 1000,
      discountAmount: 0,
      total: 1000,
      status: "paid",
    });
    await Invoice.create({
      invoiceNumber: "INV-2",
      jobCardId: jobCard2._id,
      customerId: customer._id,
      lineItems: [],
      subtotal: 500,
      discountAmount: 0,
      total: 500,
      status: "partially_paid",
    });

    const results = await getTopServicedVehicles();

    expect(results).toHaveLength(1);
    expect(results[0].registrationNumber).toBe("DHA-1234");
    expect(results[0].jobCardCount).toBe(2);
    expect(results[0].lifetimeSpend).toBe(1500);
  });
});

describe("getTechnicianDashboard", () => {
  it("counts pending tasks and this-week completions for the caller's own employeeId only", async () => {
    await connectToDatabase();
    const myEmployeeId = new mongoose.Types.ObjectId();
    const otherEmployeeId = new mongoose.Types.ObjectId();
    const vehicleId = new mongoose.Types.ObjectId();
    const customerId = new mongoose.Types.ObjectId();

    await JobCard.create({
      jobCardNumber: "JC-1",
      vehicleId,
      customerId,
      tasks: [
        {
          description: "My pending task",
          assignedTo: myEmployeeId,
          status: "pending",
          assignedDate: new Date(),
        },
        {
          description: "Someone else's task",
          assignedTo: otherEmployeeId,
          status: "pending",
          assignedDate: new Date(),
        },
        {
          description: "My completed task",
          assignedTo: myEmployeeId,
          status: "completed",
          assignedDate: new Date(),
          completedDate: new Date(),
        },
      ],
    });

    setMockSession({
      user: {
        id: "507f1f77bcf86cd799439012",
        role: "technician",
        employeeId: myEmployeeId.toString(),
      },
    });

    const result = await getTechnicianDashboard();

    expect(result.pending).toBe(1);
    expect(result.completedThisWeek).toBe(1);
    expect(result.recentJobCards).toHaveLength(1);
  });

  it("counts pending tasks across more than 20 job cards without truncation", async () => {
    await connectToDatabase();
    const myEmployeeId = new mongoose.Types.ObjectId();
    const vehicleId = new mongoose.Types.ObjectId();
    const customerId = new mongoose.Types.ObjectId();

    const totalJobCards = 25;
    for (let i = 0; i < totalJobCards; i += 1) {
      await JobCard.create({
        jobCardNumber: `JC-${i}`,
        vehicleId,
        customerId,
        tasks: [
          {
            description: `Pending task ${i}`,
            assignedTo: myEmployeeId,
            status: "pending",
            assignedDate: new Date(),
          },
        ],
      });
    }

    setMockSession({
      user: {
        id: "507f1f77bcf86cd799439012",
        role: "technician",
        employeeId: myEmployeeId.toString(),
      },
    });

    const result = await getTechnicianDashboard();

    // Regression check: a naive .limit(20) on the query used to compute
    // counts would silently cap this at 20 instead of the true total of 25.
    expect(result.pending).toBe(totalJobCards);
    // The preview list stays capped at 5 regardless of how many job cards exist.
    expect(result.recentJobCards).toHaveLength(5);
  });

  it("rejects a non-technician session", async () => {
    setMockSession({ user: { id: "507f1f77bcf86cd799439011", role: "admin" } });
    await expect(getTechnicianDashboard()).rejects.toThrow("Unauthorized");
  });
});
