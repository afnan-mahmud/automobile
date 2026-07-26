import { requirePageRole } from "@/lib/auth";
import { listEmployees } from "@/actions/employees";
import { EmployeeList } from "./employee-list";

export default async function EmployeesPage() {
  await requirePageRole(["admin"]);
  const employees = await listEmployees();

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Employees</h2>
      <EmployeeList initialEmployees={employees} />
    </div>
  );
}
