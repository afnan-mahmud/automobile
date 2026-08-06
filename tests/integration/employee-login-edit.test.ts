import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";
import bcrypt from "bcryptjs";

vi.mock("@/lib/auth");
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { setMockSession } from "@/lib/__mocks__/auth";
import { setupTestDatabase, teardownTestDatabase, clearTestDatabase } from "../helpers/db";
import { connectToDatabase } from "@/lib/db";
import { Employee } from "@/models/Employee";
import { User } from "@/models/User";
import { createEmployee, updateEmployee, getEmployeeById } from "@/actions/employees";

beforeAll(async () => {
  await setupTestDatabase();
});

afterAll(async () => {
  await teardownTestDatabase();
});

beforeEach(async () => {
  await clearTestDatabase();
});

describe("Employee Dashboard Login Creation & Management via Edit", () => {
  it("allows creating a dashboard login when editing an employee profile that was created without login", async () => {
    setMockSession({ user: { id: "507f1f77bcf86cd799439011", role: "admin" } });
    await connectToDatabase();

    // 1. Create employee without dashboard login
    const createRes = await createEmployee({
      name: "Tariqul Islam",
      phone: "01711223344",
      hourlyRate: 250,
      requiredHoursPerDay: 8,
      createLogin: false,
    });

    expect(createRes.success).toBe(true);
    if (!createRes.success) return;
    const empId = createRes.data.id;

    // Verify employee has no user linked
    const empBefore = await Employee.findById(empId);
    expect(empBefore?.userId).toBeNull();
    const userCountBefore = await User.countDocuments({ employeeId: empId });
    expect(userCountBefore).toBe(0);

    // 2. Edit employee profile to add dashboard login
    const editRes = await updateEmployee({
      id: empId,
      name: "Tariqul Islam",
      phone: "01711223344",
      createLogin: true,
      loginRole: "technician",
      loginIdentifier: "tariqul@example.com",
      loginPassword: "secretPassword123",
    });

    expect(editRes.success).toBe(true);
    if (!editRes.success) return;
    expect(editRes.data.loginCreated).toBe(true);
    expect(editRes.data.loginError).toBeUndefined();

    // 3. Verify user record created and linked
    const user = await User.findOne({ email: "tariqul@example.com" });
    expect(user).not.toBeNull();
    expect(user?.role).toBe("technician");
    expect(user?.employeeId?.toString()).toBe(empId);
    expect(await bcrypt.compare("secretPassword123", user!.passwordHash)).toBe(true);

    const empAfter = await Employee.findById(empId);
    expect(empAfter?.userId?.toString()).toBe(user!._id.toString());

    // 4. Verify getEmployeeById returns populated user info
    const populated = await getEmployeeById(empId);
    expect(populated).not.toBeNull();
    expect(populated?.userId).toBeDefined();
    expect((populated?.userId as any)?.role).toBe("technician");
    expect((populated?.userId as any)?.email).toBe("tariqul@example.com");

    // 5. Verify updating role or password for existing employee login
    const updateRoleRes = await updateEmployee({
      id: empId,
      name: "Tariqul Islam (Lead)",
      loginRole: "manager",
      loginPassword: "newManagerPassword123",
    });

    expect(updateRoleRes.success).toBe(true);
    const updatedUser = await User.findById(user!._id);
    expect(updatedUser?.role).toBe("manager");
    expect(updatedUser?.name).toBe("Tariqul Islam (Lead)");
    expect(await bcrypt.compare("newManagerPassword123", updatedUser!.passwordHash)).toBe(true);
  });
});
