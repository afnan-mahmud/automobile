"use server";

import { z } from "zod";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { connectToDatabase } from "@/lib/db";
import { auth, requireRole } from "@/lib/auth";
import { serialize } from "@/lib/serialize";
import { deriveSalaryRates } from "@/lib/employees";
import { Employee } from "@/models/Employee";
import { User } from "@/models/User";
import { AttendanceRecord, ATTENDANCE_STATUSES } from "@/models/AttendanceRecord";
import { JobCard } from "@/models/JobCard";
import type { ActionResult } from "@/actions/customers";
import { DEPARTMENTS } from "@/types/department";

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
    .select("name designation departments")
    .lean();

  return serialize(employees);
}

export async function listEmployees() {
  await requireRole(["admin"]);
  await connectToDatabase();

  const employees = await Employee.find()
    .populate("userId", "role email phone active")
    .sort({ name: 1 })
    .lean();
  return serialize(employees);
}

const employeeInputSchema = z.object({
  name: z.string().min(1, "Name is required"),
  phone: z.string().min(1, "Phone is required"),
  email: z.string().email("Invalid email address").optional().or(z.literal("")),
  designation: z.string().optional(),
  departments: z.array(z.enum(DEPARTMENTS as unknown as [string, ...string[]])).optional(),
  salaryType: z.enum(["daily", "monthly"]).default("monthly"),
  salaryAmount: z.coerce.number().positive("Salary amount must be positive").optional(),
  hourlyRate: z.coerce.number().positive("Hourly rate must be positive").optional(),
  overtimeHourlyRate: z.coerce.number().positive("Overtime hourly rate must be positive").optional(),
  requiredHoursPerDay: z.coerce.number().positive().default(8),
  joinDate: z.coerce.date().optional(),
});

const createEmployeeSchema = employeeInputSchema.extend({
  createLogin: z.boolean().default(false),
  loginRole: z.enum(["manager", "technician"]).optional(),
  loginIdentifier: z.string().optional(),
  loginPassword: z.string().min(6).optional(),
});

export type CreateEmployeeInput = z.input<typeof createEmployeeSchema>;

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

  const rates = deriveSalaryRates({
    salaryType: employeeFields.salaryType,
    salaryAmount: employeeFields.salaryAmount,
    hourlyRate: employeeFields.hourlyRate,
    overtimeHourlyRate: employeeFields.overtimeHourlyRate,
    requiredHoursPerDay: employeeFields.requiredHoursPerDay,
  });

  if (rates.hourlyRate <= 0) {
    return { success: false, error: "Valid salary amount or hourly rate is required" };
  }

  const employee = await Employee.create({
    ...employeeFields,
    salaryType: rates.salaryType,
    salaryAmount: rates.salaryAmount,
    hourlyRate: rates.hourlyRate,
    overtimeHourlyRate: rates.overtimeHourlyRate,
    requiredHoursPerDay: rates.requiredHoursPerDay,
  });

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
  createLogin: z.boolean().optional(),
  loginRole: z.enum(["manager", "technician"]).optional(),
  loginIdentifier: z.string().optional(),
  loginPassword: z.string().min(6, "Password must be at least 6 characters").optional(),
});

export type UpdateEmployeeInput = z.input<typeof updateEmployeeSchema>;

export async function updateEmployee(
  input: UpdateEmployeeInput
): Promise<
  ActionResult<{
    id: string;
    loginCreated?: boolean;
    loginUpdated?: boolean;
    loginError?: string;
  }>
