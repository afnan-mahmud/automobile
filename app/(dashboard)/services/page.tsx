import { requirePageRole } from "@/lib/auth";
import { listServices } from "@/actions/services";
import { ServiceList } from "./service-list";
import { BookOpen } from "lucide-react";

export default async function ServicesPage() {
  await requirePageRole(["admin", "manager"]);
  const services = await listServices();

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <BookOpen className="size-6 text-primary" />
            Service List
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage the standard services offered, their departments, and expected costing.
          </p>
        </div>
      </div>
      <ServiceList initialServices={services} />
    </div>
  );
}
