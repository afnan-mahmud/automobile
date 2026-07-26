"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getJobCardById } from "@/actions/jobCards";
import {
  X,
  Car,
  User,
  Calendar,
  CheckCircle2,
  Clock,
  Wrench,
  ClipboardList,
  ChevronRight,
  Package,
  ExternalLink,
  ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { JobCardStatus, TaskStatus } from "@/types/jobCard";

/* ── types (mirror what getJobCardById returns) ─────────────────────────── */
type Task = {
  _id: string;
  description: string;
  status: TaskStatus;
  assignedTo: { _id: string; name: string } | null;
  assignedDate: string;
  completedDate: string | null;
};

type PartUsed = {
  _id: string;
  productId: { _id: string; name: string; sku: string } | string;
  quantity: number;
};

type Photo = { _id: string; url: string; type: "before" | "after"; caption?: string };

type JobCardFull = {
  _id: string;
  jobCardNumber: string;
  status: JobCardStatus;
  vehicleId: { registrationNumber: string; make?: string; model?: string; color?: string; year?: number } | null;
  customerId: { name: string; phone: string } | null;
  tasks: Task[];
  photos: Photo[];
  partsUsed: PartUsed[];
  createdAt: string;
};

/* ── status display helpers ─────────────────────────────────────────────── */
const STATUS_STYLE: Record<JobCardStatus, { label: string; class: string; icon: React.ReactNode }> = {
  open: {
    label: "Open",
    class: "bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400",
    icon: <ClipboardList className="size-3.5" />,
  },
  in_progress: {
    label: "In Progress",
    class: "bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400",
    icon: <Wrench className="size-3.5" />,
  },
  completed: {
    label: "Completed",
    class: "bg-violet-50 text-violet-600 border-violet-200 dark:bg-violet-950/40 dark:text-violet-400",
    icon: <CheckCircle2 className="size-3.5" />,
  },
  delivered: {
    label: "Delivered",
    class: "bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400",
    icon: <CheckCircle2 className="size-3.5" />,
  },
};

const TASK_STYLE: Record<TaskStatus, { label: string; class: string }> = {
  pending: { label: "Pending", class: "bg-muted text-muted-foreground" },
  in_progress: { label: "In Progress", class: "bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400" },
  completed: { label: "Done", class: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400" },
  carried_forward: { label: "Carried Over", class: "bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400" },
};

/* ── main component ─────────────────────────────────────────────────────── */
export function OrderDetailPanel({
  jobCardId,
  onClose,
}: {
  jobCardId: string | null;
  onClose: () => void;
}) {
  const [data, setData] = useState<JobCardFull | null>(null);
  const [loading, setLoading] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  /* fetch whenever id changes */
  useEffect(() => {
    if (!jobCardId) {
      // Do not clear data here so the panel can animate out with the previous data
      return;
    }
    setLoading(true);
    setData(null);
    getJobCardById(jobCardId).then((result) => {
      setData(result as JobCardFull | null);
      setLoading(false);
    });
  }, [jobCardId]);

  /* close on Escape */
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const open = Boolean(jobCardId);

  const s = data ? STATUS_STYLE[data.status] : null;
  const taskDone = data ? data.tasks.filter((t) => t.status === "completed").length : 0;
  const taskTotal = data ? data.tasks.length : 0;
  const progress = taskTotal > 0 ? Math.round((taskDone / taskTotal) * 100) : 0;

  return (
    <div
      className={cn(
        "fixed inset-0 z-50",
        open ? "pointer-events-auto" : "pointer-events-none"
      )}
    >
      {/* Backdrop */}
      <div
        className={cn(
          "absolute inset-0 bg-black/20 backdrop-blur-[2px] transition-opacity duration-300",
          open ? "opacity-100" : "opacity-0"
        )}
        onClick={open ? onClose : undefined}
      />

      {/* Slide-in panel */}
      <div
        ref={panelRef}
        className={cn(
          "fixed right-0 top-0 z-50 flex h-full w-full max-w-[480px] flex-col bg-background shadow-2xl",
          "transition-transform duration-300 ease-out",
          open ? "translate-x-0" : "translate-x-full"
        )}
      >
        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between border-b bg-background/80 px-6 py-4 backdrop-blur">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-xl bg-primary/10">
              <ClipboardList className="size-4 text-primary" />
            </div>
            <div>
              <p className="text-sm font-bold">
                {loading ? "Loading…" : data?.jobCardNumber ?? "Order Details"}
              </p>
              <p className="text-xs text-muted-foreground">Order details</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {data && (
              <Link
                href={`/job-cards/${data._id}`}
                className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary/10"
              >
                Full view
                <ExternalLink className="size-3" />
              </Link>
            )}
            <Button variant="ghost" size="icon-sm" onClick={onClose}>
              <X className="size-4" />
            </Button>
          </div>
        </div>

        {/* ── Scrollable body ─────────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto">
          {loading && (
            <div className="flex flex-col gap-4 p-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-20 animate-pulse rounded-2xl bg-muted" />
              ))}
            </div>
          )}

          {!loading && !data && (
            <div className="flex h-full items-center justify-center p-8 text-center">
              <p className="text-sm text-muted-foreground">Could not load order details.</p>
            </div>
          )}

          {!loading && data && (
            <div className="space-y-4 p-6">
              {/* Status badge + date */}
              <div className="flex items-center justify-between">
                <span
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold",
                    s?.class
                  )}
                >
                  {s?.icon}
                  {s?.label}
                </span>
                <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Calendar className="size-3.5" />
                  {new Date(data.createdAt).toLocaleDateString("en-GB", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  })}
                </span>
              </div>

              {/* Customer card */}
              <div className="rounded-2xl border bg-card p-4">
                <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Customer
                </p>
                <div className="flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10">
                    <User className="size-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold">{data.customerId?.name ?? "—"}</p>
                    <p className="text-sm text-muted-foreground">{data.customerId?.phone ?? "—"}</p>
                  </div>
                </div>
              </div>

              {/* Vehicle card */}
              <div className="rounded-2xl border bg-card p-4">
                <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Vehicle
                </p>
                <div className="flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10">
                    <Car className="size-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold">
                      {data.vehicleId?.registrationNumber ?? "—"}
                    </p>
                    {data.vehicleId?.make && (
                      <p className="text-sm text-muted-foreground">
                        {data.vehicleId.make} {data.vehicleId.model ?? ""}{" "}
                        {data.vehicleId.year ? `(${data.vehicleId.year})` : ""}
                        {data.vehicleId.color ? ` · ${data.vehicleId.color}` : ""}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Task progress */}
              <div className="rounded-2xl border bg-card p-4">
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Tasks
                  </p>
                  <span className="text-xs font-medium text-foreground">
                    {taskDone}/{taskTotal} done
                  </span>
                </div>

                {/* Progress bar */}
                <div className="mb-4 h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-primary to-purple-400 transition-all duration-500"
                    style={{ width: `${progress}%` }}
                  />
                </div>

                {/* Task list */}
                {data.tasks.length === 0 ? (
                  <p className="text-center text-sm text-muted-foreground">No tasks yet</p>
                ) : (
                  <div className="space-y-2">
                    {data.tasks.map((task) => {
                      const ts = TASK_STYLE[task.status];
                      return (
                        <div
                          key={task._id}
                          className="flex items-start gap-3 rounded-xl border bg-muted/30 px-3 py-2.5"
                        >
                          {/* Status dot */}
                          <div className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-background border">
                            {task.status === "completed" ? (
                              <CheckCircle2 className="size-3.5 text-emerald-500" />
                            ) : task.status === "in_progress" ? (
                              <Clock className="size-3.5 text-amber-500" />
                            ) : (
                              <div className="size-2 rounded-full bg-muted-foreground/30" />
                            )}
                          </div>

                          <div className="min-w-0 flex-1">
                            <p
                              className={cn(
                                "text-sm font-medium leading-snug",
                                task.status === "completed" && "line-through text-muted-foreground"
                              )}
                            >
                              {task.description}
                            </p>
                            <div className="mt-0.5 flex items-center gap-2">
                              {task.assignedTo && (
                                <span className="text-xs text-muted-foreground">
                                  {task.assignedTo.name}
                                </span>
                              )}
                              <span
                                className={cn(
                                  "rounded-md px-1.5 py-0.5 text-[10px] font-medium",
                                  ts.class
                                )}
                              >
                                {ts.label}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Parts used */}
              {data.partsUsed.length > 0 && (
                <div className="rounded-2xl border bg-card p-4">
                  <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Parts Used
                  </p>
                  <div className="space-y-2">
                    {data.partsUsed.map((part) => (
                      <div
                        key={part._id}
                        className="flex items-center justify-between rounded-xl border bg-muted/30 px-3 py-2"
                      >
                        <div className="flex items-center gap-2">
                          <Package className="size-3.5 text-muted-foreground" />
                          <span className="text-sm">
                            {typeof part.productId === "string"
                              ? part.productId
                              : `${part.productId.name}`}
                          </span>
                        </div>
                        <span className="text-sm font-medium">×{part.quantity}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Photos */}
              {data.photos.length > 0 && (
                <div className="rounded-2xl border bg-card p-4">
                  <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Photos
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    {data.photos.slice(0, 6).map((photo) => (
                      <a key={photo._id} href={photo.url} target="_blank" rel="noreferrer">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={photo.url}
                          alt={photo.caption ?? photo.type}
                          className="aspect-square w-full rounded-xl object-cover transition-opacity hover:opacity-80"
                        />
                      </a>
                    ))}
                  </div>
                  {data.photos.length > 6 && (
                    <p className="mt-2 text-xs text-muted-foreground">
                      +{data.photos.length - 6} more in full view
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Footer CTA ─────────────────────────────────────────────────── */}
        {data && (
          <div className="border-t bg-background/80 p-4 backdrop-blur">
            <Link
              href={`/job-cards/${data._id}`}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Open Full Order Page
              <ArrowRight className="size-4" />
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
