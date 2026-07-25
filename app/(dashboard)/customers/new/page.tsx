import { requirePageRole } from "@/lib/auth";
import { CustomerForm } from "./customer-form";

export default async function NewCustomerPage() {
  await requirePageRole(["admin", "manager"]);

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Add Customer</h2>
      <CustomerForm />
    </div>
  );
}
