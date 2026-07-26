"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { JOB_CARD_STATUSES, type JobCardStatus } from "@/types/jobCard";

type JobCardRow = {
  _id: string;
  jobCardNumber: string;
  status: JobCardStatus;
  vehicle: { registrationNumber: string; make?: string; model?: string } | null;
  customer: { name: string; phone: string } | null;
  taskTotal: number;
  taskCompleted: number;
  createdAt: string;
};

const STATUS_LABEL: Record<JobCardStatus, string> = {
  open: "Open",
  in_progress: "In Progress",
  completed: "Completed",
  delivered: "Delivered",
};

export function JobCardList({ initialJobCards }: { initialJobCards: JobCardRow[] }) {
  const [tab, setTab] = useState<"all" | JobCardStatus>("all");

  const filtered = useMemo(
    () =>
      tab === "all"
        ? initialJobCards
        : initialJobCards.filter((jc) => jc.status === tab),
    [initialJobCards, tab]
  );

  return (
    <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
      <TabsList>
        <TabsTrigger value="all">All</TabsTrigger>
        {JOB_CARD_STATUSES.map((status) => (
          <TabsTrigger key={status} value={status}>
            {STATUS_LABEL[status]}
          </TabsTrigger>
        ))}
      </TabsList>
      <TabsContent value={tab}>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Job Card #</TableHead>
              <TableHead>Vehicle</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Tasks</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">
                  No job cards found.
                </TableCell>
              </TableRow>
            )}
            {filtered.map((jc) => (
              <TableRow key={jc._id}>
                <TableCell>
                  <Link
                    href={`/job-cards/${jc._id}`}
                    className="font-medium hover:underline"
                  >
                    {jc.jobCardNumber}
                  </Link>
                </TableCell>
                <TableCell>{jc.vehicle?.registrationNumber ?? "—"}</TableCell>
                <TableCell>{jc.customer?.name ?? "—"}</TableCell>
                <TableCell>
                  <Badge variant="secondary">{STATUS_LABEL[jc.status]}</Badge>
                </TableCell>
                <TableCell>
                  {jc.taskCompleted}/{jc.taskTotal}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TabsContent>
    </Tabs>
  );
}
