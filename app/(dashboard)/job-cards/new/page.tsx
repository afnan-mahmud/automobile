import { requirePageRole } from "@/lib/auth";
import { listActiveEmployees } from "@/actions/employees";
import { NewJobCardForm } from "./new-job-card-form";

export default async function NewJobCardPage() {
  await requirePageRole(["admin", "manager"]);
  const employees = await listActiveEmployees();

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">New Job Card</h2>
      <NewJobCardForm employees={employees} />
    </div>
  );
}
