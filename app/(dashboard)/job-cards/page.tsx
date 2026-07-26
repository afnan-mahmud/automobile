import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { requirePageRole } from "@/lib/auth";
import { listJobCards } from "@/actions/jobCards";
import { JobCardList } from "./job-card-list";

export default async function JobCardsPage() {
  const session = await requirePageRole(["admin", "manager", "technician"]);
  const jobCards = await listJobCards("all");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Job Cards</h2>
        {session.user.role !== "technician" && (
          <Link href="/job-cards/new" className={buttonVariants()}>
            New Job Card
          </Link>
        )}
      </div>
      <JobCardList initialJobCards={jobCards} />
    </div>
  );
}
