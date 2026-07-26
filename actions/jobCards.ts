"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { connectToDatabase } from "@/lib/db";
import { auth, requireRole } from "@/lib/auth";
import { serialize } from "@/lib/serialize";
import { generateSequentialCode } from "@/models/Counter";
import {
  JobCard,
  JOB_CARD_STATUSES,
  TASK_STATUSES,
  type JobCardStatus,
} from "@/models/JobCard";
import { Vehicle } from "@/models/Vehicle";
import { Product } from "@/models/Product";
import { StockTransaction } from "@/models/StockTransaction";
import { carryForwardOverdueTasks } from "@/lib/taskCarryForward";
import "@/models/Employee";
import "@/models/Customer";
import type { ActionResult } from "@/actions/customers";

const taskInputSchema = z.object({
  description: z.string().min(1, "Task description is required"),
  assignedTo: z.string().min(1, "Assignee is required"),
  assignedDate: z.coerce.date(),
});

const createJobCardSchema = z.object({
  vehicleId: z.string().min(1, "Vehicle is required"),
  tasks: z.array(taskInputSchema).default([]),
});

export type CreateJobCardInput = z.infer<typeof createJobCardSchema>;

export async function createJobCard(
  input: CreateJobCardInput
): Promise<ActionResult<{ id: string }>> {
  const session = await requireRole(["admin", "manager"]);

  const parsed = createJobCardSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  await connectToDatabase();

  const vehicle = await Vehicle.findById(parsed.data.vehicleId).lean();
  if (!vehicle) {
    return { success: false, error: "Vehicle not found" };
  }

  const jobCardNumber = await generateSequentialCode("jobCardNumber", "JC");

  const jobCard = await JobCard.create({
    jobCardNumber,
    vehicleId: vehicle._id,
    customerId: vehicle.customerId,
    status: "open",
    tasks: parsed.data.tasks,
    createdBy: session.user.id,
  });

  revalidatePath("/job-cards");
  return { success: true, data: { id: jobCard._id.toString() } };
}

const updateJobCardStatusSchema = z.object({
  id: z.string().min(1),
  status: z.enum(JOB_CARD_STATUSES),
});

export async function updateJobCardStatus(
  input: z.infer<typeof updateJobCardStatusSchema>
): Promise<ActionResult<{ id: string }>> {
  await requireRole(["admin", "manager"]);

  const parsed = updateJobCardStatusSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  await connectToDatabase();
  const updated = await JobCard.findByIdAndUpdate(
    parsed.data.id,
    { status: parsed.data.status },
    { new: true }
  );
  if (!updated) {
    return { success: false, error: "Job card not found" };
  }

  revalidatePath("/job-cards");
  revalidatePath(`/job-cards/${parsed.data.id}`);
  return { success: true, data: { id: parsed.data.id } };
}

const addTaskSchema = z.object({
  jobCardId: z.string().min(1),
  description: z.string().min(1, "Task description is required"),
  assignedTo: z.string().min(1, "Assignee is required"),
  assignedDate: z.coerce.date(),
});

export async function addTask(
  input: z.infer<typeof addTaskSchema>
): Promise<ActionResult<{ id: string }>> {
  await requireRole(["admin", "manager"]);

  const parsed = addTaskSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  await connectToDatabase();
  const { jobCardId, ...task } = parsed.data;

  const updated = await JobCard.findByIdAndUpdate(
    jobCardId,
    { $push: { tasks: task } },
    { new: true }
  );
  if (!updated) {
    return { success: false, error: "Job card not found" };
  }

  revalidatePath(`/job-cards/${jobCardId}`);
  return { success: true, data: { id: jobCardId } };
}

const updateTaskStatusSchema = z.object({
  jobCardId: z.string().min(1),
  taskId: z.string().min(1),
  status: z.enum(TASK_STATUSES),
});

