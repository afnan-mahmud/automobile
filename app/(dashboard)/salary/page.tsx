import { requirePageRole } from "@/lib/auth";
import { SalaryPanel } from "./salary-panel";

export default async function SalaryPage() {
  await requirePageRole(["admin"]);

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Salary</h2>
      <SalaryPanel />
    </div>
  );
}
