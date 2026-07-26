import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requirePageRole } from "@/lib/auth";
import { getJobCardById } from "@/actions/jobCards";
import { listActiveEmployees } from "@/actions/employees";
import { listProducts } from "@/actions/stock";
import { getWarrantyCardByJobCard } from "@/actions/warranty";
import { JobCardDetail } from "./job-card-detail";

export default async function JobCardDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requirePageRole(["admin", "manager", "technician"]);
  const { id } = await params;

  const jobCard = await getJobCardById(id);
  if (!jobCard) {
    notFound();
  }

  const isStaffManager = session.user.role !== "technician";
  const [employees, products, warrantyCard] = await Promise.all([
    isStaffManager ? listActiveEmployees() : Promise.resolve([]),
    isStaffManager ? listProducts() : Promise.resolve([]),
    isStaffManager ? getWarrantyCardByJobCard(id) : Promise.resolve(null),
  ]);

  return (
    <div className="space-y-6">


      <JobCardDetail
        jobCard={jobCard}
        session={{
          role: session.user.role,
          employeeId: session.user.employeeId ?? null,
        }}
        employees={employees}
        products={products}
        warrantyCard={warrantyCard}
      />
    </div>
  );
}
