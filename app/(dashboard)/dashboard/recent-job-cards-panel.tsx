import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { jobCardStatusVariant } from "@/lib/statusBadge";
import type { JobCardStatus } from "@/types/jobCard";

const STATUS_LABEL: Record<JobCardStatus, string> = {
  open: "Open",
  in_progress: "In Progress",
  completed: "Completed",
  delivered: "Delivered",
};

type JobCardRow = {
  _id: string;
  jobCardNumber: string;
  status: JobCardStatus;
  vehicle: { registrationNumber: string } | null;
  customer: { name: string } | null;
};

export function RecentJobCardsPanel({ jobCards }: { jobCards: JobCardRow[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Job Cards</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {jobCards.length === 0 && (
          <p className="text-sm text-muted-foreground">No job cards yet.</p>
        )}
        {jobCards.map((jc) => (
          <Link
            key={jc._id}
            href={`/job-cards/${jc._id}`}
            className="flex items-center justify-between rounded-lg border p-3 text-sm hover:bg-accent"
          >
            <div>
              <p className="font-medium">{jc.jobCardNumber}</p>
              <p className="text-muted-foreground">
                {jc.vehicle?.registrationNumber ?? "—"} · {jc.customer?.name ?? "—"}
              </p>
            </div>
            <Badge variant={jobCardStatusVariant(jc.status)}>{STATUS_LABEL[jc.status]}</Badge>
          </Link>
        ))}
      </CardContent>
    </Card>
  );
}
