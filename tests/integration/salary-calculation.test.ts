import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";

vi.mock("@/lib/auth");
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { setMockSession } from "@/lib/__mocks__/auth";
import { setupTestDatabase, teardownTestDatabase, clearTestDatabase } from "../helpers/db";
import { connectToDatabase } from "@/lib/db";
import { Employee } from "@/models/Employee";
import { AttendanceRecord } from "@/models/AttendanceRecord";
import { SalaryRecord } from "@/models/SalaryRecord";
import { generateSalaryForMonth } from "@/actions/salary";

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

const MONTH = 3;
const YEAR = 2026;

describe("generateSalaryForMonth", () => {
  it("shows a positive deduction when hours worked fall short of required", async () => {
    await connectToDatabase();
    const employee = await Employee.create({
      name: "Karim",
      phone: "01711111111",
      hourlyRate: 100,
      requiredHoursPerDay: 8,
    });

    await AttendanceRecord.create({
      employeeId: employee._id,
      date: new Date(Date.UTC(YEAR, MONTH - 1, 1)),
      hoursWorked: 6,
      status: "present",
    });
    await AttendanceRecord.create({
      employeeId: employee._id,
      date: new Date(Date.UTC(YEAR, MONTH - 1, 2)),
      hoursWorked: 6,
      status: "present",
    });

    const result = await generateSalaryForMonth({
      employeeId: employee._id.toString(),
      month: MONTH,
      year: YEAR,
    });
    expect(result.success).toBe(true);

    const record = await SalaryRecord.findOne({
      employeeId: employee._id,
      month: MONTH,
      year: YEAR,
    }).lean();

    expect(record?.totalHoursWorked).toBe(12);
    expect(record?.requiredHours).toBe(16);
    expect(record?.deduction).toBeCloseTo(400);
    expect(record?.overtimeAmount).toBe(0);
  });

  it("shows overtime when hours worked exceed required", async () => {
    await connectToDatabase();
    const employee = await Employee.create({
      name: "Rahim",
      phone: "01722222222",
      hourlyRate: 100,
      requiredHoursPerDay: 8,
    });

    await AttendanceRecord.create({
      employeeId: employee._id,
      date: new Date(Date.UTC(YEAR, MONTH - 1, 1)),
      hoursWorked: 10,
      status: "present",
    });
    await AttendanceRecord.create({
      employeeId: employee._id,
      date: new Date(Date.UTC(YEAR, MONTH - 1, 2)),
      hoursWorked: 10,
      status: "present",
    });

    await generateSalaryForMonth({
      employeeId: employee._id.toString(),
      month: MONTH,
      year: YEAR,
    });

    const record = await SalaryRecord.findOne({
      employeeId: employee._id,
      month: MONTH,
      year: YEAR,
    }).lean();

    expect(record?.totalHoursWorked).toBe(20);
    expect(record?.requiredHours).toBe(16);
    expect(record?.deduction).toBe(0);
    expect(record?.overtimeAmount).toBeCloseTo(400);
  });

  it("upserts rather than duplicating when generated twice for the same period", async () => {
    await connectToDatabase();
    const employee = await Employee.create({
      name: "Jamal",
      phone: "01733333333",
      hourlyRate: 50,
      requiredHoursPerDay: 8,
    });
    await AttendanceRecord.create({
      employeeId: employee._id,
      date: new Date(Date.UTC(YEAR, MONTH - 1, 1)),
      hoursWorked: 8,
      status: "present",
    });

    await generateSalaryForMonth({ employeeId: employee._id.toString(), month: MONTH, year: YEAR });
    await generateSalaryForMonth({ employeeId: employee._id.toString(), month: MONTH, year: YEAR });

    const records = await SalaryRecord.find({ employeeId: employee._id, month: MONTH, year: YEAR });
    expect(records).toHaveLength(1);
  });

  it("does not add salary on absent days and pays correctly for present days", async () => {
    await connectToDatabase();
    const employee = await Employee.create({
      name: "Kabir",
      phone: "01744444444",
      hourlyRate: 100,
      overtimeHourlyRate: 150,
      requiredHoursPerDay: 8,
    });

    // Day 1: Present (8h worked) -> 800 Tk
    await AttendanceRecord.create({
      employeeId: employee._id,
      date: new Date(Date.UTC(YEAR, MONTH - 1, 1)),
      hoursWorked: 8,
      status: "present",
    });

    // Day 2: Present (10h worked: 8 regular + 2 OT) -> 800 + 300 = 1100 Tk
    await AttendanceRecord.create({
      employeeId: employee._id,
      date: new Date(Date.UTC(YEAR, MONTH - 1, 2)),
      hoursWorked: 10,
      status: "present",
    });

    // Day 3: Absent -> 0 Tk added, 8h deduction
    await AttendanceRecord.create({
      employeeId: employee._id,
      date: new Date(Date.UTC(YEAR, MONTH - 1, 3)),
      hoursWorked: 0,
      status: "absent",
    });

    await generateSalaryForMonth({
      employeeId: employee._id.toString(),
      month: MONTH,
      year: YEAR,
    });

    const record = await SalaryRecord.findOne({
      employeeId: employee._id,
      month: MONTH,
      year: YEAR,
    }).lean();

    expect(record?.totalHoursWorked).toBe(18);
    expect(record?.requiredHours).toBe(24);
    expect(record?.deduction).toBeCloseTo(800);
    expect(record?.overtimeAmount).toBeCloseTo(300);
    expect(record?.netSalary).toBeCloseTo(1900); // 800 (Day 1) + 1100 (Day 2) + 0 (Day 3 absent)
  });

  it("yields 0 net salary when all recorded days are absent", async () => {
    await connectToDatabase();
    const employee = await Employee.create({
      name: "Tariq",
      phone: "01755555555",
      hourlyRate: 100,
      requiredHoursPerDay: 8,
    });

    await AttendanceRecord.create({
      employeeId: employee._id,
      date: new Date(Date.UTC(YEAR, MONTH - 1, 1)),
      hoursWorked: 0,
      status: "absent",
    });
    await AttendanceRecord.create({
      employeeId: employee._id,
      date: new Date(Date.UTC(YEAR, MONTH - 1, 2)),
      hoursWorked: 0,
      status: "absent",
    });

    await generateSalaryForMonth({
      employeeId: employee._id.toString(),
      month: MONTH,
      year: YEAR,
    });

    const record = await SalaryRecord.findOne({
      employeeId: employee._id,
      month: MONTH,
      year: YEAR,
    }).lean();

    expect(record?.totalHoursWorked).toBe(0);
    expect(record?.requiredHours).toBe(16);
    expect(record?.deduction).toBeCloseTo(1600);
    expect(record?.overtimeAmount).toBe(0);
    expect(record?.netSalary).toBe(0);
  });
});
