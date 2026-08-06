import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";

vi.mock("@/lib/auth");
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { setMockSession } from "@/lib/__mocks__/auth";
import { setupTestDatabase, teardownTestDatabase, clearTestDatabase } from "../helpers/db";
import { connectToDatabase } from "@/lib/db";
import { Employee } from "@/models/Employee";
import { AttendanceRecord } from "@/models/AttendanceRecord";
import { SalaryRecord } from "@/models/SalaryRecord";
import { createEmployee, updateEmployee } from "@/actions/employees";
import { deriveSalaryRates } from "@/lib/employees";
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
  setMockSession({ user: { id: "507f1f77bcf86cd799439011", role: "admin" } });
});

describe("Employee Salary Types (Daily & Monthly) and Admin Editing", () => {
  it("correctly derives hourlyRate for Daily salary type", () => {
    const rates = deriveSalaryRates({
      salaryType: "daily",
      salaryAmount: 800,
      requiredHoursPerDay: 8,
    });
    expect(rates.salaryType).toBe("daily");
    expect(rates.salaryAmount).toBe(800);
    expect(rates.hourlyRate).toBe(100);
    expect(rates.requiredHoursPerDay).toBe(8);
  });

  it("correctly derives hourlyRate for Monthly salary type", () => {
    const rates = deriveSalaryRates({
      salaryType: "monthly",
      salaryAmount: 24000,
      requiredHoursPerDay: 8,
    });
    expect(rates.salaryType).toBe("monthly");
    expect(rates.salaryAmount).toBe(24000);
    // 24000 / (30 * 8) = 100
    expect(rates.hourlyRate).toBe(100);
    expect(rates.requiredHoursPerDay).toBe(8);
  });

  it("creates employee with Daily salary type via createEmployee", async () => {
    await connectToDatabase();
    const result = await createEmployee({
      name: "Daily Worker",
      phone: "01799990001",
      salaryType: "daily",
      salaryAmount: 600,
      requiredHoursPerDay: 8,
    });

    expect(result.success).toBe(true);
    if (!result.success) return;

    const employee = await Employee.findById(result.data.id).lean();
    expect(employee).toBeDefined();
    expect(employee?.salaryType).toBe("daily");
    expect(employee?.salaryAmount).toBe(600);
    expect(employee?.hourlyRate).toBe(75); // 600 / 8 = 75
    expect(employee?.requiredHoursPerDay).toBe(8);
  });

  it("creates employee with Monthly salary type via createEmployee", async () => {
    await connectToDatabase();
    const result = await createEmployee({
      name: "Monthly Worker",
      phone: "01799990002",
      salaryType: "monthly",
      salaryAmount: 30000,
      requiredHoursPerDay: 8,
    });

    expect(result.success).toBe(true);
    if (!result.success) return;

    const employee = await Employee.findById(result.data.id).lean();
    expect(employee).toBeDefined();
    expect(employee?.salaryType).toBe("monthly");
    expect(employee?.salaryAmount).toBe(30000);
    expect(employee?.hourlyRate).toBe(125); // 30000 / (30 * 8) = 125
    expect(employee?.requiredHoursPerDay).toBe(8);
  });

  it("allows Admin to edit employee salary and recalculates rates", async () => {
    await connectToDatabase();
    const employee = await Employee.create({
      name: "Technician A",
      phone: "01799990003",
      salaryType: "daily",
      salaryAmount: 800,
      hourlyRate: 100,
      requiredHoursPerDay: 8,
    });

    setMockSession({ user: { id: "507f1f77bcf86cd799439011", role: "admin" } });

    const updateRes = await updateEmployee({
      id: employee._id.toString(),
      salaryType: "monthly",
      salaryAmount: 48000,
      requiredHoursPerDay: 8,
    });

    expect(updateRes.success).toBe(true);

    const updated = await Employee.findById(employee._id).lean();
    expect(updated?.salaryType).toBe("monthly");
    expect(updated?.salaryAmount).toBe(48000);
    // 48000 / (30 * 8) = 200
    expect(updated?.hourlyRate).toBe(200);
  });

  it("prevents non-Admin from modifying salary fields during profile edit", async () => {
    await connectToDatabase();
    const employee = await Employee.create({
      name: "Technician B",
      phone: "01799990004",
      salaryType: "daily",
      salaryAmount: 800,
      hourlyRate: 100,
      requiredHoursPerDay: 8,
    });

    // Switch session to manager (non-admin)
    setMockSession({ user: { id: "507f1f77bcf86cd799439099", role: "manager" } });

    const updateRes = await updateEmployee({
      id: employee._id.toString(),
      name: "Technician B Renamed",
      salaryType: "monthly",
      salaryAmount: 100000,
      hourlyRate: 500,
    });

    expect(updateRes.success).toBe(true);

    const afterUpdate = await Employee.findById(employee._id).lean();
    expect(afterUpdate?.name).toBe("Technician B Renamed");
    // Salary fields must remain unchanged!
    expect(afterUpdate?.salaryType).toBe("daily");
    expect(afterUpdate?.salaryAmount).toBe(800);
    expect(afterUpdate?.hourlyRate).toBe(100);
  });

  it("calculates salary and deductions accurately for both Daily and Monthly employees", async () => {
    await connectToDatabase();
    const month = 4;
    const year = 2026;

    // 1. Daily worker: 800 Tk/day -> 100 Tk/hr (8h req)
    const dailyEmp = await Employee.create({
      name: "Daily Emp",
      phone: "01799990005",
      salaryType: "daily",
      salaryAmount: 800,
      hourlyRate: 100,
      requiredHoursPerDay: 8,
    });

    // 2 days worked: 1 full day (8h), 1 short day (6h) -> total 14h / 16h req
    await AttendanceRecord.create({
      employeeId: dailyEmp._id,
      date: new Date(Date.UTC(year, month - 1, 1)),
      hoursWorked: 8,
      status: "present",
    });
    await AttendanceRecord.create({
      employeeId: dailyEmp._id,
      date: new Date(Date.UTC(year, month - 1, 2)),
      hoursWorked: 6,
      status: "present",
    });

    setMockSession({ user: { id: "507f1f77bcf86cd799439011", role: "admin" } });
    const salaryResult = await generateSalaryForMonth({
      employeeId: dailyEmp._id.toString(),
      month,
      year,
    });
    expect(salaryResult.success).toBe(true);

    const record = await SalaryRecord.findOne({
      employeeId: dailyEmp._id,
      month,
      year,
    }).lean();

    expect(record?.totalHoursWorked).toBe(14);
    expect(record?.requiredHours).toBe(16);
    expect(record?.deduction).toBe(200); // 2h shortfall * 100/hr = 200
    expect(record?.overtimeAmount).toBe(0);
    expect(record?.netSalary).toBe(1400); // 14h * 100 = 1400
  });

  it("derives and defaults overtimeHourlyRate correctly", () => {
    // When overtimeHourlyRate is not provided, defaults to hourlyRate
    const rates1 = deriveSalaryRates({
      salaryType: "daily",
      salaryAmount: 800,
      requiredHoursPerDay: 8,
    });
    expect(rates1.hourlyRate).toBe(100);
    expect(rates1.overtimeHourlyRate).toBe(100);

    // When custom overtimeHourlyRate is provided
    const rates2 = deriveSalaryRates({
      salaryType: "daily",
      salaryAmount: 800,
      requiredHoursPerDay: 8,
      overtimeHourlyRate: 150,
    });
    expect(rates2.hourlyRate).toBe(100);
    expect(rates2.overtimeHourlyRate).toBe(150);
  });

  it("creates employee with custom overtimeHourlyRate and calculates overtime salary correctly", async () => {
    await connectToDatabase();
    const result = await createEmployee({
      name: "Overtime Technician",
      phone: "01799990006",
      salaryType: "daily",
      salaryAmount: 800, // hourlyRate = 100
      overtimeHourlyRate: 150, // custom OT rate = 150
      requiredHoursPerDay: 8,
    });

    expect(result.success).toBe(true);
    if (!result.success) return;

    const employee = await Employee.findById(result.data.id).lean();
    expect(employee?.hourlyRate).toBe(100);
    expect(employee?.overtimeHourlyRate).toBe(150);

    const month = 5;
    const year = 2026;

    // Day 1: 10 hours worked (8h req + 2h OT)
    await AttendanceRecord.create({
      employeeId: employee!._id,
      date: new Date(Date.UTC(year, month - 1, 1)),
      hoursWorked: 10,
      status: "present",
    });

    setMockSession({ user: { id: "507f1f77bcf86cd799439011", role: "admin" } });
    const salaryResult = await generateSalaryForMonth({
      employeeId: employee!._id.toString(),
      month,
      year,
    });
    expect(salaryResult.success).toBe(true);

    const record = await SalaryRecord.findOne({
      employeeId: employee!._id,
      month,
      year,
    }).lean();

    expect(record?.totalHoursWorked).toBe(10);
    expect(record?.requiredHours).toBe(8);
    expect(record?.deduction).toBe(0);
    // 2 hours excess * 150/hr custom overtime rate = 300
    expect(record?.overtimeAmount).toBe(300);
    // Base salary for 1 day = 800 + 300 OT = 1100
    expect(record?.netSalary).toBe(1100);
  });

  it("allows Admin to update overtimeHourlyRate", async () => {
    await connectToDatabase();
    const employee = await Employee.create({
      name: "Technician C",
      phone: "01799990007",
      salaryType: "daily",
      salaryAmount: 800,
      hourlyRate: 100,
      overtimeHourlyRate: 100,
      requiredHoursPerDay: 8,
    });

    setMockSession({ user: { id: "507f1f77bcf86cd799439011", role: "admin" } });

    const updateRes = await updateEmployee({
      id: employee._id.toString(),
      overtimeHourlyRate: 200,
    });

    expect(updateRes.success).toBe(true);

    const updated = await Employee.findById(employee._id).lean();
    expect(updated?.overtimeHourlyRate).toBe(200);
  });

  it("calculates salary correctly for daily employee with absent days (absent adds 0, present adds pay)", async () => {
    await connectToDatabase();
    const employee = await Employee.create({
      name: "Technician D",
      phone: "01799990008",
      salaryType: "daily",
      salaryAmount: 800,
      hourlyRate: 100,
      overtimeHourlyRate: 150,
      requiredHoursPerDay: 8,
    });

    const month = 6;
    const year = 2026;

    // Day 1: Present (8h) -> 800 Tk
    await AttendanceRecord.create({
      employeeId: employee._id,
      date: new Date(Date.UTC(year, month - 1, 1)),
      hoursWorked: 8,
      status: "present",
    });

    // Day 2: Absent (0h) -> 0 Tk
    await AttendanceRecord.create({
      employeeId: employee._id,
      date: new Date(Date.UTC(year, month - 1, 2)),
      hoursWorked: 0,
      status: "absent",
    });

    // Day 3: Present with OT (10h = 8h reg + 2h OT) -> 800 + 300 = 1100 Tk
    await AttendanceRecord.create({
      employeeId: employee._id,
      date: new Date(Date.UTC(year, month - 1, 3)),
      hoursWorked: 10,
      status: "present",
    });

    setMockSession({ user: { id: "507f1f77bcf86cd799439011", role: "admin" } });
    const salaryResult = await generateSalaryForMonth({
      employeeId: employee._id.toString(),
      month,
      year,
    });
    expect(salaryResult.success).toBe(true);

    const record = await SalaryRecord.findOne({
      employeeId: employee._id,
      month,
      year,
    }).lean();

    expect(record?.totalHoursWorked).toBe(18);
    expect(record?.requiredHours).toBe(24);
    expect(record?.deduction).toBe(800); // 8h shortfall from the absent day
    expect(record?.overtimeAmount).toBe(300); // 2h * 150 OT
    expect(record?.netSalary).toBe(1900); // 800 + 0 + 1100 = 1900 Tk
  });
});
