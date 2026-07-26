"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { jobCardStatusVariant, taskStatusVariant } from "@/lib/statusBadge";
import type { JobCardStatus, TaskStatus } from "@/types/jobCard";

type Task = {
  description: string;
  status: TaskStatus;
  assignedDate: string;
  completedDate: string | null;
};

type WarrantyCardSummary = {
  id: string;
  cardNumber: string;
  startDate: string;
  endDate: string;
};

type TrackingSummary = {
  jobCardNumber: string;
  status: JobCardStatus;
  vehicle: { registrationNumber: string; make?: string; model?: string } | null;
  tasks: Task[];
  percentComplete: number;
  lastUpdated: string;
  warrantyCard: WarrantyCardSummary | null;
};

const STATUS_LABEL: Record<JobCardStatus, string> = {
  open: "Open",
  in_progress: "In Progress",
  completed: "Completed",
  delivered: "Delivered",
};

const TASK_STATUS_LABEL: Record<TaskStatus, string> = {
  pending: "Pending",
  in_progress: "In Progress",
  completed: "Completed",
  carried_forward: "Carried Forward",
};

export function TrackingView({
  token,
  initialData,
}: {
  token: string;
  initialData: TrackingSummary;
}) {
  const [data, setData] = useState(initialData);

  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/track/${token}`, { cache: "no-store" });
        if (res.ok) {
          setData(await res.json());
        }
      } catch {
        // ignore transient network errors, next poll will retry
      }
    }, 10000);
    return () => clearInterval(interval);
  }, [token]);

  return (
    <div className="mx-auto max-w-lg space-y-6 p-6">
      <div className="text-center">
        <h1 className="text-lg font-semibold">Dhaka Automobiles</h1>
        <p className="text-sm text-muted-foreground">Live Job Tracking</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Job Card {data.jobCardNumber}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {data.vehicle && (
            <p className="text-sm text-muted-foreground">
              Vehicle: {data.vehicle.registrationNumber}
              {data.vehicle.make ? ` — ${data.vehicle.make} ${data.vehicle.model ?? ""}` : ""}
            </p>
          )}
          <Badge variant={jobCardStatusVariant(data.status)}>{STATUS_LABEL[data.status]}</Badge>

          <div className="space-y-1">
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full bg-primary transition-all"
                style={{ width: `${data.percentComplete}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground">{data.percentComplete}% complete</p>
          </div>

          <ul className="space-y-2">
            {data.tasks.map((task, index) => (
              <li key={index} className="flex items-center justify-between text-sm">
                <span>{task.description}</span>
                <Badge variant={taskStatusVariant(task.status)}>{TASK_STATUS_LABEL[task.status]}</Badge>
              </li>
            ))}
          </ul>

          <p className="text-xs text-muted-foreground">
            Last updated: {new Date(data.lastUpdated).toLocaleString()}
          </p>
        </CardContent>
      </Card>

      {data.warrantyCard && (
        <Card>
          <CardHeader>
            <CardTitle>Warranty Card {data.warrantyCard.cardNumber}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p className="text-muted-foreground">
              Valid: {new Date(data.warrantyCard.startDate).toLocaleDateString()} —{" "}
              {new Date(data.warrantyCard.endDate).toLocaleDateString()}
            </p>
            <a
              href={`/api/warranty/${data.warrantyCard.id}/pdf?token=${token}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-8 items-center rounded-md border px-3 text-sm font-medium hover:bg-accent"
            >
              View Warranty Card
            </a>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
