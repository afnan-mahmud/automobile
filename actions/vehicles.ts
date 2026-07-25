"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { connectToDatabase } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { Vehicle } from "@/models/Vehicle";
import { Customer } from "@/models/Customer";
import type { ActionResult } from "@/actions/customers";

function isDuplicateKeyError(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code?: number }).code === 11000
  );
}

const vehicleInputSchema = z.object({
  customerId: z.string().min(1, "Customer is required"),
  registrationNumber: z.string().min(1, "Registration number is required"),
  make: z.string().optional(),
  model: z.string().optional(),
  year: z.coerce.number().int().optional(),
  color: z.string().optional(),
});

export type VehicleInput = z.infer<typeof vehicleInputSchema>;

export async function createVehicle(
  input: VehicleInput
): Promise<ActionResult<{ id: string }>> {
  await requireRole(["admin", "manager"]);

  const parsed = vehicleInputSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  await connectToDatabase();

  const customerExists = await Customer.exists({ _id: parsed.data.customerId });
  if (!customerExists) {
    return { success: false, error: "Customer not found" };
  }

  try {
    const vehicle = await Vehicle.create(parsed.data);
    revalidatePath(`/customers/${parsed.data.customerId}`);
    return { success: true, data: { id: vehicle._id.toString() } };
  } catch (err) {
    if (isDuplicateKeyError(err)) {
      return {
        success: false,
        error: "A vehicle with this registration number already exists",
      };
    }
    throw err;
  }
}

const updateVehicleSchema = vehicleInputSchema.partial().extend({
  id: z.string().min(1),
});

export type UpdateVehicleInput = z.infer<typeof updateVehicleSchema>;

export async function updateVehicle(
  input: UpdateVehicleInput
): Promise<ActionResult<{ id: string }>> {
  await requireRole(["admin", "manager"]);

  const parsed = updateVehicleSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  await connectToDatabase();
  const { id, ...rest } = parsed.data;

  try {
    const updated = await Vehicle.findByIdAndUpdate(id, rest, { new: true });
    if (!updated) {
      return { success: false, error: "Vehicle not found" };
    }
    revalidatePath(`/customers/${updated.customerId.toString()}`);
    return { success: true, data: { id } };
  } catch (err) {
    if (isDuplicateKeyError(err)) {
      return {
        success: false,
        error: "A vehicle with this registration number already exists",
      };
    }
    throw err;
  }
}