> {
  const session = await auth();
  if (!session?.user) {
    return { success: false, error: "Unauthorized" };
  }

  const isAdmin = session.user.role === "admin";
  if (!isAdmin && session.user.role !== "manager") {
    return { success: false, error: "Unauthorized" };
  }

  const parsed = updateEmployeeSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  await connectToDatabase();
  const {
    id,
    createLogin,
    loginRole,
    loginIdentifier,
    loginPassword,
    ...employeeFields
  } = parsed.data;

  const employee = await Employee.findById(id);
  if (!employee) {
    return { success: false, error: "Employee not found" };
  }

  // Admin-only salary edit permission enforcement
  if (!isAdmin) {
    delete employeeFields.salaryType;
    delete employeeFields.salaryAmount;
    delete employeeFields.hourlyRate;
    delete employeeFields.overtimeHourlyRate;
    delete employeeFields.requiredHoursPerDay;
  } else if (
    employeeFields.salaryAmount !== undefined ||
    employeeFields.salaryType !== undefined ||
    employeeFields.hourlyRate !== undefined ||
    employeeFields.overtimeHourlyRate !== undefined ||
    employeeFields.requiredHoursPerDay !== undefined
  ) {
    const rates = deriveSalaryRates({
      salaryType: employeeFields.salaryType || employee.salaryType || "monthly",
      salaryAmount:
        employeeFields.salaryAmount !== undefined
          ? employeeFields.salaryAmount
          : employee.salaryAmount,
      hourlyRate:
        employeeFields.hourlyRate !== undefined
          ? employeeFields.hourlyRate
          : employee.hourlyRate,
      overtimeHourlyRate:
        employeeFields.overtimeHourlyRate !== undefined
          ? employeeFields.overtimeHourlyRate
          : employee.overtimeHourlyRate,
      requiredHoursPerDay:
        employeeFields.requiredHoursPerDay !== undefined
          ? employeeFields.requiredHoursPerDay
          : employee.requiredHoursPerDay || 8,
    });

    employeeFields.salaryType = rates.salaryType;
    employeeFields.salaryAmount = rates.salaryAmount;
    employeeFields.hourlyRate = rates.hourlyRate;
    employeeFields.overtimeHourlyRate = rates.overtimeHourlyRate;
    employeeFields.requiredHoursPerDay = rates.requiredHoursPerDay;
  }

  // Update employee profile fields
  Object.assign(employee, employeeFields);
  await employee.save();

  let loginCreated = false;
  let loginUpdated = false;
  let loginError: string | undefined;

  // Check if there is an existing user account for this employee
  let existingUser = employee.userId
    ? await User.findById(employee.userId)
    : await User.findOne({ employeeId: id });

  if (createLogin && !existingUser) {
    // Creating dashboard login for existing employee
    if (!loginRole || !loginIdentifier || !loginPassword) {
      loginError =
        "Login role, identifier, and password are all required to create a login";
    } else {
      try {
        const passwordHash = await bcrypt.hash(loginPassword, 10);
        const isEmail = loginIdentifier.includes("@");
        const user = await User.create({
          name: employee.name,
          email: isEmail ? loginIdentifier.toLowerCase().trim() : undefined,
          phone: isEmail ? undefined : loginIdentifier.trim(),
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
  } else if (existingUser) {
    // Existing user account exists - keep user profile fields in sync and allow role/password updates
    try {
      if (loginRole) {
        existingUser.role = loginRole;
      }
      if (loginPassword && loginPassword.trim().length >= 6) {
        existingUser.passwordHash = await bcrypt.hash(loginPassword, 10);
        loginUpdated = true;
      }
      if (employeeFields.name) {
        existingUser.name = employeeFields.name;
      }
      await existingUser.save();
      if (!employee.userId) {
        employee.userId = existingUser._id;
        await employee.save();
      }
    } catch {
      loginError = "Failed to update login account";
    }
  }

  revalidatePath("/employees");
  revalidatePath(`/employees/${id}`);
  return {
    success: true,
    data: { id, loginCreated, loginUpdated, loginError },
  };
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
    status === "absent"
      ? 0
      : checkIn && checkOut
      ? (checkOut.getTime() - checkIn.getTime()) / 3600000
      : 0;

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
  revalidatePath("/dashboard");
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

  const totalHours = attendance.reduce((sum, a) => {
    if (a.status === "absent") return sum;
    return sum + (a.hoursWorked || 0);
  }, 0);

  return serialize({ completedTasks, attendance, totalHours });
}

export async function getEmployeeById(id: string) {
  await requireSelfOrManager(id);
  await connectToDatabase();

  const employee = await Employee.findById(id)
    .populate("userId", "name email phone role active")
    .lean();
  if (!employee) {
    return null;
  }

  if (!employee.userId) {
    const linkedUser = await User.findOne({ employeeId: id })
      .select("name email phone role active")
      .lean();
    if (linkedUser) {
      employee.userId = linkedUser;
    }
  }

  return serialize(employee);
}
