import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";

vi.mock("@/lib/auth");
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { setMockSession } from "@/lib/__mocks__/auth";
import { setupTestDatabase, teardownTestDatabase, clearTestDatabase } from "../helpers/db";
import { connectToDatabase } from "@/lib/db";
import { Product } from "@/models/Product";
import { recordRetailSale } from "@/actions/stock";

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

describe("recordRetailSale concurrency", () => {
  it("never lets quantityInStock go negative under overlapping sales", async () => {
    await connectToDatabase();

    const product = await Product.create({
      name: "Brake Pad",
      sku: "BP-001",
      category: "part",
      unitPrice: 500,
      quantityInStock: 10,
    });

    const attempts = Array.from({ length: 20 }, () =>
      recordRetailSale({
        productId: product._id.toString(),
        quantity: 1,
        paymentMethod: "cash",
      })
    );
    const results = await Promise.all(attempts);

    const succeeded = results.filter((r) => r.success);
    const failed = results.filter((r) => !r.success);

    expect(succeeded).toHaveLength(10);
    expect(failed).toHaveLength(10);

    const finalProduct = await Product.findById(product._id).lean();
    expect(finalProduct?.quantityInStock).toBe(0);
  });
});