export async function updateTaskStatus(
  input: z.infer<typeof updateTaskStatusSchema>
): Promise<ActionResult<{ id: string }>> {
  const session = await auth();
  if (
    !session?.user ||
    !["admin", "manager", "technician"].includes(session.user.role)
  ) {
    return { success: false, error: "Unauthorized" };
  }

  const parsed = updateTaskStatusSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  await connectToDatabase();
  const jobCard = await JobCard.findById(parsed.data.jobCardId);
  if (!jobCard) {
    return { success: false, error: "Job card not found" };
  }

  const task = jobCard.tasks.id(parsed.data.taskId);
  if (!task) {
    return { success: false, error: "Task not found" };
  }

  if (session.user.role === "technician") {
    if (
      !session.user.employeeId ||
      task.assignedTo.toString() !== session.user.employeeId
    ) {
      return { success: false, error: "You can only update your own tasks" };
    }
  }

  task.status = parsed.data.status;
  task.completedDate = parsed.data.status === "completed" ? new Date() : null;
  await jobCard.save();

  revalidatePath(`/job-cards/${parsed.data.jobCardId}`);
  return { success: true, data: { id: parsed.data.jobCardId } };
}

const addPartsUsedSchema = z.object({
  jobCardId: z.string().min(1),
  productId: z.string().min(1, "Product is required"),
  quantity: z.coerce.number().int().positive("Quantity must be positive"),
});

export async function addPartsUsed(
  input: z.infer<typeof addPartsUsedSchema>
): Promise<ActionResult<{ id: string }>> {
  const session = await requireRole(["admin", "manager"]);

  const parsed = addPartsUsedSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  await connectToDatabase();
  const { jobCardId, ...part } = parsed.data;

  // Atomic conditional decrement so concurrent part usage across job cards
  // and retail sales can never push quantityInStock negative.
  const product = await Product.findOneAndUpdate(
    { _id: part.productId, quantityInStock: { $gte: part.quantity } },
    { $inc: { quantityInStock: -part.quantity } },
    { new: true }
  );

  if (!product) {
    const existing = await Product.findById(part.productId).lean();
    if (!existing) {
      return { success: false, error: "Product not found" };
    }
    return {
      success: false,
      error: `Insufficient stock for ${existing.name}: only ${existing.quantityInStock} available`,
    };
  }

  const updated = await JobCard.findByIdAndUpdate(
    jobCardId,
    { $push: { partsUsed: part } },
    { new: true }
  );
  if (!updated) {
    // Job card vanished mid-request — roll back the stock decrement.
    await Product.findByIdAndUpdate(part.productId, {
      $inc: { quantityInStock: part.quantity },
    });
    return { success: false, error: "Job card not found" };
  }

  await StockTransaction.create({
    productId: product._id,
    type: "job_card_usage",
    quantity: -part.quantity,
    relatedJobCardId: jobCardId,
    createdBy: session.user.id,
  });

  revalidatePath(`/job-cards/${jobCardId}`);
  return { success: true, data: { id: jobCardId } };
}

export async function listJobCards(status?: JobCardStatus | "all") {
  await requireRole(["admin", "manager", "technician"]);
  await connectToDatabase();

  // Lazy daily check — see lib/taskCarryForward.ts for why this runs here
  // instead of on a real cron.
  await carryForwardOverdueTasks();

  const filter = status && status !== "all" ? { status } : {};

  const jobCards = await JobCard.find(filter)
    .sort({ createdAt: -1 })
    .limit(100)
    .populate("vehicleId", "registrationNumber make model")
    .populate("customerId", "name phone")
    .lean();

  return serialize(
    jobCards.map((jc) => ({
      _id: jc._id,
      jobCardNumber: jc.jobCardNumber,
      status: jc.status,
      vehicle: jc.vehicleId,
      customer: jc.customerId,
      taskTotal: jc.tasks.length,
      taskCompleted: jc.tasks.filter((t: { status: string }) => t.status === "completed")
        .length,
      createdAt: jc.createdAt,
    }))
  );
}

export async function getJobCardById(id: string) {
  await requireRole(["admin", "manager", "technician"]);
  await connectToDatabase();

  const jobCard = await JobCard.findById(id)
    .populate("vehicleId", "registrationNumber make model year color")
    .populate("customerId", "name phone")
    .populate("tasks.assignedTo", "name")
    .populate("partsUsed.productId", "name sku")
    .lean();

  if (!jobCard) {
    return null;
  }

  return serialize(jobCard);
}
