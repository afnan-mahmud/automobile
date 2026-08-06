"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { connectToDatabase } from "@/lib/db";
import { auth, requireRole } from "@/lib/auth";
import { serialize } from "@/lib/serialize";
import { Employee } from "@/models/Employee";
import { AttendanceRecord } from "@/models/AttendanceRecord";
import { SalaryRecord } from "@/models/SalaryRecord";
import type { ActionResult } from "@/actions/customers";

async function calculateAndUpsertSalary(employeeId: string, month: number, year: number) {
  const employee = await Employee.findById(employeeId).lean();
  if (!employee) {
    throw new Error("Employee not found");
  }

  const monthStart = new Date(Date.UTC(year, month - 1, 1));
  const monthEnd = new Date(Date.UTC(year, month, 1));

  const attendance = await AttendanceRecord.find({
    employeeId,
    date: { $gte: monthStart, $lt: monthEnd },
  }).lean();

  const reqHoursPerDay = employee.requiredHoursPerDay || 8;
  const workingDays = attendance.length;
  const requiredHours = workingDays * reqHoursPerDay;

  const hourlyRate =
    employee.hourlyRate ||
    (employee.salaryAmount
      ? employee.salaryType === "daily"
        ? employee.salaryAmount / reqHoursPerDay
        : employee.salaryAmount / (30 * reqHoursPerDay)
      : 0);

  const overtimeHourlyRate =
    employee.overtimeHourlyRate && employee.overtimeHourlyRate > 0
      ? employee.overtimeHourlyRate
      : hourlyRate;

  let totalHoursWorked = 0;
  let totalRegularHours = 0;
  let totalOvertimeHours = 0;
  let totalShortfallHours = 0;

  for (const record of attendance) {
    if (record.status === "absent") {
      // Absent day: No money is added, full required hours are added to shortfall deduction
      totalShortfallHours += reqHoursPerDay;
      continue;
    }

    const dayHours = record.hoursWorked || 0;
    totalHoursWorked += dayHours;

    const regularHours = Math.min(dayHours, reqHoursPerDay);
    const overtimeHours = Math.max(0, dayHours - reqHoursPerDay);
    const shortfallHours = Math.max(0, reqHoursPerDay - dayHours);

    totalRegularHours += regularHours;
    totalOvertimeHours += overtimeHours;
    totalShortfallHours += shortfallHours;
  }

  const deduction = totalShortfallHours * hourlyRate;
  const overtimeAmount = totalOvertimeHours * overtimeHourlyRate;
  const baseSalary = totalRegularHours * hourlyRate;
  const netSalary = baseSalary + overtimeAmount;

  return SalaryRecord.findOneAndUpdate(
    { employeeId, month, year },
    {
      totalHoursWorked,
      requiredHours,
      deduction,
      overtimeAmount,
      netSalary,
      generatedAt: new Date(),
    },
    { upsert: true, new: true }
  );
}

const generateSalarySchema = z.object({
  employeeId: z.string().min(1),
  month: z.coerce.number().int().min(1).max(12),
  year: z.coerce.number().int().min(2000),
});

export async function generateSalaryForMonth(
  input: z.infer<typeof generateSalarySchema>
): Promise<ActionResult<{ id: string }>> {
  await requireRole(["admin"]);

  const parsed = generateSalarySchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  await connectToDatabase();

  try {
    const record = await calculateAndUpsertSalary(
      parsed.data.employeeId,
      parsed.data.month,
      parsed.data.year
    );
    revalidatePath("/salary");
    return { success: true, data: { id: record._id.toString() } };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to generate salary",
    };
  }
}

const generateAllSchema = z.object({
  month: z.coerce.number().int().min(1).max(12),
  year: z.coerce.number().int().min(2000),
});

export async function generateSalaryForAllEmployees(
  input: z.infer<typeof generateAllSchema>
): Promise<ActionResult<{ count: number }>> {
  await requireRole(["admin"]);

  const parsed = generateAllSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  await connectToDatabase();

  const employees = await Employee.find({ active: true }).select("_id").lean();
  let count = 0;
  for (const employee of employees) {
    await calculateAndUpsertSalary(
      employee._id.toString(),
      parsed.data.month,
      parsed.data.year
    );
    count += 1;
  }

  revalidatePath("/salary");
  return { success: true, data: { count } };
}

export async function getSalaryRecord(employeeId: string, month: number, year: number) {
  const session = await auth();
  if (!session?.user) {
    throw new Error("Unauthorized");
  }
  const isSelf =
    session.user.role === "technician" && session.user.employeeId === employeeId;
  if (session.user.role !== "admin" && !isSelf) {
    throw new Error("Unauthorized");
  }

  await connectToDatabase();
  const record = await SalaryRecord.findOne({ employeeId, month, year }).lean();
  return record ? serialize(record) : null;
}

export async function listSalaryRecords(month: number, year: number) {
  await requireRole(["admin"]);
  await connectToDatabase();

  const records = await SalaryRecord.find({ month, year })
    .populate("employeeId", "name designation")
    .lean();

  return serialize(records);
}
