import { requirePageRole } from "@/lib/auth";
import { listJobCards } from "@/actions/jobCards";
import { JobCardList } from "./job-card-list";

export default async function JobCardsPage() {
  const session = await requirePageRole(["admin", "manager", "technician"]);
  const jobCards = await listJobCards("all");
  const showNewButton = session.user.role !== "technician";

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">New Orders</h2>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Track and manage all service orders
        </p>
      </div>
      <JobCardList initialJobCards={jobCards} showNewButton={showNewButton} />
    </div>
  );
}
