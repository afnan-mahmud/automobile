import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";
import mongoose from "mongoose";

vi.mock("@/lib/auth");
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { setMockSession } from "@/lib/__mocks__/auth";
import { setupTestDatabase, teardownTestDatabase, clearTestDatabase } from "../helpers/db";
import { connectToDatabase } from "@/lib/db";
import { Customer } from "@/models/Customer";
import { Vehicle } from "@/models/Vehicle";
import { Service } from "@/models/Service";
import { Product } from "@/models/Product";
import { JobCard } from "@/models/JobCard";
import { GET } from "@/app/api/job-cards/[id]/pdf/route";

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

describe("GET /api/job-cards/[id]/pdf", () => {
  it("returns 200 and PDF buffer for an existing job card", async () => {
    await connectToDatabase();

    const customer = await Customer.create({
      name: "Habib Rahman",
      phone: "01700000000",
    });

    const vehicle = await Vehicle.create({
      customerId: customer._id,
      registrationNumber: "DHAKA-METRO-GA-12-3456",
      make: "Toyota",
      model: "Corolla",
    });

    const service = await Service.create({
      name: "Brake Pad Replacement",
      department: "Engine & Mechanics",
      expectedCosting: 1200,
    });

    const product = await Product.create({
      name: "Brake Pads Set",
      sku: "BP-001",
      category: "part",
      unitPrice: 2500,
      quantityInStock: 10,
    });

    const jobCard = await JobCard.create({
      jobCardNumber: "JC-2026-0001",
      customerId: customer._id,
      vehicleId: vehicle._id,
      status: "in_progress",
      tasks: [
        {
          description: "Inspect and replace front brake pads",
          serviceId: service._id,
          status: "pending",
          assignedTo: new mongoose.Types.ObjectId(),
          assignedDate: new Date(),
        },
      ],
      partsUsed: [
        {
          productId: product._id,
          quantity: 2,
        },
      ],
    });

    const req = new Request(`http://localhost:3000/api/job-cards/${jobCard._id}/pdf`);
    const params = Promise.resolve({ id: jobCard._id.toString() });

    const res = await GET(req, { params });
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("application/pdf");
    expect(res.headers.get("Content-Disposition")).toContain(`Bill-${jobCard.jobCardNumber}.pdf`);

    const arrayBuffer = await res.arrayBuffer();
    expect(arrayBuffer.byteLength).toBeGreaterThan(0);
  });

  it("returns 404 when job card is not found", async () => {
    await connectToDatabase();
    const fakeId = new mongoose.Types.ObjectId().toString();
    const req = new Request(`http://localhost:3000/api/job-cards/${fakeId}/pdf`);
    const params = Promise.resolve({ id: fakeId });

    const res = await GET(req, { params });
    expect(res.status).toBe(404);
  });
});
