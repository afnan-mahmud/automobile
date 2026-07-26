import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import mongoose from "mongoose";

import { setupTestDatabase, teardownTestDatabase, clearTestDatabase } from "../helpers/db";
import { connectToDatabase } from "@/lib/db";
import { JobCard } from "@/models/JobCard";
import { carryForwardOverdueTasks } from "@/lib/taskCarryForward";

beforeAll(async () => {
  await setupTestDatabase();
});

afterAll(async () => {
  await teardownTestDatabase();
});

beforeEach(async () => {
  await clearTestDatabase();
});

describe("carryForwardOverdueTasks", () => {
  it("carries an overdue pending task forward exactly once per day", async () => {
    await connectToDatabase();

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    const jobCard = await JobCard.create({
      jobCardNumber: "JC-000001",
      vehicleId: new mongoose.Types.ObjectId(),
      customerId: new mongoose.Types.ObjectId(),
      tasks: [
        {
          description: "Oil change",
          assignedTo: new mongoose.Types.ObjectId(),
          status: "pending",
          assignedDate: yesterday,
        },
      ],
    });

    const first = await carryForwardOverdueTasks();
    expect(first.ranToday).toBe(true);
    expect(first.carriedCount).toBe(1);

    let updated = await JobCard.findById(jobCard._id).lean();
    expect(updated?.tasks).toHaveLength(2);
    expect(updated?.tasks[0].status).toBe("carried_forward");
    expect(updated?.tasks[1].status).toBe("pending");
    expect(updated?.tasks[1].carriedForwardFromDate).toBeTruthy();

    const second = await carryForwardOverdueTasks();
    expect(second.ranToday).toBe(false);
    expect(second.carriedCount).toBe(0);

    updated = await JobCard.findById(jobCard._id).lean();
    expect(updated?.tasks).toHaveLength(2);
  });
});
