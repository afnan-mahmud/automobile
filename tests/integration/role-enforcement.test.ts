import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";
import mongoose from "mongoose";

vi.mock("@/lib/auth");

import { setMockSession } from "@/lib/__mocks__/auth";
import { setupTestDatabase, teardownTestDatabase, clearTestDatabase } from "../helpers/db";
import { connectToDatabase } from "@/lib/db";
import { createCustomer } from "@/actions/customers";
import { createEmployee } from "@/actions/employees";
import { getFinanceDashboardSummary } from "@/actions/accounts";
import { JobCard } from "@/models/JobCard";
import { updateTaskStatus } from "@/actions/jobCards";

beforeAll(async () => {
  await setupTestDatabase();
});

afterAll(async () => {
  await teardownTestDatabase();
});

beforeEach(async () => {
  await clearTestDatabase();
});

describe("role enforcement", () => {
  it("rejects createCustomer for a technician session", async () => {
    setMockSession({ user: { id: "507f1f77bcf86cd799439012", role: "technician" } });
    await expect(
      createCustomer({ name: "Someone", phone: "01799999999" })
    ).rejects.toThrow("Unauthorized");
  });

  it("rejects createEmployee for a manager session (admin only)", async () => {
    setMockSession({ user: { id: "507f1f77bcf86cd799439013", role: "manager" } });
    await expect(
      createEmployee({
        name: "New Hire",
        phone: "01788888888",
        hourlyRate: 100,
        requiredHoursPerDay: 8,
        createLogin: false,
      })
    ).rejects.toThrow("Unauthorized");
  });

  it("rejects getFinanceDashboardSummary for a manager session (admin only)", async () => {
    setMockSession({ user: { id: "507f1f77bcf86cd799439013", role: "manager" } });
    await expect(getFinanceDashboardSummary()).rejects.toThrow("Unauthorized");
  });

  it("rejects a technician marking another technician's task complete", async () => {
    await connectToDatabase();
    const ownerEmployeeId = new mongoose.Types.ObjectId();
    const otherEmployeeId = new mongoose.Types.ObjectId();

    const jobCard = await JobCard.create({
      jobCardNumber: "JC-000002",
      vehicleId: new mongoose.Types.ObjectId(),
      customerId: new mongoose.Types.ObjectId(),
      tasks: [
        {
          description: "Change tires",
          assignedTo: ownerEmployeeId,
          status: "pending",
          assignedDate: new Date(),
        },
      ],
    });
    const taskId = jobCard.tasks[0]._id!.toString();

    setMockSession({
      user: { id: "507f1f77bcf86cd799439014", role: "technician", employeeId: otherEmployeeId.toString() },
    });

    const result = await updateTaskStatus({
      jobCardId: jobCard._id.toString(),
      taskId,
      status: "completed",
    });

    expect(result.success).toBe(false);

    const unchanged = await JobCard.findById(jobCard._id).lean();
    expect(unchanged?.tasks[0].status).toBe("pending");
  });
});
