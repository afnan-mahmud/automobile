import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";

vi.mock("@/lib/auth");

import { setMockSession } from "@/lib/__mocks__/auth";
import { setupTestDatabase, teardownTestDatabase, clearTestDatabase } from "../helpers/db";
import { connectToDatabase } from "@/lib/db";
import { Employee } from "@/models/Employee";
import { AttendanceRecord } from "@/models/AttendanceRecord";
import { getTodayAttendanceSummary } from "@/actions/dashboard";

beforeAll(async () => {
  await setupTestDatabase();
});

afterAll(async () => {
  await teardownTestDatabase();
});

beforeEach(async () => {
  await clearTestDatabase();
});

describe("getTodayAttendanceSummary", () => {
  it("returns zero metrics when no active employees exist", async () => {
    setMockSession({ user: { id: "507f1f77bcf86cd799439011", role: "admin" } });
    await connectToDatabase();

    const summary = await getTodayAttendanceSummary("2026-08-06");

    expect(summary.totalEmployees).toBe(0);
    expect(summary.presentCount).toBe(0);
    expect(summary.halfDayCount).toBe(0);
    expect(summary.absentCount).toBe(0);
    expect(summary.leaveCount).toBe(0);
    expect(summary.unmarkedCount).toBe(0);
    expect(summary.totalPresent).toBe(0);
    expect(summary.totalAbsent).toBe(0);
    expect(summary.attendanceRate).toBe(0);
    expect(summary.records).toEqual([]);
  });

  it("accurately computes presence, absence, leave, and unmarked counts", async () => {
    setMockSession({ user: { id: "507f1f77bcf86cd799439011", role: "admin" } });
    await connectToDatabase();

    const targetDateStr = "2026-08-06";
    const recordDate = new Date(Date.UTC(2026, 7, 6, 0, 0, 0, 0));

    // Create 5 active employees and 1 inactive employee
    const emp1 = await Employee.create({
      name: "Rahim Ali",
      phone: "01700000001",
      hourlyRate: 150,
      active: true,
      designation: "Senior Mechanic",
    });
    const emp2 = await Employee.create({
      name: "Karim Uddin",
      phone: "01700000002",
      hourlyRate: 120,
      active: true,
      designation: "Electrician",
    });
    const emp3 = await Employee.create({
      name: "Jamal Hossain",
      phone: "01700000003",
      hourlyRate: 110,
      active: true,
      designation: "Painter",
    });
    const emp4 = await Employee.create({
      name: "Salim Mia",
      phone: "01700000004",
      hourlyRate: 100,
      active: true,
      designation: "Technician",
    });
    await Employee.create({
      name: "Kamal Hasan",
      phone: "01700000005",
      hourlyRate: 100,
      active: true,
      designation: "Apprentice",
    });
    const inactiveEmp = await Employee.create({
      name: "Former Staff",
      phone: "01700000009",
      hourlyRate: 100,
      active: false,
    });

    // Attendance records for today
    await AttendanceRecord.create({
      employeeId: emp1._id,
      date: recordDate,
      checkIn: new Date("2026-08-06T09:00:00Z"),
      checkOut: new Date("2026-08-06T17:00:00Z"),
      hoursWorked: 8,
      status: "present",
    });

    await AttendanceRecord.create({
      employeeId: emp2._id,
      date: recordDate,
      checkIn: new Date("2026-08-06T09:00:00Z"),
      checkOut: new Date("2026-08-06T13:00:00Z"),
      hoursWorked: 4,
      status: "half_day",
    });

    await AttendanceRecord.create({
      employeeId: emp3._id,
      date: recordDate,
      hoursWorked: 0,
      status: "absent",
    });

    await AttendanceRecord.create({
      employeeId: emp4._id,
      date: recordDate,
      hoursWorked: 0,
      status: "leave",
    });

    // emp5 is left unmarked!
    // inactiveEmp has a record that should be ignored
    await AttendanceRecord.create({
      employeeId: inactiveEmp._id,
      date: recordDate,
      status: "present",
    });

    const summary = await getTodayAttendanceSummary(targetDateStr);

    expect(summary.totalEmployees).toBe(5); // 5 active employees
    expect(summary.presentCount).toBe(1);
    expect(summary.halfDayCount).toBe(1);
    expect(summary.absentCount).toBe(1);
    expect(summary.leaveCount).toBe(1);
    expect(summary.unmarkedCount).toBe(1);
    expect(summary.totalPresent).toBe(2); // present (1) + half_day (1)
    expect(summary.totalAbsent).toBe(3); // absent (1) + leave (1) + unmarked (1)
    expect(summary.attendanceRate).toBe(40); // 2 out of 5 = 40%

    // Verify employee record mappings
    const rahimRec = summary.records.find((r) => r.name === "Rahim Ali");
    expect(rahimRec?.status).toBe("present");
    expect(rahimRec?.hoursWorked).toBe(8);

    const karimRec = summary.records.find((r) => r.name === "Karim Uddin");
    expect(karimRec?.status).toBe("half_day");
    expect(karimRec?.hoursWorked).toBe(4);

    const jamalRec = summary.records.find((r) => r.name === "Jamal Hossain");
    expect(jamalRec?.status).toBe("absent");

    const salimRec = summary.records.find((r) => r.name === "Salim Mia");
    expect(salimRec?.status).toBe("leave");

    const kamalRec = summary.records.find((r) => r.name === "Kamal Hasan");
    expect(kamalRec?.status).toBe("unmarked");
  });

  it("allows access for manager role", async () => {
    setMockSession({ user: { id: "507f1f77bcf86cd799439011", role: "manager" } });
    await connectToDatabase();

    const summary = await getTodayAttendanceSummary();
    expect(summary).toBeDefined();
    expect(summary.totalEmployees).toBe(0);
  });

  it("rejects unauthorized technician or missing session", async () => {
    setMockSession({ user: { id: "507f1f77bcf86cd799439011", role: "technician" } });
    await connectToDatabase();

    await expect(getTodayAttendanceSummary()).rejects.toThrow("Unauthorized");
  });
});
