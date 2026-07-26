"use server";

import { auth, requireRole } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db";
import { serialize } from "@/lib/serialize";
import { JobCard, JOB_CARD_STATUSES, type JobCardStatus } from "@/models/JobCard";
import { Invoice } from "@/models/Invoice";
import "@/models/Vehicle";
import "@/models/Customer";

export async function getJobCardStatusBreakdown() {
  await requireRole(["admin", "manager", "technician"]);
  await connectToDatabase();

  const counts = await JobCard.aggregate([
    { $group: { _id: "$status", count: { $sum: 1 } } },
  ]);
  const byStatus = Object.fromEntries(counts.map((c) => [c._id, c.count]));

  return JOB_CARD_STATUSES.map((status) => ({
    status,
    count: byStatus[status] ?? 0,
  }));
}

export async function getTopServicedVehicles(limit = 5) {
  await requireRole(["admin", "manager"]);
  await connectToDatabase();

  const rows = await JobCard.aggregate([
    {
      $group: {
        _id: "$vehicleId",
        jobCardCount: { $sum: 1 },
        lastServiceDate: { $max: "$createdAt" },
      },
    },
    { $sort: { jobCardCount: -1 } },
    { $limit: limit },
    { $lookup: { from: "vehicles", localField: "_id", foreignField: "_id", as: "vehicle" } },
    { $unwind: "$vehicle" },
    {
      $lookup: {
        from: "customers",
        localField: "vehicle.customerId",
        foreignField: "_id",
        as: "customer",
      },
    },
    { $unwind: "$customer" },
  ]);

  const spendByVehicle = await Invoice.aggregate([
    { $match: { status: { $in: ["paid", "partially_paid"] } } },
    { $lookup: { from: "jobcards", localField: "jobCardId", foreignField: "_id", as: "jobCard" } },
    { $unwind: "$jobCard" },
    { $group: { _id: "$jobCard.vehicleId", totalSpend: { $sum: "$total" } } },
  ]);
  const spendMap = new Map(
    spendByVehicle.map((s) => [s._id.toString(), s.totalSpend as number])
  );

  const combined = rows.map((r) => ({
    vehicleId: r._id.toString(),
    registrationNumber: r.vehicle.registrationNumber as string,
    customerName: r.customer.name as string,
    jobCardCount: r.jobCardCount as number,
    lastServiceDate: r.lastServiceDate,
    lifetimeSpend: spendMap.get(r._id.toString()) ?? 0,
  }));

  combined.sort((a, b) =>
    b.jobCardCount !== a.jobCardCount
      ? b.jobCardCount - a.jobCardCount
      : b.lifetimeSpend - a.lifetimeSpend
  );

  return serialize(combined);
}

export async function getTechnicianDashboard() {
  const session = await auth();
  if (!session?.user || session.user.role !== "technician" || !session.user.employeeId) {
    throw new Error("Unauthorized");
  }
  await connectToDatabase();

  const employeeId = session.user.employeeId;
  const startOfWeek = new Date();
  startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
  startOfWeek.setHours(0, 0, 0, 0);

  const jobCards = await JobCard.find({ "tasks.assignedTo": employeeId })
    .sort({ createdAt: -1 })
    .limit(20)
    .populate("vehicleId", "registrationNumber")
    .populate("customerId", "name")
    .lean();

  let pending = 0;
  let completedThisWeek = 0;
  for (const jc of jobCards) {
    for (const task of jc.tasks) {
      if (task.assignedTo?.toString() !== employeeId) continue;
      if (task.status === "pending" || task.status === "in_progress") pending += 1;
      if (
        task.status === "completed" &&
        task.completedDate &&
        task.completedDate >= startOfWeek
      ) {
        completedThisWeek += 1;
      }
    }
  }

  const recentJobCards = jobCards.slice(0, 5).map((jc) => ({
    _id: jc._id,
    jobCardNumber: jc.jobCardNumber,
    status: jc.status as JobCardStatus,
    vehicle: jc.vehicleId,
    customer: jc.customerId,
    taskTotal: jc.tasks.length,
    taskCompleted: jc.tasks.filter((t: { status: string }) => t.status === "completed").length,
    createdAt: jc.createdAt,
  }));

  return serialize({ pending, completedThisWeek, recentJobCards });
}
