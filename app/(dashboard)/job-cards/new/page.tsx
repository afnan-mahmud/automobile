import { requirePageRole } from "@/lib/auth";
import { listActiveEmployees } from "@/actions/employees";
import { listServices } from "@/actions/services";
import { NewJobCardForm } from "./new-job-card-form";

export default async function NewJobCardPage() {
  await requirePageRole(["admin", "manager"]);
  const employees = await listActiveEmployees();
  const services = await listServices();

  return (
    <div className="space-y-6">
      <NewJobCardForm employees={employees} services={services} />
    </div>
  );
}
