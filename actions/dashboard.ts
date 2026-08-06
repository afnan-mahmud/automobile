"use server";

import { auth, requireRole } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db";
import { serialize } from "@/lib/serialize";
import { JobCard, JOB_CARD_STATUSES, type JobCardStatus } from "@/models/JobCard";
import { Invoice } from "@/models/Invoice";
import { Employee } from "@/models/Employee";
import { AttendanceRecord, type AttendanceStatus } from "@/models/AttendanceRecord";
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

  // Unbounded: must scan every job card assigned to this technician so
  // pending/completedThisWeek counts aren't silently truncated once a
  // technician has more than a handful of job cards.
  const allJobCards = await JobCard.find({ "tasks.assignedTo": employeeId }).lean();

  let pending = 0;
  let completedThisWeek = 0;
  for (const jc of allJobCards) {
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

  // Bounded separately: only the preview list needs to stay capped at 5.
  const recentJobCardDocs = await JobCard.find({ "tasks.assignedTo": employeeId })
    .sort({ createdAt: -1 })
    .limit(5)
    .populate("vehicleId", "registrationNumber")
    .populate("customerId", "name")
    .lean();

  const recentJobCards = recentJobCardDocs.map((jc) => ({
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

export type TodayAttendanceItem = {
  employeeId: string;
  name: string;
  designation?: string;
  departments?: string[];
  phone?: string;
  status: AttendanceStatus | "unmarked";
  checkIn?: string | null;
  checkOut?: string | null;
  hoursWorked: number;
};

export type TodayAttendanceSummary = {
  date: string;
  formattedDate: string;
  totalEmployees: number;
  presentCount: number;
  halfDayCount: number;
  absentCount: number;
  leaveCount: number;
  unmarkedCount: number;
  totalPresent: number;
  totalAbsent: number;
  attendanceRate: number;
  records: TodayAttendanceItem[];
};

export async function getTodayAttendanceSummary(
  dateStr?: string
): Promise<TodayAttendanceSummary> {
  await requireRole(["admin", "manager"]);
  await connectToDatabase();

  let dayStart: Date;
  let dayEnd: Date;
  let dateKey: string;

  if (dateStr) {
    const parts = dateStr.split("-").map(Number);
    if (parts.length === 3 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2])) {
      dayStart = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2], 0, 0, 0, 0));
      dayEnd = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2], 23, 59, 59, 999));
      dateKey = dateStr;
    } else {
      const dObj = new Date(dateStr);
      dayStart = new Date(
        Date.UTC(dObj.getUTCFullYear(), dObj.getUTCMonth(), dObj.getUTCDate(), 0, 0, 0, 0)
      );
      dayEnd = new Date(
        Date.UTC(dObj.getUTCFullYear(), dObj.getUTCMonth(), dObj.getUTCDate(), 23, 59, 59, 999)
      );
      dateKey = dObj.toISOString().slice(0, 10);
    }
  } else {
    const now = new Date();
    dayStart = new Date(
      Date.UTC(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0)
    );
    dayEnd = new Date(
      Date.UTC(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999)
    );
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const dd = String(now.getDate()).padStart(2, "0");
    dateKey = `${now.getFullYear()}-${mm}-${dd}`;
  }

  const activeEmployees = await Employee.find({ active: true })
    .select("_id name designation departments phone")
    .sort({ name: 1 })
    .lean();

  const attendanceRecords = await AttendanceRecord.find({
    date: { $gte: dayStart, $lte: dayEnd },
  }).lean();

  const recordMap = new Map(
    attendanceRecords.map((r) => [r.employeeId.toString(), r])
  );

  let presentCount = 0;
  let halfDayCount = 0;
  let absentCount = 0;
  let leaveCount = 0;
  let unmarkedCount = 0;

  const records: TodayAttendanceItem[] = activeEmployees.map((emp) => {
    const rec = recordMap.get(emp._id.toString());
    const status: AttendanceStatus | "unmarked" = rec
      ? (rec.status as AttendanceStatus)
      : "unmarked";

    if (status === "present") presentCount++;
    else if (status === "half_day") halfDayCount++;
    else if (status === "absent") absentCount++;
    else if (status === "leave") leaveCount++;
    else unmarkedCount++;

    return {
      employeeId: emp._id.toString(),
      name: emp.name,
      designation: emp.designation,
      departments: emp.departments,
      phone: emp.phone,
      status,
      checkIn: rec?.checkIn ? rec.checkIn.toISOString() : null,
      checkOut: rec?.checkOut ? rec.checkOut.toISOString() : null,
      hoursWorked: rec?.hoursWorked ?? 0,
    };
  });

  const totalEmployees = activeEmployees.length;
  const totalPresent = presentCount + halfDayCount;
  const totalAbsent = absentCount + leaveCount + unmarkedCount;
  const attendanceRate =
    totalEmployees > 0 ? Math.round((totalPresent / totalEmployees) * 100) : 0;

  const formattedDate = new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(dayStart);

  return serialize({
    date: dateKey,
    formattedDate,
    totalEmployees,
    presentCount,
    halfDayCount,
    absentCount,
    leaveCount,
    unmarkedCount,
    totalPresent,
    totalAbsent,
    attendanceRate,
    records,
  });
}

