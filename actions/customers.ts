"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { connectToDatabase } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { serialize } from "@/lib/serialize";
import { Customer } from "@/models/Customer";
import { Vehicle } from "@/models/Vehicle";

export type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

function isDuplicateKeyError(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code?: number }).code === 11000
  );
}

const customerInputSchema = z.object({
  name: z.string().min(1, "Name is required"),
  phone: z.string().min(1, "Phone is required"),
  email: z
    .union([z.literal(""), z.string().email("Invalid email address")])
    .optional(),
  address: z.string().optional(),
});

export type CustomerInput = z.infer<typeof customerInputSchema>;

export async function createCustomer(
  input: CustomerInput
): Promise<ActionResult<{ id: string }>> {
  await requireRole(["admin", "manager"]);

  const parsed = customerInputSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  await connectToDatabase();

  try {
    const customer = await Customer.create({
      name: parsed.data.name,
      phone: parsed.data.phone,
      email: parsed.data.email || undefined,
      address: parsed.data.address || undefined,
    });
    revalidatePath("/customers");
    return { success: true, data: { id: customer._id.toString() } };
  } catch (err) {
    if (isDuplicateKeyError(err)) {
      return {
        success: false,
        error: "A customer with this phone number already exists",
      };
    }
    throw err;
  }
}

const updateCustomerSchema = customerInputSchema.partial().extend({
  id: z.string().min(1),
});

export type UpdateCustomerInput = z.infer<typeof updateCustomerSchema>;

export async function updateCustomer(
  input: UpdateCustomerInput
): Promise<ActionResult<{ id: string }>> {
  await requireRole(["admin", "manager"]);

  const parsed = updateCustomerSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  await connectToDatabase();
  const { id, ...rest } = parsed.data;

  try {
    const updated = await Customer.findByIdAndUpdate(id, rest, { new: true });
    if (!updated) {
      return { success: false, error: "Customer not found" };
    }
    revalidatePath("/customers");
    revalidatePath(`/customers/${id}`);
    return { success: true, data: { id } };
  } catch (err) {
    if (isDuplicateKeyError(err)) {
      return {
        success: false,
        error: "A customer with this phone number already exists",
      };
    }
    throw err;
  }
}

export async function searchCustomers(query: string) {
  await requireRole(["admin", "manager"]);
  await connectToDatabase();

  const trimmed = query.trim();
  const filter = trimmed
    ? {
        $or: [
          { name: { $regex: trimmed, $options: "i" } },
          { phone: { $regex: trimmed, $options: "i" } },
        ],
      }
    : {};

  const customers = await Customer.find(filter)
    .sort({ createdAt: -1 })
    .limit(50)
    .lean();

  return serialize(customers);
}

export async function getCustomerWithVehicles(id: string) {
  await requireRole(["admin", "manager"]);
  await connectToDatabase();

  const customer = await Customer.findById(id).lean();
  if (!customer) {
    return null;
  }

  const vehicles = await Vehicle.find({ customerId: id })
    .sort({ createdAt: -1 })
    .lean();

  return serialize({ customer, vehicles });
}
