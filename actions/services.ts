"use server";

import { connectToDatabase } from "@/lib/db";
import { Service } from "@/models/Service";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { DEPARTMENTS } from "@/types/department";

const serviceSchema = z.object({
  name: z.string().min(1, "Name is required"),
  department: z.enum(DEPARTMENTS as unknown as [string, ...string[]]),
  expectedCosting: z.coerce.number().min(0, "Costing cannot be negative"),
});

export async function listServices() {
  await connectToDatabase();
  const services = await Service.find().sort({ department: 1, name: 1 }).lean();
  return JSON.parse(JSON.stringify(services));
}

export async function createService(data: z.infer<typeof serviceSchema>) {
  const result = serviceSchema.safeParse(data);
  if (!result.success) {
    return { success: false, error: result.error.issues[0].message };
  }

  await connectToDatabase();
  try {
    const newService = await Service.create(result.data);
    revalidatePath("/services");
    return { success: true, data: JSON.parse(JSON.stringify(newService)) };
  } catch (error: any) {
    console.error("Error creating service:", error);
    return { success: false, error: "Failed to create service" };
  }
}

export async function updateService(id: string, data: Partial<z.infer<typeof serviceSchema>>) {
  await connectToDatabase();
  try {
    const updated = await Service.findByIdAndUpdate(id, data, { new: true }).lean();
    if (!updated) {
      return { success: false, error: "Service not found" };
    }
    revalidatePath("/services");
    return { success: true, data: JSON.parse(JSON.stringify(updated)) };
  } catch (error: any) {
    console.error("Error updating service:", error);
    return { success: false, error: "Failed to update service" };
  }
}

export async function deleteService(id: string) {
  await connectToDatabase();
  try {
    await Service.findByIdAndDelete(id);
    revalidatePath("/services");
    return { success: true };
  } catch (error: any) {
    console.error("Error deleting service:", error);
    return { success: false, error: "Failed to delete service" };
  }
}
