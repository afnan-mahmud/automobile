"use server";

import { z } from "zod";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { connectToDatabase } from "@/lib/db";
import { auth, requireRole } from "@/lib/auth";
import { serialize } from "@/lib/serialize";
import { Employee } from "@/models/Employee";
import { User } from "@/models/User";
import { AttendanceRecord, ATTENDANCE_STATUSES } from "@/models/AttendanceRecord";
import { JobCard } from "@/models/JobCard";
import type { ActionResult } from "@/actions/customers";

function isDuplicateKeyError(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code?: number }).code === 11000
  );
}

async function requireSelfOrManager(employeeId: string) {
  const session = await auth();
  if (!session?.user) {
    throw new Error("Unauthorized");
  }
  if (session.user.role === "admin" || session.user.role === "manager") {
    return session;
  }
  if (session.user.role === "technician" && session.user.employeeId === employeeId) {
    return session;
  }
  throw new Error("Unauthorized");
}

/**
 * Lightweight active-employee lookup used by the task-assignment dropdown
 * on Job Cards.
 */
export async function listActiveEmployees() {
  await requireRole(["admin", "manager"]);
  await connectToDatabase();

  const employees = await Employee.find({ active: true })
    .sort({ name: 1 })
    .select("name designation")
    .lean();

  return serialize(employees);
}

export async function listEmployees() {
  await requireRole(["admin"]);
  await connectToDatabase();

  const employees = await Employee.find().sort({ name: 1 }).lean();
  return serialize(employees);
}

const employeeInputSchema = z.object({
  name: z.string().min(1, "Name is required"),
  phone: z.string().min(1, "Phone is required"),
  designation: z.string().optional(),
  hourlyRate: z.coerce.number().positive("Hourly rate must be positive"),
  requiredHoursPerDay: z.coerce.number().positive().default(8),
  joinDate: z.coerce.date().optional(),
});

const createEmployeeSchema = employeeInputSchema.extend({
  createLogin: z.boolean().default(false),
  loginRole: z.enum(["manager", "technician"]).optional(),
  loginIdentifier: z.string().optional(),
  loginPassword: z.string().min(6).optional(),
});

export type CreateEmployeeInput = z.infer<typeof createEmployeeSchema>;

export async function createEmployee(
  input: CreateEmployeeInput
): Promise<ActionResult<{ id: string; loginCreated: boolean; loginError?: string }>> {
  await requireRole(["admin"]);

  const parsed = createEmployeeSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  await connectToDatabase();

  const { createLogin, loginRole, loginIdentifier, loginPassword, ...employeeFields } =
    parsed.data;

  const employee = await Employee.create(employeeFields);

  let loginCreated = false;
  let loginError: string | undefined;

  if (createLogin) {
    if (!loginRole || !loginIdentifier || !loginPassword) {
      loginError = "Login role, identifier, and password are all required to create a login";
    } else {
      try {
        const passwordHash = await bcrypt.hash(loginPassword, 10);
        const isEmail = loginIdentifier.includes("@");
        const user = await User.create({
          name: employeeFields.name,
          email: isEmail ? loginIdentifier.toLowerCase() : undefined,
          phone: isEmail ? undefined : loginIdentifier,
          passwordHash,
          role: loginRole,
          employeeId: employee._id,
        });
        employee.userId = user._id;
        await employee.save();
        loginCreated = true;
      } catch (err) {
        loginError = isDuplicateKeyError(err)
          ? "A user with this email/phone already exists"
          : "Failed to create login";
      }
    }
  }

  revalidatePath("/employees");
  return {
    success: true,
    data: { id: employee._id.toString(), loginCreated, loginError },
  };
}

const updateEmployeeSchema = employeeInputSchema.partial().extend({
  id: z.string().min(1),
  active: z.boolean().optional(),
});

export async function updateEmployee(
  input: z.infer<typeof updateEmployeeSchema>
): Promise<ActionResult<{ id: string }>> {
  await requireRole(["admin"]);

  const parsed = updateEmployeeSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  await connectToDatabase();
  const { id, ...rest } = parsed.data;

  const updated = await Employee.findByIdAndUpdate(id, rest, { new: true });
  if (!updated) {
    return { success: false, error: "Employee not found" };
  }

  revalidatePath("/employees");
  revalidatePath(`/employees/${id}`);
  return { success: true, data: { id } };
}

const markAttendanceSchema = z.object({
  employeeId: z.string().min(1),
  date: z.coerce.date(),
  checkIn: z.coerce.date().optional(),
  checkOut: z.coerce.date().optional(),
  status: z.enum(ATTENDANCE_STATUSES).default("present"),
});

export async function markAttendance(
  input: z.infer<typeof markAttendanceSchema>
): Promise<ActionResult<{ id: string }>> {
  await requireRole(["admin", "manager"]);

  const parsed = markAttendanceSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const { employeeId, date, checkIn, checkOut, status } = parsed.data;

  if (checkIn && checkOut && checkOut.getTime() <= checkIn.getTime()) {
    return { success: false, error: "Check-out must be after check-in" };
  }

  const hoursWorked =
    checkIn && checkOut ? (checkOut.getTime() - checkIn.getTime()) / 3600000 : 0;

  await connectToDatabase();
  const dayStart = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
  );

  const record = await AttendanceRecord.findOneAndUpdate(
    { employeeId, date: dayStart },
    { checkIn, checkOut, hoursWorked, status },
    { upsert: true, new: true }
  );

  revalidatePath("/attendance");
  revalidatePath(`/employees/${employeeId}`);
  return { success: true, data: { id: record._id.toString() } };
}

export async function getAttendanceByEmployee(
  employeeId: string,
  from?: string,
  to?: string
) {
  await requireSelfOrManager(employeeId);
  await connectToDatabase();

  const filter: Record<string, unknown> = { employeeId };
  if (from || to) {
    filter.date = {
      ...(from ? { $gte: new Date(from) } : {}),
      ...(to ? { $lte: new Date(to) } : {}),
    };
  }

  const records = await AttendanceRecord.find(filter).sort({ date: -1 }).lean();
  return serialize(records);
}

export async function getEmployeeWorkReport(
  employeeId: string,
  from: string,
  to: string
) {
  await requireSelfOrManager(employeeId);
  await connectToDatabase();

  const fromDate = new Date(from);
  const toDate = new Date(to);

  const jobCards = await JobCard.find({ "tasks.assignedTo": employeeId }).lean();

  const completedTasks: {
    jobCardNumber: string;
    description: string;
    completedDate: Date;
  }[] = [];

  for (const jc of jobCards) {
    for (const task of jc.tasks) {
      if (
        task.assignedTo?.toString() === employeeId &&
        task.status === "completed" &&
        task.completedDate &&
        task.completedDate >= fromDate &&
        task.completedDate <= toDate
      ) {
        completedTasks.push({
          jobCardNumber: jc.jobCardNumber,
          description: task.description,
          completedDate: task.completedDate,
        });
      }
    }
  }

  const attendance = await AttendanceRecord.find({
    employeeId,
    date: { $gte: fromDate, $lte: toDate },
  })
    .sort({ date: 1 })
    .lean();

  const totalHours = attendance.reduce((sum, a) => sum + (a.hoursWorked || 0), 0);

  return serialize({ completedTasks, attendance, totalHours });
}

export async function getEmployeeById(id: string) {
  await requireSelfOrManager(id);
  await connectToDatabase();

  const employee = await Employee.findById(id).lean();
  if (!employee) {
    return null;
  }
  return serialize(employee);
}
