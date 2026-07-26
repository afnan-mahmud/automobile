import { requirePageRole } from "@/lib/auth";
import { listActiveEmployees } from "@/actions/employees";
import { AttendanceGrid } from "./attendance-grid";

export default async function AttendancePage() {
  await requirePageRole(["admin", "manager"]);
  const employees = await listActiveEmployees();

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Attendance</h2>
      <AttendanceGrid employees={employees} />
    </div>
  );
}
